import json
import logging
from typing import Dict, Any
from anthropic import AsyncAnthropic

from app.config import settings

logger = logging.getLogger("salespilot.architect_agent")

SYSTEM_PROMPT = """You are SalesPilot AI, a legendary Solution Architect.
Your task is to take a structured requirements JSON and design an enterprise-grade cloud architecture.
You must output a single JSON document containing:
1. "techStack": An object where keys are components (frontend, backend, database, authentication, apiGateway, cache, queue, cdn, monitoring, cicd, deployment) and values contain:
   - "service": Specific cloud service name (e.g. "Azure App Service", "Azure SQL Database Standard S3", "Azure Blob Storage")
   - "rationale": Clear enterprise-grade business/technical justification
2. "pricingSpec": An object specifying parameters for the cost calculator:
   - "compute": {"sku": "standard_d2s_v3", "quantity": 2}
   - "database": {"sku": "azure_sql_standard_s0", "quantity": 1}
   - "storage_gb": 200
   - "network_egress_gb": 500
   - "cache": {"sku": "redis_basic_c0", "quantity": 1}
   - "ai_credits_estimate": 1000000
3. "diagramMetadata": A representation of the flow (nodes and edges) for drawing the diagram in the UI.

Keep your response strictly as valid JSON, with no other text.
"""

class ArchitectAgent:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.is_claude_configured else None

    async def generate_architecture(self, reqs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Translates requirements into a cloud architecture design.
        """
        if not self.client or settings.DEMO_MODE:
            logger.info("Claude not configured or DEMO_MODE=True. Running Mock Architecture Generation.")
            return self._generate_mock_architecture(reqs)

        try:
            message = await self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=3000,
                system=SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": f"Create an enterprise cloud architecture based on this requirements JSON:\n{json.dumps(reqs)}"}
                ]
            )
            return json.loads(message.content[0].text.strip())
        except Exception as e:
            logger.error(f"Claude architecture generation failed: {e}. Falling back to default mock architect.")
            return self._generate_mock_architecture(reqs)

    def _generate_mock_architecture(self, reqs: Dict[str, Any]) -> Dict[str, Any]:
        users = reqs.get("usersCount", 5000)
        storage_gb = reqs.get("storageGb", 100)
        cloud = reqs.get("preferredCloud", "Azure")
        
        # Scaling tier calculations
        if users < 5000:
            vm_sku = "standard_b2s"
            db_sku = "azure_sql_basic"
            vm_qty = 1
            cache_qty = 1
        elif users < 50000:
            vm_sku = "standard_d2s_v3"
            db_sku = "azure_sql_standard_s3"
            vm_qty = 2
            cache_qty = 1
        else:
            vm_sku = "standard_d4s_v3"
            db_sku = "azure_sql_standard_s3"
            vm_qty = 4
            cache_qty = 2

        # Service names mapping based on Cloud choice
        p = "Azure" if cloud.lower() in ["azure", "microsoft"] else "AWS" if cloud.lower() in ["aws", "amazon"] else "GCP"
        
        tech_stack = {
            "frontend": {
                "service": "Next.js on Vercel Enterprise" if p == "Azure" else f"{p} S3 + CloudFront CDN",
                "rationale": "Enables lightning-fast page loading with Server-Side Rendering (SSR) and edge deployment."
            },
            "backend": {
                "service": f"{p} App Service / Elastic Beanstalk" if p != "GCP" else "Google Cloud Run",
                "rationale": "Stateless container hosting with auto-scaling to absorb peak request traffic seamlessly."
            },
            "database": {
                "service": "Azure SQL Database Standard" if p == "Azure" else "Amazon RDS PostgreSQL" if p == "AWS" else "Google Cloud SQL",
                "rationale": "ACID compliance for critical transactions, with built-in point-in-time backups."
            },
            "authentication": {
                "service": "Firebase Authentication",
                "rationale": "Enterprise-grade federated identity management, multi-factor login support, and seamless scaling."
            },
            "apiGateway": {
                "service": f"{p} API Management" if p == "Azure" else f"{p} API Gateway",
                "rationale": "Unified entry point for API routing, SSL termination, and rate-limiting enforcement."
            },
            "cache": {
                "service": f"Azure Cache for Redis" if p == "Azure" else "Amazon ElastiCache Redis" if p == "AWS" else "Cloud Memorystore",
                "rationale": "Sub-millisecond latency caching for hot session data and frequent database read queries."
            },
            "queue": {
                "service": f"{p} Service Bus / SQS / PubSub",
                "rationale": "Decouples backend components, managing spikes in asynchronous file or image tasks."
            },
            "cdn": {
                "service": f"{p} Front Door / CloudFront / Cloud CDN",
                "rationale": "Global edge network acceleration, protecting against DDoS and reducing load latency."
            },
            "monitoring": {
                "service": f"Azure Application Insights" if p == "Azure" else "AWS CloudWatch + X-Ray",
                "rationale": "Comprehensive application performance monitoring (APM), telemetry dashboards, and alerts."
            },
            "cicd": {
                "service": "GitHub Actions Enterprise",
                "rationale": "Automated pipelines ensuring continuous linting, building, test running, and blue-green deployments."
            },
            "deployment": {
                "service": "Infrastructure as Code (IaC) via Terraform",
                "rationale": "Declarative multi-environment infrastructure tracking, eliminating environment drift."
            }
        }
        
        pricing_spec = {
            "compute": {"sku": vm_sku, "quantity": vm_qty},
            "database": {"sku": db_sku, "quantity": 1},
            "storage_gb": storage_gb,
            "network_egress_gb": int(users * 0.1),
            "cache": {"sku": "redis_basic_c0", "quantity": cache_qty},
            "ai_credits_estimate": 1000000
        }

        # Diagram nodes & edges metadata
        nodes = [
            {"id": "client", "type": "input", "label": "Client Browser (Next.js)"},
            {"id": "cdn", "type": "default", "label": "Global CDN / WAF"},
            {"id": "gateway", "type": "default", "label": "API Gateway"},
            {"id": "backend", "type": "default", "label": "Backend API Containers"},
            {"id": "cache", "type": "default", "label": "Redis Cache Server"},
            {"id": "db", "type": "output", "label": "Primary Database Server"},
            {"id": "storage", "type": "output", "label": "Blob Storage Bucket"}
        ]
        
        edges = [
            {"id": "e1", "source": "client", "target": "cdn", "animated": True},
            {"id": "e2", "source": "cdn", "target": "gateway", "animated": True},
            {"id": "e3", "source": "gateway", "target": "backend", "animated": True},
            {"id": "e4", "source": "backend", "target": "cache"},
            {"id": "e5", "source": "backend", "target": "db"},
            {"id": "e6", "source": "backend", "target": "storage"}
        ]

        return {
            "techStack": tech_stack,
            "pricingSpec": pricing_spec,
            "diagramMetadata": {
                "nodes": nodes,
                "edges": edges
            }
        }

architect_agent = ArchitectAgent()
