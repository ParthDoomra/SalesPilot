import logging
import json
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel

from app.database import db
from app.utils.auth import get_current_user, check_role
from app.services.pricing_service import pricing_service
from app.services.document_service import document_service
from app.agents.requirement_agent import requirement_agent
from app.agents.architect_agent import architect_agent
from app.agents.negotiation_agent import negotiation_agent
from app.agents.resilience_agent import resilience_agent

logger = logging.getLogger("salespilot.agents_router")
router = APIRouter(prefix="/agents", tags=["agents"])

# Pydantic schema helper
class VoiceTurnPayload(BaseModel):
    transcript: str
    chatHistory: List[Dict[str, str]]

class FormRequirementPayload(BaseModel):
    industry: str
    preferredCloud: str
    usersCount: int
    storageGb: int
    compliance: List[str]
    modules: List[str]
    databaseType: str
    availability: str
    security: str
    traffic: str

@router.post("/rfp-upload")
async def upload_rfp(
    file: UploadFile = File(...),
    user: dict = Depends(check_role(["Admin", "Sales Engineer", "Solution Architect"]))
):
    try:
        content = await file.read()
        extracted_text = document_service.extract_text_from_file(content, file.filename)
        
        # Analyze using Claude requirement agent
        requirements = await requirement_agent.analyze_rfp_text(extracted_text)
        return {
            "fileName": file.filename,
            "requirements": requirements
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"RFP upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to process and analyze RFP document.")

@router.post("/voice-step")
async def voice_step(
    payload: VoiceTurnPayload,
    user: dict = Depends(check_role(["Admin", "Sales Engineer", "Solution Architect"]))
):
    try:
        result = await requirement_agent.conduct_voice_step(payload.transcript, payload.chatHistory)
        return result
    except Exception as e:
        logger.error(f"Voice agent step failed: {e}")
        raise HTTPException(status_code=500, detail="Voice collection agent failed.")

@router.post("/save-requirements/{project_id}")
async def save_requirements(
    project_id: str,
    requirements: FormRequirementPayload,
    user: dict = Depends(check_role(["Admin", "Sales Engineer", "Solution Architect"]))
):
    try:
        # Save structured requirements to Firestore
        db.collection("requirements").document(project_id).set(requirements.model_dump())
        return {"status": "success", "message": "Requirements saved successfully."}
    except Exception as e:
        logger.error(f"Save requirements failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to save requirements.")

@router.post("/architect/{project_id}")
async def run_architect_agent(
    project_id: str,
    user: dict = Depends(check_role(["Admin", "Sales Engineer", "Solution Architect"]))
):
    org_id = user.get("orgId", "mock-org-123")
    
    # Load requirements
    reqs_snap = db.collection("requirements").document(project_id).get()
    if not reqs_snap.exists:
        raise HTTPException(status_code=400, detail="Project requirements must be defined before architecting.")

    reqs = reqs_snap.to_dict()
    
    try:
        # Run agent
        architecture = await architect_agent.generate_architecture(reqs)
        
        # Save architecture
        db.collection("architectures").document(project_id).set(architecture)
        
        # Log activity
        activity_ref = db.collection("activityLogs").document()
        activity_ref.set({
            "id": activity_ref.id,
            "orgId": org_id,
            "user": user.get("email"),
            "action": "RUN_ARCHITECT",
            "details": f"Generated cloud architecture for project {project_id}",
            "timestamp": db.collection("projects").document(project_id).get().to_dict().get("createdAt", 0) # align timelines
        })
        
        return architecture
    except Exception as e:
        logger.error(f"Architect agent failed: {e}")
        raise HTTPException(status_code=500, detail="Solution Architect Agent failed.")

@router.post("/calculate-pricing/{project_id}")
async def calculate_pricing(
    project_id: str,
    user: dict = Depends(check_role(["Admin", "Sales Engineer", "Solution Architect"]))
):
    # Load architecture pricing spec
    arch_snap = db.collection("architectures").document(project_id).get()
    if not arch_snap.exists:
        raise HTTPException(status_code=400, detail="Solution Architecture must be generated before calculating cost.")

    arch = arch_snap.to_dict()
    spec = arch.get("pricingSpec", {})
    
    # Load preferred region or cloud from project
    proj_snap = db.collection("projects").document(project_id).get()
    region = "eastus"
    if proj_snap.exists:
        # Standardize region representation
        pref_cloud = proj_snap.to_dict().get("preferredCloud", "Azure")
        
    try:
        pricing_report = await pricing_service.calculate_infrastructure_cost(spec, region)
        
        # Save pricing report
        db.collection("pricingReports").document(project_id).set({
            "projectId": project_id,
            **pricing_report
        })
        
        return pricing_report
    except Exception as e:
        logger.error(f"Pricing calculation failed: {e}")
        raise HTTPException(status_code=500, detail="Pricing engine computation error.")

@router.post("/negotiate/{project_id}")
async def run_negotiation_agent(
    project_id: str,
    user: dict = Depends(check_role(["Admin", "Sales Engineer", "Solution Architect"]))
):
    # Load project details for budget
    proj_snap = db.collection("projects").document(project_id).get()
    if not proj_snap.exists:
        raise HTTPException(status_code=404, detail="Project not found.")
    
    project = proj_snap.to_dict()
    budget = project.get("budget", 0.0)
    
    # Load pricing report
    price_snap = db.collection("pricingReports").document(project_id).get()
    if not price_snap.exists:
        raise HTTPException(status_code=400, detail="Pricing report must be calculated first.")
        
    price_data = price_snap.to_dict()
    monthly_total = price_data.get("monthlyTotal", 0.0)
    breakdown = price_data.get("breakdown", {})
    
    # Load architecture details
    arch_snap = db.collection("architectures").document(project_id).get()
    tech_stack = arch_snap.to_dict().get("techStack", {}) if arch_snap.exists else {}

    try:
        # Run negotiation agent
        optimization = await negotiation_agent.optimize_architecture(
            monthly_total, budget, tech_stack, breakdown
        )
        
        # Save optimization report
        db.collection("negotiations").document(project_id).set({
            "projectId": project_id,
            **optimization
        })
        
        return optimization
    except Exception as e:
        logger.error(f"Negotiation optimization failed: {e}")
        raise HTTPException(status_code=500, detail="Cost negotiation agent failed.")

@router.post("/simulate-failures/{project_id}")
async def run_resilience_agent(
    project_id: str,
    user: dict = Depends(check_role(["Admin", "Sales Engineer", "Solution Architect"]))
):
    # Load architecture details
    arch_snap = db.collection("architectures").document(project_id).get()
    if not arch_snap.exists:
        raise HTTPException(status_code=400, detail="Architecture must be designed before failure simulation.")
        
    arch = arch_snap.to_dict()
    tech_stack = arch.get("techStack", {})
    
    # Load requirements for database type
    req_snap = db.collection("requirements").document(project_id).get()
    db_type = req_snap.to_dict().get("databaseType", "Relational") if req_snap.exists else "Relational"

    try:
        resilience_report = await resilience_agent.simulate_failures(tech_stack, db_type)
        
        # Save failure simulation report
        db.collection("failureSimulations").document(project_id).set({
            "projectId": project_id,
            **resilience_report
        })
        
        return resilience_report
    except Exception as e:
        logger.error(f"Resilience agent failed: {e}")
        raise HTTPException(status_code=500, detail="Resilience & Recovery Agent failed.")

@router.post("/generate-documents/{project_id}")
async def generate_documents(
    project_id: str,
    user: dict = Depends(check_role(["Admin", "Sales Engineer", "Solution Architect"]))
):
    # Load all project artifacts to feed into generators
    proj_snap = db.collection("projects").document(project_id).get()
    if not proj_snap.exists:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    project = proj_snap.to_dict()
    
    req_snap = db.collection("requirements").document(project_id).get()
    arch_snap = db.collection("architectures").document(project_id).get()
    price_snap = db.collection("pricingReports").document(project_id).get()
    neg_snap = db.collection("negotiations").document(project_id).get()
    fail_snap = db.collection("failureSimulations").document(project_id).get()
    
    # Core proposal content construction
    proposal_content = {
        "executiveSummary": f"This cloud solution proposal is designed for {project.get('company')} to address their workload demands in a resilient, cost-optimized, and secure environment.",
        "requirements": req_snap.to_dict() if req_snap.exists else {},
        "architecture": arch_snap.to_dict() if arch_snap.exists else {},
        "pricing": price_snap.to_dict() if price_snap.exists else {},
        "negotiation": neg_snap.to_dict() if neg_snap.exists else {},
        "resilience": fail_snap.to_dict() if fail_snap.exists else {}
    }
    
    try:
        # Generate files
        docx_url = document_service.generate_docx_proposal(project, proposal_content)
        pdf_url = document_service.generate_pdf_proposal(project, proposal_content)
        pptx_url = document_service.generate_pptx_slides(project, proposal_content)
        
        # Save URLs to Firestore proposals
        db.collection("proposals").document(project_id).set({
            "projectId": project_id,
            "exportUrlDocx": docx_url,
            "exportUrlPdf": pdf_url,
            "contentSummary": proposal_content["executiveSummary"]
        })
        
        # Save PowerPoint to Firestore presentations
        db.collection("presentations").document(project_id).set({
            "projectId": project_id,
            "exportUrlPptx": pptx_url
        })
        
        return {
            "pdfUrl": pdf_url,
            "docxUrl": docx_url,
            "pptxUrl": pptx_url
        }
    except Exception as e:
        logger.error(f"Document generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to compile and export proposal assets.")
