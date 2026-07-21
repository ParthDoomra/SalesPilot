import logging
import time
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.database import db
from app.utils.auth import get_current_user, check_role

logger = logging.getLogger("salespilot.projects")
router = APIRouter(prefix="/projects", tags=["projects"])

# Pydantic Schemas
class ProjectCreate(BaseModel):
    name: str
    clientName: str
    company: str
    industry: str = "IT"
    country: str = "US"
    budget: float = 0.0
    timeline: str = "3 months"
    preferredCloud: str = "Azure"
    description: str = ""

class ProjectUpdate(BaseModel):
    name: str = None
    clientName: str = None
    company: str = None
    industry: str = None
    country: str = None
    budget: float = None
    timeline: str = None
    preferredCloud: str = None
    description: str = None
    status: str = None

def log_activity(org_id: str, user_email: str, action: str, details: str):
    """
    Log actions to firestore activityLogs collection
    """
    try:
        activity_ref = db.collection("activityLogs").document()
        activity_ref.set({
            "id": activity_ref.id,
            "orgId": org_id,
            "user": user_email,
            "action": action,
            "details": details,
            "timestamp": time.time()
        })
    except Exception as e:
        logger.error(f"Failed to write activity log: {e}")

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate, user: dict = Depends(get_current_user)):
    org_id = user.get("orgId", "mock-org-123")
    user_email = user.get("email", "unknown@salespilot.ai")
    
    try:
        project_ref = db.collection("projects").document()
        project_id = project_ref.id
        
        project_data = {
            "id": project_id,
            "orgId": org_id,
            "name": payload.name,
            "clientName": payload.clientName,
            "company": payload.company,
            "industry": payload.industry,
            "country": payload.country,
            "budget": payload.budget,
            "timeline": payload.timeline,
            "preferredCloud": payload.preferredCloud,
            "description": payload.description,
            "status": "Draft",
            "createdAt": time.time(),
            "updatedAt": time.time(),
            "owner": user_email
        }
        
        project_ref.set(project_data)
        
        # Initialize requirements and conversation history documents
        requirements_data = {
            "industry": payload.industry,
            "preferredCloud": payload.preferredCloud,
            "budget": payload.budget,
            "timeline": payload.timeline,
            "businessGoal": payload.description,
            "confirmed": False
        }
        db.collection("requirements").document(project_id).set(requirements_data)

        # Get initial checklist state and select the first missing field to question
        from app.agents.requirement_agent import requirement_agent, FIELD_QUESTIONS
        checklist_state = requirement_agent.get_checklist_state(requirements_data)
        missing_field = None
        for item in checklist_state:
            if not item["filled"]:
                missing_field = item["field"]
                break
        
        next_question = FIELD_QUESTIONS.get(missing_field, "What platforms do you want to target (Web, Android, iOS)?")
        
        welcome_text = (
            f"Hello! I am your Senior Business Analyst and Presales Architect. I've loaded your project details for "
            f"**{payload.name}** at **{payload.company}**.\n\n"
            f"Based on the project initialization details, we have set the industry to **{payload.industry}**, "
            f"preferred cloud to **{payload.preferredCloud}**, budget to **${payload.budget:,.2f}/mo**, and timeline to **{payload.timeline}**.\n\n"
            f"{next_question}"
        )
        
        db.collection("conversations").document(project_id).set({
            "projectId": project_id,
            "history": [
                {"role": "assistant", "content": welcome_text}
            ],
            "updatedAt": time.time()
        })
        
        log_activity(org_id, user_email, "CREATE_PROJECT", f"Created project {payload.name} for {payload.company}")
        
        return project_data
    except Exception as e:
        logger.error(f"Failed to create project: {e}")
        raise HTTPException(status_code=500, detail="Database write error.")

@router.get("/")
async def list_projects(user: dict = Depends(get_current_user)):
    org_id = user.get("orgId", "mock-org-123")
    try:
        docs = db.collection("projects").where("orgId", "==", org_id).stream()
        projects = [doc.to_dict() for doc in docs]
        # Sort by creation time descending
        projects.sort(key=lambda x: x.get("createdAt", 0), reverse=True)
        return projects
    except Exception as e:
        logger.error(f"Failed to list projects: {e}")
        raise HTTPException(status_code=500, detail="Database read error.")

@router.get("/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    org_id = user.get("orgId", "mock-org-123")
    doc_ref = db.collection("projects").document(project_id)
    snapshot = doc_ref.get()
    
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    project = snapshot.to_dict()
    if project.get("orgId") != org_id:
        raise HTTPException(status_code=403, detail="Access denied to this project.")
        
    # Get associated sub-documents if they exist
    req_snap = db.collection("requirements").document(project_id).get()
    arch_snap = db.collection("architectures").document(project_id).get()
    pricing_snap = db.collection("pricingReports").document(project_id).get()
    neg_snap = db.collection("negotiations").document(project_id).get()
    fail_snap = db.collection("failureSimulations").document(project_id).get()
    prop_snap = db.collection("proposals").document(project_id).get()
    pres_snap = db.collection("presentations").document(project_id).get()
    conv_snap = db.collection("conversations").document(project_id).get()

    reqs = req_snap.to_dict() if req_snap.exists else None
    scores = None
    checklist_state = None
    if reqs:
        from app.agents.requirement_agent import requirement_agent
        scores = requirement_agent.calculate_completeness_scores(reqs)
        checklist_state = requirement_agent.get_checklist_state(reqs)

    return {
        **project,
        "requirements": reqs,
        "completenessScore": scores,
        "checklistState": checklist_state,
        "architecture": arch_snap.to_dict() if arch_snap.exists else None,
        "pricing": pricing_snap.to_dict() if pricing_snap.exists else None,
        "negotiation": neg_snap.to_dict() if neg_snap.exists else None,
        "resilience": fail_snap.to_dict() if fail_snap.exists else None,
        "proposal": prop_snap.to_dict() if prop_snap.exists else None,
        "presentation": pres_snap.to_dict() if pres_snap.exists else None,
        "conversation": conv_snap.to_dict().get("history") if conv_snap.exists else None,
    }

@router.patch("/{project_id}")
async def update_project(project_id: str, payload: ProjectUpdate, user: dict = Depends(check_role(["Admin", "Sales Engineer", "Solution Architect"]))):
    org_id = user.get("orgId", "mock-org-123")
    user_email = user.get("email", "unknown@salespilot.ai")
    
    doc_ref = db.collection("projects").document(project_id)
    snapshot = doc_ref.get()
    
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    project = snapshot.to_dict()
    if project.get("orgId") != org_id:
        raise HTTPException(status_code=403, detail="Access denied to this project.")
        
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    update_data["updatedAt"] = time.time()
    
    try:
        doc_ref.update(update_data)
        log_activity(org_id, user_email, "UPDATE_PROJECT", f"Updated details for project {project_id}")
        return {**project, **update_data}
    except Exception as e:
        logger.error(f"Failed to update project: {e}")
        raise HTTPException(status_code=500, detail="Database write error.")

@router.delete("/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(check_role(["Admin"]))):
    org_id = user.get("orgId", "mock-org-123")
    user_email = user.get("email", "unknown@salespilot.ai")
    
    doc_ref = db.collection("projects").document(project_id)
    snapshot = doc_ref.get()
    
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    project = snapshot.to_dict()
    if project.get("orgId") != org_id:
        raise HTTPException(status_code=403, detail="Access denied to this project.")
        
    try:
        # Delete project and sub-details
        doc_ref.delete()
        db.collection("requirements").document(project_id).delete()
        db.collection("conversations").document(project_id).delete()
        db.collection("architectures").document(project_id).delete()
        db.collection("pricingReports").document(project_id).delete()
        db.collection("negotiations").document(project_id).delete()
        db.collection("failureSimulations").document(project_id).delete()
        db.collection("proposals").document(project_id).delete()
        db.collection("presentations").document(project_id).delete()
        
        log_activity(org_id, user_email, "DELETE_PROJECT", f"Deleted project {project.get('name')}")
        return {"status": "success", "message": "Project and subdocuments deleted successfully."}
    except Exception as e:
        logger.error(f"Failed to delete project: {e}")
        raise HTTPException(status_code=500, detail="Database deletion error.")

@router.get("/dashboard/analytics")
async def get_dashboard_analytics(user: dict = Depends(get_current_user)):
    org_id = user.get("orgId", "mock-org-123")
    try:
        docs = db.collection("projects").where("orgId", "==", org_id).stream()
        projects = [doc.to_dict() for doc in docs]
        
        # Calculate stats
        total_projects = len(projects)
        active_projects = len([p for p in projects if p.get("status") in ["Draft", "Negotiating"]])
        completed_projects = len([p for p in projects if p.get("status") == "Finalized"])
        
        # Get team members count
        user_docs = db.collection("users").where("orgId", "==", org_id).stream()
        team_members = len([u.to_dict() for u in user_docs])
        
        # Retrieve org details for billing credits
        org_snap = db.collection("organizations").document(org_id).get()
        org_data = org_snap.to_dict() if org_snap.exists else {}
        ai_credits = org_data.get("activeCredits", 500)
        
        # Retrieve billing pricing totals for analytics charts
        monthly_distribution = {"compute": 0.0, "database": 0.0, "storage": 0.0, "networking": 0.0, "cache": 0.0, "backup": 0.0, "ai": 0.0}
        total_savings = 0.0
        
        for p in projects:
            p_id = p.get("id")
            pricing_snap = db.collection("pricingReports").document(p_id).get()
            if pricing_snap.exists:
                bd = pricing_snap.to_dict().get("breakdown", {})
                for k, v in bd.items():
                    if k in monthly_distribution:
                        monthly_distribution[k] += v
                        
            neg_snap = db.collection("negotiations").document(p_id).get()
            if neg_snap.exists:
                total_savings += neg_snap.to_dict().get("savings", 0.0)
                
        # Clean rounding
        for k in monthly_distribution:
            monthly_distribution[k] = round(monthly_distribution[k], 2)
            
        # Get recent activity logs
        act_docs = db.collection("activityLogs").where("orgId", "==", org_id).stream()
        recent_activities = [a.to_dict() for a in act_docs]
        recent_activities.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
        recent_activities = recent_activities[:10]

        return {
            "kpis": {
                "totalProjects": total_projects,
                "activeProjects": active_projects,
                "completedProjects": completed_projects,
                "teamMembers": team_members,
                "aiCredits": ai_credits,
                "totalSavings": round(total_savings, 2)
            },
            "recentProjects": projects[:5],
            "costDistribution": monthly_distribution,
            "activities": recent_activities,
            "proposalSuccessRate": 85 if total_projects == 0 else round((completed_projects / total_projects) * 100, 1),
            "averageProposalTime": "4.2 hours"
        }
    except Exception as e:
        logger.error(f"Failed to fetch analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard metrics.")
