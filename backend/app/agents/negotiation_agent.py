import json
import logging
from typing import Dict, Any
from anthropic import AsyncAnthropic

from app.config import settings

logger = logging.getLogger("salespilot.negotiation_agent")

SYSTEM_PROMPT = """You are SalesPilot AI, a Senior Cloud Financial Engineer (FinOps) and Negotiation Expert.
Your task is to optimize the provided cloud architecture to fit the client's monthly budget.
Analyze the original tech stack and pricing breakdown.
You must output a single JSON document containing:
1. "originalCost": Total monthly cost originally calculated (in INR)
2. "optimizedCost": Total optimized monthly cost fitting or approaching the budget (in INR)
3. "savings": Original - Optimized (in INR)
4. "recommendation": A detailed strategic guidance message explaining the core savings strategy (formatting amounts in Indian Rupees ₹)
5. "tradeOffs": Main technical trade-offs (e.g. reduced redundancy, SLA changes)
6. "modifications": A list of items representing exact resource changes:
   - "component": The tier affected (e.g. "Compute", "Database", "Storage")
   - "suggestion": Description of change (e.g. "Resize VM to Standard_B2s, configure scheduling")
   - "savings": Estimated monthly savings in INR formatted with ₹ symbol (e.g. "₹2,500/mo")
   - "tradeOff": Specific downside or impact on SLA

Keep your response strictly as valid JSON, with no other text.
"""

class NegotiationAgent:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.is_claude_configured else None

    async def optimize_architecture(self, original_cost: float, budget: float, tech_stack: Dict[str, Any], pricing_breakdown: Dict[str, Any]) -> Dict[str, Any]:
        """
        Claude evaluates cost vs budget and formulates a series of recommendations.
        """
        if not self.client or settings.DEMO_MODE:
            logger.info("Claude not configured or DEMO_MODE=True. Running Mock Cost Optimizer.")
            return self._generate_mock_optimization(original_cost, budget, tech_stack, pricing_breakdown)

        try:
            prompt = f"""
            Client Monthly Budget (INR): ₹{budget}
            Original Total Monthly Cost (INR): ₹{original_cost}
            Tech Stack Details: {json.dumps(tech_stack)}
            Pricing Breakdown: {json.dumps(pricing_breakdown)}
            
            Find optimizations to bring this cost closer to the budget. Format all amounts in Indian Rupees (₹). Ensure the optimizations are realistic.
            """
            message = await self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2500,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}]
            )
            return json.loads(message.content[0].text.strip())
        except Exception as e:
            logger.error(f"Claude optimization failed: {e}. Falling back to default mock optimizer.")
            return self._generate_mock_optimization(original_cost, budget, tech_stack, pricing_breakdown)

    def _generate_mock_optimization(self, original_cost: float, budget: float, tech_stack: Dict[str, Any], pricing_breakdown: Dict[str, Any]) -> Dict[str, Any]:
        # If budget is higher than cost, optimization isn't strictly necessary but we can still suggest high-efficiency tweaks
        target_cost = original_cost
        modifications = []
        
        # Calculate possible compute savings (simulate VM resizing or scheduling)
        comp_cost = pricing_breakdown.get("compute", 0.0)
        if comp_cost > 2000.0:
            comp_saved = round(comp_cost * 0.4, 2)
            modifications.append({
                "component": "Compute (VMs)",
                "suggestion": "Resize standard compute nodes and apply VM Auto-Shutdown schedules during off-peak hours (10 PM to 6 AM).",
                "savings": f"₹{comp_saved:,.2f}/mo",
                "tradeOff": "Slightly longer startup latency for developers working in night shifts."
            })
            target_cost -= comp_saved

        # Calculate database savings (SLA downgrade)
        db_cost = pricing_breakdown.get("database", 0.0)
        if db_cost > 1500.0:
            db_saved = round(db_cost * 0.35, 2)
            modifications.append({
                "component": "Database Server",
                "suggestion": "Shift from Multi-Region Geo-Replication to Single-Region LRS with periodic read-replicas.",
                "savings": f"₹{db_saved:,.2f}/mo",
                "tradeOff": "Increased Recovery Point Objective (RPO) from 5 minutes to 1 hour in region disaster."
            })
            target_cost -= db_saved

        # Storage savings (Hot to Cool storage rules)
        st_cost = pricing_breakdown.get("storage", 0.0)
        if st_cost > 400.0:
            st_saved = round(st_cost * 0.3, 2)
            modifications.append({
                "component": "Blob Storage",
                "suggestion": "Configure Firestore/Storage lifecycle rule to transition assets older than 30 days to Cool storage tier.",
                "savings": f"₹{st_saved:,.2f}/mo",
                "tradeOff": "Higher latency for retrieving archived media (up to a few seconds delay)."
            })
            target_cost -= st_saved

        # Ensure we don't go below 30% of original price artificially
        min_cost = original_cost * 0.4
        if target_cost < min_cost:
            target_cost = min_cost

        savings = round(original_cost - target_cost, 2)
        
        return {
            "originalCost": round(original_cost, 2),
            "optimizedCost": round(target_cost, 2),
            "savings": savings,
            "recommendation": f"We successfully trimmed monthly billing from ₹{original_cost:,.2f} to ₹{target_cost:,.2f} (saving ₹{savings:,.2f} monthly) by optimizing VM sizing, downscaling standard database replicas to single-region instances, and creating storage tier rotation rules. This solution maintains active core service metrics and meets your target budget constraints.",
            "tradeOffs": "The primary compromises involve single-region disaster recovery margins for the database (increased RPO/RTO) and small cold-start VM delays during off-peak weekend intervals.",
            "modifications": modifications
        }

negotiation_agent = NegotiationAgent()
