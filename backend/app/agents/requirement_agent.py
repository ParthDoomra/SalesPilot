import json
import logging
from typing import Dict, Any, List
from anthropic import AsyncAnthropic

from app.config import settings

logger = logging.getLogger("salespilot.requirement_agent")

SYSTEM_PROMPT = """You are SalesPilot AI, an elite Solution Architect and Requirement Collector.
Your task is to analyze client requirements, identify missing technical details, and formulate clear, structured targets.

Collect details on:
1. Preferred Cloud provider (Azure, AWS, GCP)
2. Expected concurrent users / volume of requests
3. Storage sizes (files and databases)
4. Key features (e.g. real-time sync, AI features, reporting)
5. Budget restrictions
6. Critical constraints (e.g. HIPAA, GDPR, PCI-DSS compliance, multi-region availability)

Respond with a JSON structure if requirements are complete, or ask targeted questions to fill critical gaps.
"""

class RequirementAgent:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.is_claude_configured else None

    async def analyze_rfp_text(self, rfp_text: str) -> Dict[str, Any]:
        """
        Uses Claude to extract structured requirements from an RFP document.
        """
        if not self.client or settings.DEMO_MODE:
            logger.info("Claude not configured or DEMO_MODE=True. Running Mock RFP Analysis.")
            # Dynamic mock parser based on text indicators
            cloud = "Azure" if "azure" in rfp_text.lower() else "AWS" if "aws" in rfp_text.lower() else "Multi-cloud"
            hipaa = "HIPAA" in rfp_text.upper()
            gdpr = "GDPR" in rfp_text.upper() or "europe" in rfp_text.lower()
            
            return {
                "preferredCloud": cloud,
                "usersCount": 5000,
                "storageGb": 250,
                "compliance": ["HIPAA"] if hipaa else ["GDPR"] if gdpr else ["SOC2"],
                "modules": ["Authentication", "Core Dashboard", "API Gateway", "Analytics Engine"],
                "databaseType": "Relational (PostgreSQL)",
                "availability": "99.9% High Availability",
                "security": "SSL/TLS, Encryption at Rest, Network Security Groups",
                "traffic": "Average 100 requests/sec, Peak 500 requests/sec",
                "extractedSummary": rfp_text[:300] + "..." if len(rfp_text) > 300 else rfp_text
            }

        try:
            message = await self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                system=SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": f"Analyze the following RFP text and output a structured JSON of project requirements. Include elements: preferredCloud, usersCount (int), storageGb (int), compliance (array), modules (array), databaseType, availability, security, traffic.\n\nRFP Content:\n{rfp_text}"}
                ]
            )
            # Extrapolate JSON from response
            text = message.content[0].text
            return self._parse_json_from_text(text)
        except Exception as e:
            logger.error(f"Claude API failed: {e}. Falling back to default mock extraction.")
            return {
                "preferredCloud": "Azure",
                "usersCount": 1000,
                "storageGb": 100,
                "compliance": ["SOC2"],
                "modules": ["Auth", "Dashboard", "Storage"],
                "databaseType": "PostgreSQL",
                "availability": "99.9%",
                "security": "TLS",
                "traffic": "Low",
                "extractedSummary": "Standard cloud web application requirements."
            }

    async def conduct_voice_step(self, transcript: str, chat_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Processes voice/text conversational turn.
        If details are enough, compiles final requirements JSON. Otherwise asks next question.
        Returns:
        {
          "isComplete": bool,
          "message": str (next follow-up question),
          "requirements": object (only if isComplete is True)
        }
        """
        if not self.client or settings.DEMO_MODE:
            logger.info("Claude not configured or DEMO_MODE=True. Running Mock Voice Conversational agent.")
            # Simple conversation rules
            turns = len(chat_history)
            if turns < 3:
                # We prompt for details
                questions = [
                    "What cloud provider do you prefer (Azure, AWS, GCP) and do you have any budget cap?",
                    "How many concurrent users or daily requests do you estimate, and what are your storage needs?",
                    "What specific compliance (like HIPAA, GDPR) or security standards must this solution meet?"
                ]
                return {
                    "isComplete": False,
                    "message": questions[turns % len(questions)],
                    "requirements": None
                }
            else:
                return {
                    "isComplete": True,
                    "message": "Requirements gathered successfully! Generating solution architecture...",
                    "requirements": {
                        "preferredCloud": "Azure",
                        "usersCount": 10000,
                        "storageGb": 500,
                        "compliance": ["GDPR", "SOC2"],
                        "modules": ["Authentication", "User Profile", "Core API", "Caching", "Report Exporter"],
                        "databaseType": "CosmosDB & Azure SQL",
                        "availability": "99.95% High Availability",
                        "security": "Active Directory, Encryption, Web Application Firewall",
                        "traffic": "Average 200 req/sec, Peak 1000 req/sec"
                    }
                }

        # Build Claude history
        claude_msgs = []
        for msg in chat_history:
            role = "user" if msg["role"] == "user" else "assistant"
            claude_msgs.append({"role": role, "content": msg["content"]})
        
        claude_msgs.append({"role": "user", "content": f"New transcript input: '{transcript}'. Analyze the conversation so far. If you have enough parameters, output a structured JSON inside <requirements> tags. Otherwise, output a friendly solution architect question asking for missing parameters (cloud provider, user count, budget, storage, database preference, compliance, traffic)." })

        try:
            message = await self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1500,
                system=SYSTEM_PROMPT,
                messages=claude_msgs
            )
            resp_text = message.content[0].text
            
            # Check if JSON block exists
            if "<requirements>" in resp_text:
                json_start = resp_text.find("<requirements>") + len("<requirements>")
                json_end = resp_text.find("</requirements>")
                json_str = resp_text[json_start:json_end].strip()
                reqs = json.loads(json_str)
                return {
                    "isComplete": True,
                    "message": "Requirements completed successfully!",
                    "requirements": reqs
                }
            else:
                return {
                    "isComplete": False,
                    "message": resp_text,
                    "requirements": None
                }
        except Exception as e:
            logger.error(f"Claude conversation failed: {e}")
            return {
                "isComplete": False,
                "message": "I apologize, I experienced a connection issue. Can you repeat your preferred cloud provider and database requirements?",
                "requirements": None
            }

    def _parse_json_from_text(self, text: str) -> Dict[str, Any]:
        try:
            # Look for ```json ``` blocks
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
            logger.warning(f"Could not parse JSON from output: {e}")
            # Safe basic schema extract
            return {
                "preferredCloud": "Azure",
                "usersCount": 5000,
                "storageGb": 100,
                "compliance": ["SOC2"],
                "modules": ["Auth", "Dashboard"],
                "databaseType": "PostgreSQL",
                "availability": "99.9%",
                "security": "TLS",
                "traffic": "Average"
            }

requirement_agent = RequirementAgent()
