import json
import logging
import re
from typing import Dict, Any, List, Optional
from anthropic import AsyncAnthropic

from app.config import settings

logger = logging.getLogger("salespilot.requirement_agent")

# Define the standard checklist fields and categories
DEFAULT_CHECKLIST = {
    # Business Category (Weight: 15%)
    "industry": {"label": "Industry", "category": "Business", "default": "IT Services", "weight": 5},
    "businessGoal": {"label": "Business Goal", "category": "Business", "default": "Not Specified", "weight": 5},
    "targetUsers": {"label": "Target Users", "category": "Business", "default": "Not Specified", "weight": 5},
    
    # Project Category (Weight: 10%)
    "budget": {"label": "Budget", "category": "Project", "default": 0, "weight": 5},
    "timeline": {"label": "Timeline", "category": "Project", "default": "Not Specified", "weight": 5},
    
    # Platform / Functional Category (Weight: 25%)
    "platforms": {"label": "Platform", "category": "Functional", "default": [], "weight": 5},
    "expectedUsers": {"label": "Expected Users", "category": "Functional", "default": 0, "weight": 3},
    "concurrentUsers": {"label": "Concurrent Users", "category": "Functional", "default": 0, "weight": 2},
    "payment": {"label": "Payment Integration", "category": "Functional", "default": False, "weight": 3},
    "erp": {"label": "ERP Integration", "category": "Functional", "default": "Not Specified", "weight": 2},
    "crm": {"label": "CRM Integration", "category": "Functional", "default": "Not Specified", "weight": 2},
    "thirdPartyApis": {"label": "Third-Party APIs", "category": "Functional", "default": [], "weight": 2},
    "chatbot": {"label": "Chatbot Feature", "category": "Functional", "default": False, "weight": 2},
    "recommendations": {"label": "Recommendations Engine", "category": "Functional", "default": False, "weight": 2},
    "ocr": {"label": "OCR Feature", "category": "Functional", "default": False, "weight": 1},
    "analytics": {"label": "Analytics Dashboard", "category": "Functional", "default": False, "weight": 1},
    
    # Infrastructure Category (Weight: 20%)
    "preferredCloud": {"label": "Preferred Cloud", "category": "Infrastructure", "default": "Not Specified", "weight": 5},
    "regions": {"label": "Regions", "category": "Infrastructure", "default": [], "weight": 5},
    "sla": {"label": "SLA", "category": "Infrastructure", "default": "99.9%", "weight": 4},
    "backup": {"label": "Backup Policy", "category": "Infrastructure", "default": "Not Specified", "weight": 3},
    "disasterRecovery": {"label": "Disaster Recovery", "category": "Infrastructure", "default": "Not Specified", "weight": 3},
    
    # Security Category (Weight: 15%)
    "authentication": {"label": "Authentication", "category": "Security", "default": "Not Specified", "weight": 7},
    "securityDetails": {"label": "Security details", "category": "Security", "default": "Not Specified", "weight": 8},
    
    # Compliance Category (Weight: 15%)
    "compliance": {"label": "Compliance Requirements", "category": "Compliance", "default": [], "weight": 15},
}

# Questions to ask for missing fields
FIELD_QUESTIONS = {
    "industry": "What industry does your business operate in (e.g. Retail, Healthcare, Banking, Education, Manufacturing, Government)?",
    "businessGoal": "What is the primary business goal of this project?",
    "targetUsers": "Who are your target users for this platform?",
    "budget": "What is your budget or monthly hosting budget cap for this project?",
    "timeline": "What is your target timeline for launching this project?",
    "platforms": "Which platforms do you target for this application? (Web, Android, iOS)?",
    "expectedUsers": "Approximately how many total expected users do you anticipate?",
    "concurrentUsers": "How many concurrent active users do you expect during peak hours?",
    "payment": "Will customers need to make online payments directly on the platform?",
    "erp": "Do you need to integrate this app with an ERP system (like SAP, Oracle)?",
    "crm": "Do you need to integrate this app with a CRM system (like Salesforce)?",
    "thirdPartyApis": "Are there any specific third-party APIs or integrations required?",
    "chatbot": "Do you need an AI chatbot feature for customers?",
    "recommendations": "Should the platform recommend products or content dynamically using AI?",
    "ocr": "Do you require OCR (optical character recognition) to scan documents or receipts?",
    "analytics": "Do you require an analytics/reporting dashboard?",
    "preferredCloud": "Do you have a preferred cloud provider (Azure, AWS, GCP) or are you open?",
    "regions": "In which geographic region(s) do you want your cloud infrastructure hosted?",
    "sla": "What are your application uptime or SLA requirements (e.g. 99.9%)?",
    "backup": "What are your requirements for database backups (e.g. daily, weekly)?",
    "disasterRecovery": "Do you require active-active or active-passive disaster recovery (DR) setup?",
    "authentication": "What authentication standards do you require (e.g. SSO, Google Auth, Multi-factor auth)?",
    "securityDetails": "What security standards do you expect (e.g. encryption at rest, transit, network firewalls)?",
    "compliance": "Are there specific compliance or regulations (like GDPR, HIPAA, SOC2) we must follow?",
}

# Industry specific questions and templates
INDUSTRY_TEMPLATES = {
    "healthcare": {
        "patientRecords": {
            "label": "Patient Records",
            "category": "Compliance",
            "question": "Will the platform store or transmit patient health records (e.g. EHR)?",
            "default": "Not Specified",
            "weight": 5
        },
        "appointments": {
            "label": "Appointments",
            "category": "Functional",
            "question": "Do you need scheduling features for patient appointments?",
            "default": False,
            "weight": 5
        },
        "compliance": {
            "label": "HIPAA Compliance",
            "category": "Compliance",
            "question": "Is HIPAA compliance required for this healthcare solution?",
            "default": ["HIPAA"],
            "weight": 5
        }
    },
    "banking": {
        "kyc": {
            "label": "KYC Verification",
            "category": "Security",
            "question": "Do you need identity verification or Know-Your-Customer (KYC) processes?",
            "default": False,
            "weight": 5
        },
        "compliance": {
            "label": "PCI DSS Compliance",
            "category": "Compliance",
            "question": "Will you require PCI DSS compliance for secure payment transactions?",
            "default": ["PCI DSS"],
            "weight": 5
        },
        "fraudDetection": {
            "label": "Fraud Detection",
            "category": "Security",
            "question": "Is an automated fraud detection system needed for transactions?",
            "default": False,
            "weight": 5
        }
    },
    "retail": {
        "inventory": {
            "label": "Inventory Tracking",
            "category": "Functional",
            "question": "Should the platform include inventory management (stock tracking, warehousing)?",
            "default": False,
            "weight": 5
        },
        "payment": {
            "label": "Online Payments",
            "category": "Functional",
            "question": "Will customers make online payments directly on the platform?",
            "default": True,
            "weight": 5
        },
        "coupons": {
            "label": "Coupons / Promos",
            "category": "Functional",
            "question": "Do you require support for promotional coupons, discounts, or loyalty programs?",
            "default": False,
            "weight": 2
        },
        "delivery": {
            "label": "Delivery Tracking",
            "category": "Functional",
            "question": "Do we need order fulfillment or delivery tracking integration?",
            "default": False,
            "weight": 3
        }
    },
    "education": {
        "students": {
            "label": "Student/Teacher Roles",
            "category": "Business",
            "question": "Do you require distinct user roles and portals for students and teachers?",
            "default": "Not Specified",
            "weight": 5
        },
        "exams": {
            "label": "Online Exams",
            "category": "Functional",
            "question": "Will the platform host online exams, grading, or assessment tools?",
            "default": False,
            "weight": 5
        },
        "lms": {
            "label": "LMS Integration",
            "category": "Functional",
            "question": "Do you need integration with a Learning Management System (LMS) like Moodle or Canvas?",
            "default": "Not Specified",
            "weight": 5
        }
    },
    "manufacturing": {
        "erp": {
            "label": "ERP Integration",
            "category": "Functional",
            "question": "Do you need integration with an Enterprise Resource Planning (ERP) system like SAP or Oracle?",
            "default": "Not Specified",
            "weight": 5
        },
        "warehouse": {
            "label": "Warehouse Management",
            "category": "Functional",
            "question": "Is warehouse routing or supply chain logistics tracking required?",
            "default": "Not Specified",
            "weight": 5
        },
        "iot": {
            "label": "IoT Sensors",
            "category": "Infrastructure",
            "question": "Will the platform ingest telemetry data from IoT devices or manufacturing machinery?",
            "default": False,
            "weight": 5
        }
    },
    "government": {
        "accessibility": {
            "label": "Accessibility Standards",
            "category": "Compliance",
            "question": "Does this solution need to meet specific accessibility requirements like Section 508 or WCAG?",
            "default": "Not Specified",
            "weight": 5
        },
        "dataResidency": {
            "label": "Data Residency",
            "category": "Compliance",
            "question": "Are there strict data residency requirements keeping all data in specific regional borders?",
            "default": "Not Specified",
            "weight": 5
        },
        "multiLanguage": {
            "label": "Multi-Language Support",
            "category": "Functional",
            "question": "Is multi-language support required for government portals?",
            "default": False,
            "weight": 5
        }
    }
}

CLAUDE_SYSTEM_PROMPT = """You are SalesPilot AI, a Senior Presales Architect and Business Analyst.
Your only goal is to understand and extract the client's requirements through a natural conversation.
Do NOT design the architecture, recommend cloud services (e.g. don't suggest specific VMs, databases like PostgreSQL, or frontend tools like Next.js), estimate pricing, or generate proposals. Those tasks are done by other agents later. Focus ONLY on discovering the requirements.

You must maintain the project requirements JSON and calculate a completeness score.

Standard Checklist Fields:
{checklist_description}

Industry Templates:
{industry_templates_description}

Your output MUST be a JSON object containing:
1. "requirements": The updated structured requirements object.
2. "nextQuestion": The next smart, context-dependent question to fill the highest-priority missing gap. Keep questions conversational.
3. "isComplete": Boolean indicating if overall completeness score is >= 95%.

Output your response ONLY as a valid JSON object. No extra text, explanation, or tags.
"""

class RequirementAgent:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.is_claude_configured else None

    def calculate_completeness_scores(self, requirements: Dict[str, Any], industry: Optional[str] = None) -> Dict[str, Any]:
        """
        Calculates completeness percentages per category and overall.
        """
        # Determine standard category weights and items
        categories = ["Business", "Project", "Functional", "Infrastructure", "Security", "Compliance"]
        category_weights = {
            "Business": 15,
            "Project": 10,
            "Functional": 25,
            "Infrastructure": 20,
            "Security": 15,
            "Compliance": 15
        }
        
        # Combine standard checklist with industry specific template if available
        checklist = DEFAULT_CHECKLIST.copy()
        industry_lower = (industry or requirements.get("industry") or "").lower()
        
        industry_key = None
        for k in INDUSTRY_TEMPLATES:
            if k in industry_lower:
                industry_key = k
                break
                
        if industry_key:
            for field_name, field_spec in INDUSTRY_TEMPLATES[industry_key].items():
                checklist[field_name] = field_spec

        category_totals = {c: 0 for c in categories}
        category_filled = {c: 0 for c in categories}

        for field_name, spec in checklist.items():
            category = spec["category"]
            weight = spec["weight"]
            category_totals[category] += weight
            
            val = requirements.get(field_name)
            is_filled = False
            
            if val is not None:
                if isinstance(val, list):
                    is_filled = len(val) > 0
                elif isinstance(val, bool):
                    is_filled = True # Bool is explicitly True or False (both indicate a choice)
                elif isinstance(val, (int, float)):
                    is_filled = val > 0
                elif isinstance(val, str):
                    is_filled = val.strip() != "" and val.lower() not in ["not specified", "missing", "unknown"]
            
            if is_filled:
                category_filled[category] += weight

        category_scores = {}
        for c in categories:
            total_weight = category_totals[c]
            if total_weight > 0:
                category_scores[c] = round((category_filled[c] / total_weight) * 100)
            else:
                category_scores[c] = 100

        # Calculate overall weighted score
        overall = 0.0
        for c in categories:
            overall += category_scores[c] * (category_weights[c] / 100.0)
            
        category_scores["Overall"] = round(overall)
        return category_scores

    def get_checklist_state(self, requirements: Dict[str, Any], industry: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Compiles the state of all checklist items with True/False.
        """
        checklist = DEFAULT_CHECKLIST.copy()
        industry_lower = (industry or requirements.get("industry") or "").lower()
        
        industry_key = None
        for k in INDUSTRY_TEMPLATES:
            if k in industry_lower:
                industry_key = k
                break
                
        if industry_key:
            for field_name, field_spec in INDUSTRY_TEMPLATES[industry_key].items():
                checklist[field_name] = field_spec

        state_list = []
        for field_name, spec in checklist.items():
            val = requirements.get(field_name)
            is_filled = False
            
            if val is not None:
                if isinstance(val, list):
                    is_filled = len(val) > 0
                elif isinstance(val, bool):
                    is_filled = True
                elif isinstance(val, (int, float)):
                    is_filled = val > 0
                elif isinstance(val, str):
                    is_filled = val.strip() != "" and val.lower() not in ["not specified", "missing", "unknown"]
            
            state_list.append({
                "field": field_name,
                "label": spec["label"],
                "category": spec["category"],
                "filled": is_filled,
                "value": val if is_filled else None
            })
            
        return state_list

    def _rule_based_mock_extract(self, transcript: str, current_requirements: Dict[str, Any]) -> Dict[str, Any]:
        """
        Rule-based parser to simulate requirement extraction in DEMO_MODE without LLM.
        """
        reqs = current_requirements.copy()
        text = transcript.lower()

        # 1. Industry
        if "retail" in text or "shop" in text or "e-commerce" in text or "ecommerce" in text:
            reqs["industry"] = "Retail"
        elif "health" in text or "medical" in text or "patient" in text or "hospital" in text:
            reqs["industry"] = "Healthcare"
        elif "bank" in text or "finance" in text or "transaction" in text or "kyc" in text:
            reqs["industry"] = "Banking"
        elif "school" in text or "education" in text or "student" in text or "learn" in text or "exam" in text:
            reqs["industry"] = "Education"
        elif "manufactur" in text or "factory" in text or "iot" in text or "warehouse" in text:
            reqs["industry"] = "Manufacturing"
        elif "government" in text or "agency" in text or "citizen" in text or "public sector" in text:
            reqs["industry"] = "Government"

        # 2. Business Goal
        if "goal is" in text or "objective is" in text or "want to build" in text:
            match = re.search(r'(?:goal is|objective is|want to build)\s+([^.]+)', text)
            if match:
                reqs["businessGoal"] = match.group(1).strip().capitalize()

        # 3. Target Users
        if "target users" in text or "customers" in text or "used by" in text:
            match = re.search(r'(?:target users are|used by|for our)\s+([^.]+)', text)
            if match:
                reqs["targetUsers"] = match.group(1).strip().capitalize()

        # 4. Platforms
        platforms = reqs.get("platforms") or []
        if not isinstance(platforms, list):
            platforms = []
        if "web" in text:
            if "Web" not in platforms: platforms.append("Web")
        if "android" in text or "mobile app" in text:
            if "Android" not in platforms: platforms.append("Android")
        if "ios" in text or "iphone" in text or "mobile app" in text:
            if "iOS" not in platforms: platforms.append("iOS")
        if platforms:
            reqs["platforms"] = platforms

        # 5. Budget
        budget_match = re.search(r'(?:budget|cost)\s+(?:is|around|of)?\s*(?:[\$₹£€])?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(lakh|crore|million|k|thousand)?', text)
        if budget_match:
            num = float(budget_match.group(1).replace(",", ""))
            unit = budget_match.group(2)
            if unit == "lakh":
                num *= 100000
            elif unit == "crore":
                num *= 10000000
            elif unit == "million":
                num *= 1000000
            elif unit in ["k", "thousand"]:
                num *= 1000
            reqs["budget"] = num

        # 6. Timeline
        timeline_match = re.search(r'(\d+)\s*(month|week|year|day)', text)
        if timeline_match:
            reqs["timeline"] = f"{timeline_match.group(1)} {timeline_match.group(2)}s"

        # 7. Users counts
        users_match = re.search(r'(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:million|m|k|lakh)?\s*(?:total)?\s*users', text)
        if users_match:
            try:
                raw_num = users_match.group(1).replace(",", "")
                num = int(float(raw_num))
                if "million" in text or " m " in text:
                    num *= 1000000
                elif "k" in text:
                    num *= 1000
                reqs["expectedUsers"] = num
            except ValueError:
                pass

        concurrent_match = re.search(r'(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:concur|peak)', text)
        if concurrent_match:
            try:
                raw_num = concurrent_match.group(1).replace(",", "")
                num = int(float(raw_num))
                if "k" in text:
                    num *= 1000
                reqs["concurrentUsers"] = num
            except ValueError:
                pass

        # 8. Preferred Cloud
        if "aws" in text or "amazon" in text:
            reqs["preferredCloud"] = "AWS"
        elif "azure" in text or "microsoft" in text:
            reqs["preferredCloud"] = "Azure"
        elif "gcp" in text or "google cloud" in text or "google" in text:
            reqs["preferredCloud"] = "GCP"

        # 9. Regions
        regions = reqs.get("regions") or []
        if not isinstance(regions, list):
            regions = []
        if "us east" in text or "east us" in text or "virginia" in text:
            if "US East" not in regions: regions.append("US East")
        if "us west" in text or "oregon" in text or "california" in text:
            if "US West" not in regions: regions.append("US West")
        if "europe" in text or "ireland" in text or "frankfurt" in text:
            if "Europe" not in regions: regions.append("Europe")
        if "india" in text or "mumbai" in text or "asia" in text:
            if "Asia Pacific" not in regions: regions.append("Asia Pacific")
        if regions:
            reqs["regions"] = regions

        # 10. Availability
        if "99.99" in text:
            reqs["sla"] = "99.99%"
        elif "99.95" in text:
            reqs["sla"] = "99.95%"
        elif "99.9" in text:
            reqs["sla"] = "99.9%"
        elif "high availability" in text:
            reqs["sla"] = "99.95%"

        # Backup & Disaster Recovery
        if "backup" in text:
            if "daily" in text: reqs["backup"] = "Daily"
            elif "weekly" in text: reqs["backup"] = "Weekly"
            else: reqs["backup"] = "Yes, Configured"

        if "disaster recovery" in text or "dr " in text or "recovery" in text:
            if "active active" in text or "active-active" in text:
                reqs["disasterRecovery"] = "Active-Active Multi-Region"
            elif "active passive" in text or "active-passive" in text:
                reqs["disasterRecovery"] = "Active-Passive failover"
            else:
                reqs["disasterRecovery"] = "Standard Backup Restore"

        # 11. Security & Auth
        if "sso" in text or "single sign-on" in text or "single sign on" in text:
            reqs["authentication"] = "Single Sign-On (SSO / SAML / OIDC)"
        elif "oauth" in text or "social" in text or "google auth" in text:
            reqs["authentication"] = "OAuth 2.0 / Social Auth"
        elif "auth" in text or "login" in text:
            reqs["authentication"] = "Email and Password (with MFA)"

        if "encryption" in text or "firewall" in text or "security" in text or "ssl" in text or "tls" in text:
            reqs["securityDetails"] = "SSL/TLS transit, AES-256 rest encryption, WAF"

        # 12. Compliance
        compliance = reqs.get("compliance") or []
        if not isinstance(compliance, list):
            compliance = []
        if "hipaa" in text:
            if "HIPAA" not in compliance: compliance.append("HIPAA")
        if "gdpr" in text:
            if "GDPR" not in compliance: compliance.append("GDPR")
        if "pci" in text or "credit card" in text:
            if "PCI-DSS" not in compliance: compliance.append("PCI-DSS")
        if "soc2" in text or "soc 2" in text:
            if "SOC2" not in compliance: compliance.append("SOC2")
        if compliance:
            reqs["compliance"] = compliance

        # 13. Integrations
        if "payment" in text or "stripe" in text or "paypal" in text:
            reqs["payment"] = True
        if "sap" in text or "oracle" in text or "erp" in text:
            reqs["erp"] = "SAP/Oracle Integrated"
        if "salesforce" in text or "crm" in text:
            reqs["crm"] = "Salesforce Integrated"
        if "api" in text or "third party" in text or "third-party" in text:
            reqs["thirdPartyApis"] = ["Stripe", "Sendgrid"]

        # 14. AI Features
        if "chatbot" in text or "chat bot" in text or "support bot" in text:
            reqs["chatbot"] = True
        if "recommend" in text or "personaliz" in text:
            reqs["recommendations"] = True
        if "ocr" in text or "receipt" in text or "document scan" in text:
            reqs["ocr"] = True
        if "analytics" in text or "dashboard" in text or "report" in text:
            reqs["analytics"] = True

        # 15. Industry specific template updates
        industry_key = (reqs.get("industry") or "").lower()
        if "retail" in industry_key:
            reqs["payment"] = True
            if "inventory" in text: reqs["inventory"] = True
            if "coupon" in text or "discount" in text: reqs["coupons"] = True
            if "delivery" in text or "ship" in text or "tracking" in text: reqs["delivery"] = True
        elif "healthcare" in industry_key:
            if "record" in text or "patient data" in text: reqs["patientRecords"] = "Secure Encrypted EHR"
            if "appointment" in text or "schedule" in text or "book" in text: reqs["appointments"] = True
            if "compliance" not in reqs: reqs["compliance"] = []
            if "HIPAA" not in reqs.get("compliance", []): reqs["compliance"].append("HIPAA")
        elif "banking" in industry_key:
            if "kyc" in text or "verify" in text: reqs["kyc"] = True
            if "fraud" in text: reqs["fraudDetection"] = True
            if "compliance" not in reqs: reqs["compliance"] = []
            if "PCI-DSS" not in reqs.get("compliance", []): reqs["compliance"].append("PCI-DSS")
        elif "education" in industry_key:
            if "teacher" in text or "student" in text: reqs["students"] = "Role-based portals"
            if "exam" in text or "test" in text or "grade" in text: reqs["exams"] = True
            if "lms" in text or "canvas" in text or "moodle" in text: reqs["lms"] = "Canvas Integration"
        elif "manufacturing" in industry_key:
            if "erp" in text or "sap" in text: reqs["erp"] = "SAP ERP Integration"
            if "warehouse" in text or "logistics" in text: reqs["warehouse"] = "Logistics integrated"
            if "sensor" in text or "iot" in text: reqs["iot"] = True
        elif "government" in industry_key:
            if "access" in text or "wcag" in text: reqs["accessibility"] = "WCAG 2.1 AA Compliant"
            if "residency" in text or "local" in text or "borders" in text: reqs["dataResidency"] = "Strict Local Residency"
            if "language" in text or "translate" in text: reqs["multiLanguage"] = True

        return reqs

    def _mock_document_analysis(self, text: str) -> Dict[str, Any]:
        """
        Mock document analysis helper for DEMO_MODE.
        """
        t_low = text.lower()
        
        # ShopSphere specific seeding if it contains shopsphere keywords
        if "shopsphere" in t_low:
            structured = {
                "industry": "Retail / E-Commerce",
                "businessObjectives": [
                    "Increase online sales.",
                    "Improve customer experience.",
                    "Support future expansion across India."
                ],
                "functionalRequirements": [
                    "Browse products and search items.",
                    "Add products to a shopping cart and place orders.",
                    "Make online payments directly on the platform.",
                    "Track order deliveries in real time.",
                    "Admin dashboard for product management, inventory updates, and order management.",
                    "AI-powered product recommendations based on customer behavior."
                ],
                "nonFunctionalRequirements": [
                    "Responsive website and mobile applications (iOS/Android).",
                    "Handle significant traffic surges during festivals like Diwali and Black Friday (high scalability)."
                ],
                "securityRequirements": [
                    "Secure payment gateway integration.",
                    "Access control and authorization for the Admin dashboard."
                ],
                "complianceRequirements": [
                    "Data residency compliance for hosting inside India.",
                    "Standard transaction compliance for payment processing."
                ],
                "integrations": [
                    "Online payment gateway APIs.",
                    "AI recommendation engine.",
                    "Delivery tracking system integration."
                ],
                "budget": "Not specified",
                "timeline": "Within 8 months",
                "cloudPreference": "Any (No preference)",
                "expectedUsers": "Approximately 100,000 registered users (20,000 daily visitors)",
                "missingInformation": [
                    "Explicit budget limits for cloud hosting.",
                    "Specific security standards (e.g. Encryption at Rest details, network firewall specs).",
                    "Exact authentication protocol preference (e.g. OAuth2, SSO, Auth0).",
                    "Standard compliance targets (GDPR, SOC2, PCI-DSS) are not explicitly called out."
                ],
                "projectRisks": [
                    "High risk of database and compute overloading during Diwali/Black Friday sales spikes.",
                    "Tight 8-month timeline for delivering both a responsive web application and native iOS/Android mobile clients."
                ]
            }
        else:
            # Generic seeding based on general keywords in text
            industry = "Retail"
            if "health" in t_low or "patient" in t_low:
                industry = "Healthcare"
            elif "bank" in t_low or "finance" in t_low:
                industry = "Banking"
            elif "learn" in t_low or "school" in t_low or "student" in t_low:
                industry = "Education"
            elif "factory" in t_low or "manufactur" in t_low:
                industry = "Manufacturing"
                
            cloud = "Any"
            if "aws" in t_low or "amazon" in t_low:
                cloud = "AWS"
            elif "azure" in t_low or "microsoft" in t_low:
                cloud = "Azure"
            elif "gcp" in t_low or "google" in t_low:
                cloud = "GCP"
                
            budget = "Not specified"
            if "budget" in t_low or "price" in t_low:
                numbers = re.findall(r'\$?(\d+(?:,\d+)*(?:\.\d+)?)', t_low)
                if numbers:
                    budget = f"${numbers[0]} USD"
                    
            timeline = "6 months"
            if "month" in t_low:
                months = re.findall(r'(\d+)\s*month', t_low)
                if months:
                    timeline = f"{months[0]} months"
                    
            users = "5,000 expected users"
            if "user" in t_low or "visitor" in t_low:
                numbers = re.findall(r'(\d+(?:,\d+)*)', t_low)
                if numbers:
                    users = f"{numbers[0]} expected users"

            structured = {
                "industry": industry,
                "businessObjectives": [
                    f"Implement cloud-enabled digital workflows for {industry} services.",
                    "Optimize operational efficiencies and customer access channels."
                ],
                "functionalRequirements": [
                    "Core database management and search functionality.",
                    "User registration, login profiles, and access authorization.",
                    "API services layer to support clients and remote transactions."
                ],
                "nonFunctionalRequirements": [
                    "High availability uptime targeting 99.9% SLA.",
                    "Standard response latencies under 500ms."
                ],
                "securityRequirements": [
                    "Encryption of sensitive user credentials and data in transit.",
                    "Standard HTTPS endpoint certificates and API key authorization."
                ],
                "complianceRequirements": [
                    "General data protection guidelines.",
                    "SOC2 Audit alignment (best practice)."
                ],
                "integrations": [
                    "Database layer storage.",
                    "External email/notification API service."
                ],
                "budget": budget,
                "timeline": timeline,
                "cloudPreference": cloud,
                "expectedUsers": users,
                "missingInformation": [
                    "Specific hosting budget caps are undefined.",
                    "High availability and disaster recovery paired regions are not specified.",
                    "Authentication protocol choice (SSO, federated) is not detailed."
                ],
                "projectRisks": [
                    "Security vulnerability risks if standard SSO credentials aren't enforced.",
                    "Timeline constraints if custom legacy integrations are uncovered late."
                ]
            }
            
        # Formulate formatted report text in markdown
        report_md = f"""# Requirement Analysis Report: {structured['industry']} Solution

## 1. Project Specifications Summary
* **Industry Vertical**: {structured['industry']}
* **Preferred Cloud**: {structured['cloudPreference']}
* **Timeline Target**: {structured['timeline']}
* **Monthly Budget Cap**: {structured['budget']}
* **Expected User Base**: {structured['expectedUsers']}

## 2. Business Objectives
{"".join(f'* {obj}\n' for obj in structured['businessObjectives'])}
## 3. Functional Requirements
{"".join(f'* {req}\n' for req in structured['functionalRequirements'])}
## 4. Non-Functional Requirements
{"".join(f'* {req}\n' for req in structured['nonFunctionalRequirements'])}
## 5. Security & Compliance
* **Security Requirements**:
  {"".join(f'  - {s}\n' for s in structured['securityRequirements'])}* **Compliance Standards**:
  {"".join(f'  - {c}\n' for c in structured['complianceRequirements'])}
## 6. Integrations & Interfaces
{"".join(f'* {i}\n' for i in structured['integrations'])}
## 7. Crucial Missing Information (To Be Resolved)
> [!WARNING]
> The following parameters were not defined in the source document and represent critical design gaps:
{"".join(f'* {m}\n' for m in structured['missingInformation'])}
## 8. Presales Project Risks
> [!CAUTION]
{"".join(f'* {r}\n' for r in structured['projectRisks'])}"""
        return {
            "structuredSpecs": structured,
            "reportText": report_md
        }

    async def analyze_rfp_text(self, rfp_text: str) -> Dict[str, Any]:
        """
        Uses Claude to extract structured requirements from an RFP document, falling back to rule-based mock.
        """
        if not self.client or settings.DEMO_MODE:
            logger.info("Claude not configured or DEMO_MODE=True. Running Rule-based Mock RFP Analysis.")
            return self._mock_document_analysis(rfp_text)

        try:
            CLAUDE_ANALYSIS_SYSTEM_PROMPT = """You are SalesPilot AI, a Senior Business Analyst.
Your task is to analyze the extracted requirements text and output a JSON object containing:
1. "structuredSpecs": A JSON object matching this schema exactly:
   {
     "industry": "e.g., Retail, Banking, Healthcare, Education, Manufacturing, Government, etc.",
     "businessObjectives": ["List of extracted business objectives"],
     "functionalRequirements": ["List of functional requirements"],
     "nonFunctionalRequirements": ["List of non-functional requirements"],
     "securityRequirements": ["List of security requirements"],
     "complianceRequirements": ["List of compliance requirements (SOC2, GDPR, HIPAA, local residency, etc.)"],
     "integrations": ["List of expected system integrations"],
     "budget": "Extracted budget details (e.g. '$50,000 USD/mo' or 'Not specified')",
     "timeline": "Extracted project timeline (e.g. '8 months' or 'Not specified')",
     "cloudPreference": "AWS, Azure, GCP, or Any",
     "expectedUsers": "Estimated number of users (e.g. '100,000 users' or 'Not specified')",
     "missingInformation": ["List of crucial details that are missing from the text (e.g., budget cap, specific compliance, sizing details)"],
     "projectRisks": ["List of potential project risks (e.g., scale surges, tight timeline, security exposures)"]
   }
2. "reportText": A formatted Markdown Requirement Analysis Report summarizing these findings, including a prominent "Missing Information" section listing crucial missing details, and a "Project Risks" section.

Output ONLY valid JSON, with no other text. Keep your output clean and conform strictly to JSON syntax."""

            message = await self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=3000,
                system=CLAUDE_ANALYSIS_SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": f"Analyze the following project requirements document text:\n\n{rfp_text}"}
                ]
            )
            text = message.content[0].text
            result = self._parse_json_from_text(text)
            
            if "structuredSpecs" in result and "reportText" in result:
                return result
            elif "requirements" in result:
                return {
                    "structuredSpecs": result["requirements"],
                    "reportText": result.get("reportText", "")
                }
            else:
                return {
                    "structuredSpecs": result,
                    "reportText": f"# Requirement Analysis Report\n\nGenerated Specs: {json.dumps(result, indent=2)}"
                }
        except Exception as e:
            logger.error(f"Claude requirement analysis failed: {e}. Falling back to default mock analysis.")
            return self._mock_document_analysis(rfp_text)

    def _context_aware_extract(self, transcript: str, field: str, current_requirements: Dict[str, Any]) -> Dict[str, Any]:
        """
        Context-aware parser that maps a user response directly to the specific field that was asked.
        """
        reqs = current_requirements.copy()
        text = transcript.lower().strip()
        
        if field == "industry":
            for ind in ["healthcare", "banking", "retail", "education", "manufacturing", "government"]:
                if ind in text:
                    reqs["industry"] = ind.capitalize()
                    return reqs
            reqs["industry"] = transcript.capitalize()
            
        elif field == "businessGoal":
            reqs["businessGoal"] = transcript
            
        elif field == "targetUsers":
            reqs["targetUsers"] = transcript
            
        elif field == "budget":
            numbers = re.findall(r'\d+(?:,\d+)*(?:\.\d+)?', text)
            if numbers:
                try:
                    num = float(numbers[0].replace(",", ""))
                    if "lakh" in text: num *= 100000
                    elif "crore" in text: num *= 10000000
                    elif "million" in text or "m" in text: num *= 1000000
                    elif "k" in text: num *= 1000
                    reqs["budget"] = num
                except ValueError:
                    pass
                
        elif field == "timeline":
            reqs["timeline"] = transcript
            
        elif field == "platforms":
            platforms = reqs.get("platforms") or []
            if not isinstance(platforms, list): platforms = []
            if "web" in text: 
                if "Web" not in platforms: platforms.append("Web")
            if "android" in text or "mobile" in text or "phone" in text:
                if "Android" not in platforms: platforms.append("Android")
            if "ios" in text or "iphone" in text or "mobile" in text or "phone" in text:
                if "iOS" not in platforms: platforms.append("iOS")
            reqs["platforms"] = platforms
            
        elif field in ["expectedUsers", "concurrentUsers"]:
            numbers = re.findall(r'\d+(?:,\d+)*(?:\.\d+)?', text)
            if numbers:
                try:
                    num = int(float(numbers[0].replace(",", "")))
                    if "million" in text or "m" in text: num *= 1000000
                    elif "k" in text: num *= 1000
                    reqs[field] = num
                except ValueError:
                    pass
                
        elif field == "preferredCloud":
            if "aws" in text or "amazon" in text:
                reqs["preferredCloud"] = "AWS"
            elif "azure" in text or "microsoft" in text:
                reqs["preferredCloud"] = "Azure"
            elif "gcp" in text or "google" in text:
                reqs["preferredCloud"] = "GCP"
            else:
                reqs["preferredCloud"] = transcript
                
        elif field == "regions":
            regions = reqs.get("regions") or []
            if not isinstance(regions, list): regions = []
            regions.append(transcript)
            reqs["regions"] = regions
            
        elif field == "sla":
            reqs["sla"] = transcript
            
        elif field == "backup":
            reqs["backup"] = transcript
            
        elif field == "disasterRecovery":
            reqs["disasterRecovery"] = transcript
            
        elif field == "authentication":
            reqs["authentication"] = transcript
            
        elif field == "securityDetails":
            reqs["securityDetails"] = transcript
            
        elif field == "compliance":
            compliance = reqs.get("compliance") or []
            if not isinstance(compliance, list): compliance = []
            for comp in ["hipaa", "gdpr", "pci", "soc2"]:
                if comp in text:
                    compliance.append(comp.upper() if comp != "pci" else "PCI-DSS")
            reqs["compliance"] = compliance
            
        elif field == "payment":
            if any(yes in text for yes in ["yes", "yeah", "sure", "will", "true"]):
                reqs["payment"] = True
            elif any(no in text for no in ["no", "not", "false"]):
                reqs["payment"] = False
                
        else:
            industry_lower = (reqs.get("industry") or "").lower()
            industry_key = None
            for k in INDUSTRY_TEMPLATES:
                if k in industry_lower:
                    industry_key = k
                    break
            if industry_key and field in INDUSTRY_TEMPLATES[industry_key]:
                default_val = INDUSTRY_TEMPLATES[industry_key][field]["default"]
                if isinstance(default_val, bool):
                    if any(yes in text for yes in ["yes", "yeah", "sure", "true"]):
                        reqs[field] = True
                    elif any(no in text for no in ["no", "not", "false"]):
                        reqs[field] = False
                else:
                    reqs[field] = transcript
                    
        return reqs

    async def conduct_voice_step(self, transcript: str, chat_history: List[Dict[str, str]], current_requirements: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Processes conversational requirements collection.
        Returns:
        {
          "requirements": Dict[str, Any],
          "completenessScore": Dict[str, int],
          "checklistState": List[Dict[str, Any]],
          "nextQuestion": str,
          "isComplete": bool
        }
        """
        reqs = current_requirements or {}

        # Determine last asked field to do context-aware parsing
        last_asked_field = None
        if chat_history:
            last_msg = chat_history[-1]
            if last_msg.get("role") == "assistant":
                last_content = last_msg.get("content", "")
                
                # Check standard checklist questions
                for field, question in FIELD_QUESTIONS.items():
                    if question in last_content:
                        last_asked_field = field
                        break
                        
                # Check industry specific questions if not found
                if not last_asked_field:
                    industry_lower = (reqs.get("industry") or "").lower()
                    industry_key = None
                    for k in INDUSTRY_TEMPLATES:
                        if k in industry_lower:
                            industry_key = k
                            break
                    if industry_key:
                        for field, spec in INDUSTRY_TEMPLATES[industry_key].items():
                            if spec.get("question") in last_content:
                                last_asked_field = field
                                break

        # If Claude is NOT configured or DEMO_MODE is true, run the smart Mock logic
        if not self.client or settings.DEMO_MODE:
            logger.info("Claude not configured or DEMO_MODE=True. Running rule-based conversational agent.")
            
            # Step 1: Update requirements using general keyword matching first
            reqs = self._rule_based_mock_extract(transcript, reqs)
            
            # Step 2: If we know what was asked, and that field is still missing/unfilled,
            # apply context-aware fallback extraction to parse it specifically.
            if last_asked_field:
                is_filled = False
                val = reqs.get(last_asked_field)
                if val is not None:
                    if isinstance(val, list):
                        is_filled = len(val) > 0
                    elif isinstance(val, bool):
                        is_filled = True
                    elif isinstance(val, (int, float)):
                        is_filled = val > 0
                    elif isinstance(val, str):
                        is_filled = val.strip() != "" and val.lower() not in ["not specified", "missing", "unknown"]
                
                if not is_filled:
                    logger.info(f"Field '{last_asked_field}' still empty. Applying context-aware extraction.")
                    reqs = self._context_aware_extract(transcript, last_asked_field, reqs)
            
            # Step 3: Compute completeness and checklist state
            scores = self.calculate_completeness_scores(reqs)
            checklist_state = self.get_checklist_state(reqs)
            overall_score = scores.get("Overall", 0)
            
            is_complete = overall_score >= 95
            
            if is_complete:
                next_question = "I've summarized your project requirements. Please review them. Would you like to modify anything before I design the architecture?"
            else:
                # Find the first missing checklist item
                missing_field = None
                
                # Check for standard fields
                for item in checklist_state:
                    if not item["filled"]:
                        missing_field = item["field"]
                        break
                
                # Fallback question if everything seems filled but overall < 95%
                if missing_field and missing_field in FIELD_QUESTIONS:
                    next_question = FIELD_QUESTIONS[missing_field]
                    # Check if this is an industry template question
                    industry_lower = (reqs.get("industry") or "").lower()
                    industry_key = None
                    for k in INDUSTRY_TEMPLATES:
                        if k in industry_lower:
                            industry_key = k
                            break
                    if industry_key and missing_field in INDUSTRY_TEMPLATES[industry_key]:
                        next_question = INDUSTRY_TEMPLATES[industry_key][missing_field]["question"]
                else:
                    next_question = "Great! Everything looks solid. Let's do a final review of the requirements details in the summary panel."
                    is_complete = True
            
            return {
                "requirements": reqs,
                "completenessScore": scores,
                "checklistState": checklist_state,
                "nextQuestion": next_question,
                "isComplete": is_complete
            }

        # Otherwise, run Claude
        try:
            # Build Claude system description
            description_str = json.dumps(DEFAULT_CHECKLIST, indent=2)
            templates_str = json.dumps(INDUSTRY_TEMPLATES, indent=2)
            
            # Formulate the conversation history
            messages = []
            for msg in chat_history:
                role = "user" if msg["role"] == "user" else "assistant"
                messages.append({"role": role, "content": msg["content"]})
                
            # Add user message
            messages.append({"role": "user", "content": f"User answer: '{transcript}'. Current requirements gathered so far: {json.dumps(reqs)}. Update the requirements and respond strictly in the JSON format requested in system instructions."})

            message = await self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                system=CLAUDE_SYSTEM_PROMPT.format(
                    checklist_description=description_str,
                    industry_templates_description=templates_str
                ),
                messages=messages
            )
            resp_text = message.content[0].text
            result = self._parse_json_from_text(resp_text)
            
            # Post-process response to ensure completeness scores and checklists are appended
            updated_reqs = result.get("requirements", reqs)
            scores = self.calculate_completeness_scores(updated_reqs)
            checklist_state = self.get_checklist_state(updated_reqs)
            
            # Allow Claude to mark it complete, but override if overall score matches >= 95%
            is_complete = result.get("isComplete", False) or scores.get("Overall", 0) >= 95
            
            next_q = result.get("nextQuestion", "Please review the gathered requirements.")
            if is_complete and not next_q.startswith("I've summarized your project"):
                next_q = "I've summarized your project requirements. Please review them. Would you like to modify anything before I design the architecture?"

            return {
                "requirements": updated_reqs,
                "completenessScore": scores,
                "checklistState": checklist_state,
                "nextQuestion": next_q,
                "isComplete": is_complete
            }
        except Exception as e:
            logger.error(f"Claude requirement analysis failed: {e}. Falling back to rule-based mock.")
            # Failover
            return await self.conduct_voice_step(transcript, chat_history, reqs)

    def _parse_json_from_text(self, text: str) -> Dict[str, Any]:
        try:
            if "```json" in text:
                start = text.find("```json") + len("```json")
                end = text.find("```", start)
                text = text[start:end].strip()
            elif "```" in text:
                start = text.find("```") + len("```")
                end = text.find("```", start)
                text = text[start:end].strip()
            return json.loads(text)
        except Exception as e:
            logger.warning(f"Could not parse JSON: {e}")
            return {}

requirement_agent = RequirementAgent()
