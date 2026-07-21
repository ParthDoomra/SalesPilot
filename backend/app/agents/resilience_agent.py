import json
import logging
from typing import Dict, Any, List
from anthropic import AsyncAnthropic

from app.config import settings

logger = logging.getLogger("salespilot.resilience_agent")

SYSTEM_PROMPT = """You are SalesPilot AI, a Principal Reliability Engineer (SRE) and Chaos Architect.
Your task is to run disaster simulation audits on the provided Cloud architecture.
Analyze the tech stack and database setup.
You must output a single JSON document containing:
1. "score": Overall Resilience Score (0-100) based on configuration safety.
2. "risks": A list of top identified failure points.
3. "scenarios": A list of exactly 6 disaster scenarios simulated, including:
   - "name": Scenario title (e.g. "Primary Cloud Region Outage", "Database Corruption", "VM Crash", "Traffic Spike", "DDoS Attack", "Backup Service Failure")
   - "impact": Qualitative operational business impact description
   - "rto": Recovery Time Objective (e.g. "5 minutes", "2 hours", "Instantaneous")
   - "rpo": Recovery Point Objective (e.g. "1 hour", "5 minutes", "None (Zero data loss)")
   - "recoveryCost": Estimated manual engineering hours or pricing cost to recover
   - "riskLevel": Risk severity ("Low" | "Medium" | "High" | "Critical")
   - "recoveryPlan": Structured SRE action plan to recover normal operations.

Keep your response strictly as valid JSON, with no other text.
"""

class ResilienceAgent:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.is_claude_configured else None

    async def simulate_failures(self, tech_stack: Dict[str, Any], database_type: str) -> Dict[str, Any]:
        """
        Claude simulates failures and scores the architectural resilience.
        """
        if not self.client or settings.DEMO_MODE:
            logger.info("Claude not configured or DEMO_MODE=True. Running Mock Resilience Simulation.")
            return self._generate_mock_simulations(tech_stack, database_type)

        try:
            prompt = f"""
            Architecture Tech Stack: {json.dumps(tech_stack)}
            Database Setup: {database_type}
            
            Simulate the 6 disaster types and calculate resilience score. Output strict JSON.
            """
            message = await self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2500,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}]
            )
            return json.loads(message.content[0].text.strip())
        except Exception as e:
            logger.error(f"Claude resilience simulation failed: {e}. Falling back to default mock simulator.")
            return self._generate_mock_simulations(tech_stack, database_type)

    def _generate_mock_simulations(self, tech_stack: Dict[str, Any], database_type: str) -> Dict[str, Any]:
        # Resilience scoring logic based on database redundancy and service coverage
        db_service = tech_stack.get("database", {}).get("service", "").lower()
        has_cdn = "cdn" in tech_stack
        has_cache = "cache" in tech_stack
        
        score = 75
        if "geo" in db_service or "replica" in db_service:
            score += 15
        if has_cdn:
            score += 5
        if has_cache:
            score += 5
            
        score = min(score, 100)
        
        scenarios = [
            {
                "name": "Azure Region Failure",
                "impact": "Complete service blackout for all region-bound clients.",
                "rto": "15 minutes" if score > 85 else "4 hours",
                "rpo": "5 minutes" if score > 85 else "1 hour",
                "recoveryCost": "$500 (Traffic DNS failover)",
                "riskLevel": "Low" if score > 85 else "High",
                "recoveryPlan": "Trigger automatic DNS failover in Azure Front Door to secondary paired region. Re-route database connection strings to the read-replica."
            },
            {
                "name": "Database Failure / Corruption",
                "impact": "Core write operations halt, leading to partial service outage.",
                "rto": "10 minutes" if score > 80 else "2 hours",
                "rpo": "1 minute" if score > 80 else "1 hour",
                "recoveryCost": "$300 (Restore tasks)",
                "riskLevel": "Medium",
                "recoveryPlan": "Initiate automated Point-in-Time Restore (PITR) to restore database state immediately prior to corruption event."
            },
            {
                "name": "VM Crash (Compute Outage)",
                "impact": "Temporary server errors (HTTP 502/503) for active users.",
                "rto": "2 minutes",
                "rpo": "None (Zero data loss)",
                "recoveryCost": "$0 (Auto-healed)",
                "riskLevel": "Low",
                "recoveryPlan": "Virtual Machine scale sets detect unhealthy nodes, automatically terminate them, and spin up fresh container instances behind the load balancer."
            },
            {
                "name": "Traffic Spike (Slashdot Effect)",
                "impact": "Slow API responses, database resource locking.",
                "rto": "5 minutes",
                "rpo": "None",
                "recoveryCost": "$100 (Dynamic scale up)",
                "riskLevel": "Medium",
                "recoveryPlan": "Autoscaling rules trigger compute additions when CPU hits 75%. Redis cache acts as a buffer for read requests."
            },
            {
                "name": "DDoS Attack",
                "impact": "Exhausted network bandwidth, denying entry to users.",
                "rto": "Instantaneous protection",
                "rpo": "None",
                "recoveryCost": "$0 (Managed shield)",
                "riskLevel": "Low" if has_cdn else "Critical",
                "recoveryPlan": "Azure DDoS Protection Standard / WAF filters malicious IP subnet headers and caps rate-limits at the edge."
            },
            {
                "name": "Backup Service Failure",
                "impact": "Risk of permanent data loss in future disasters, SLA violations.",
                "rto": "1 day to resolve backup pipelines",
                "rpo": "None (For current state)",
                "recoveryCost": "$200 (DevOps hours)",
                "riskLevel": "Medium",
                "recoveryPlan": "Trigger DevOps alerts to debug failing snapshot cron jobs and store manual emergency backups to a secondary cold Blob container."
            }
        ]

        risks = [
            "Single-point database outage" if score <= 75 else "Slight cross-region replication latency",
            "Missing multi-zone compute redundancy if VM scale set is single-region",
            "Slow data sync during peak cache misses"
        ]

        return {
            "score": score,
            "risks": risks,
            "scenarios": scenarios
        }

resilience_agent = ResilienceAgent()
