import httpx
import logging
import json
from typing import Dict, Any, Optional
from app.database import cache
from app.config import settings

logger = logging.getLogger("salespilot.pricing")

# Offline fallback pricing database for typical Azure resources in USD
DEFAULT_PRICING_CATALOG = {
    # Compute: VMs (Price per hour)
    "compute/standard_b2s": 0.0416,
    "compute/standard_d2s_v3": 0.096,
    "compute/standard_d4s_v3": 0.192,
    "compute/standard_d8s_v3": 0.384,
    "compute/standard_f2s_v2": 0.084,
    # Databases: Azure SQL / Cosmos (Price per month / standard configuration)
    "database/azure_sql_basic": 15.00,
    "database/azure_sql_standard_s0": 15.00,
    "database/azure_sql_standard_s3": 150.00,
    "database/cosmos_db_standard": 24.00,
    "database/postgresql_flexible_burst": 25.00,
    # Storage (Price per GB per month)
    "storage/blob_hot_lrs": 0.0184,
    "storage/blob_cool_lrs": 0.01,
    "storage/disk_premium_p10": 19.71, # 128GB
    "storage/disk_standard_s10": 5.89,  # 128GB
    # Networking (Price per GB egress)
    "networking/egress_gb": 0.087,
    # Cache (Price per month)
    "cache/redis_basic_c0": 16.00,
    "cache/redis_standard_p1": 136.00,
}

class PricingService:
    def __init__(self):
        self.api_url = settings.AZURE_PRICING_API_URL

    async def get_azure_price(self, category: str, sku: str, region: str = "eastus") -> float:
        """
        Fetches live price from Azure Retail Pricing API.
        Caches results in Redis. Falls back to DEFAULT_PRICING_CATALOG if API fails or demo mode.
        """
        cache_key = f"azure_price:{category}:{sku}:{region}"
        
        # Check cache first
        if not settings.DEMO_MODE:
            try:
                cached_price = cache.get(cache_key)
                if cached_price is not None:
                    return float(cached_price)
            except Exception as e:
                logger.warning(f"Failed to read from cache: {e}")

        # In Demo Mode, use offline catalog immediately
        if settings.DEMO_MODE:
            catalog_key = f"{category}/{sku.lower()}"
            return DEFAULT_PRICING_CATALOG.get(catalog_key, 0.05)

        # Build Azure Pricing Query
        # Note: SKU filter is applied using armSkuName or skuName
        filter_str = f"armRegionName eq '{region}' and priceType eq 'Consumption'"
        if category == "compute":
            filter_str += f" and serviceName eq 'Virtual Machines' and armSkuName eq '{sku}'"
        elif category == "database":
            filter_str += f" and serviceName eq 'SQL Database' and skuName eq '{sku}'"
        elif category == "storage":
            filter_str += f" and serviceName eq 'Storage' and meterName eq '{sku}'"

        url = f"{self.api_url}?$filter={filter_str}"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=5.0)
                if response.status_code == 200:
                    data = response.json()
                    items = data.get("Items", [])
                    if items:
                        # Extract retail price from first matching item
                        price = float(items[0].get("retailPrice", 0.0))
                        
                        # Cache the value (expires in 12 hours)
                        try:
                            cache.setex(cache_key, 43200, str(price))
                        except Exception as ce:
                            logger.warning(f"Failed to write to cache: {ce}")
                            
                        return price
                    else:
                        logger.warning(f"SKU {sku} not found in region {region}. Falling back to default.")
                else:
                    logger.warning(f"Azure Pricing API returned status {response.status_code}. Falling back to default.")
        except Exception as e:
            logger.error(f"Error fetching Azure Price from API: {e}. Falling back to default.")

        # Final fallback to local defaults
        catalog_key = f"{category}/{sku.lower()}"
        return DEFAULT_PRICING_CATALOG.get(catalog_key, 0.05)

    async def calculate_infrastructure_cost(self, spec: Dict[str, Any], region: str = "eastus") -> Dict[str, Any]:
        """
        Calculates monthly and annual cost based on dynamic architecture specification.
        Spec structure:
        {
          "compute": {"sku": "Standard_D2s_v3", "quantity": 2},
          "database": {"sku": "azure_sql_standard_s3", "quantity": 1},
          "storage_gb": 500,
          "network_egress_gb": 1000,
          "cache": {"sku": "redis_basic_c0", "quantity": 1},
          "ai_credits_estimate": 1000000  # Estimate in Claude output tokens
        }
        """
        # 1. Compute Cost
        comp_sku = spec.get("compute", {}).get("sku", "standard_d2s_v3")
        comp_qty = spec.get("compute", {}).get("quantity", 1)
        comp_unit_price = await self.get_azure_price("compute", comp_sku, region)
        # VM is hourly, so Monthly cost = price * 730 hours * quantity
        monthly_compute = comp_unit_price * 730 * comp_qty

        # 2. Database Cost
        db_sku = spec.get("database", {}).get("sku", "azure_sql_standard_s0")
        db_qty = spec.get("database", {}).get("quantity", 1)
        # DB prices can be monthly or hourly. If it starts with standard or basic, treat as monthly standard catalog.
        db_price = await self.get_azure_price("database", db_sku, region)
        monthly_db = db_price * db_qty if db_price > 1.0 else db_price * 730 * db_qty

        # 3. Storage Cost (Blob Storage per GB)
        storage_gb = spec.get("storage_gb", 100)
        storage_unit_price = await self.get_azure_price("storage", "blob_hot_lrs", region)
        monthly_storage = storage_gb * storage_unit_price

        # 4. Networking Cost (Egress)
        egress_gb = spec.get("network_egress_gb", 100)
        egress_unit_price = await self.get_azure_price("networking", "egress_gb", region)
        monthly_network = egress_gb * egress_unit_price

        # 5. Cache Cost (Redis)
        cache_sku = spec.get("cache", {}).get("sku", "redis_basic_c0")
        cache_qty = spec.get("cache", {}).get("quantity", 1)
        cache_price = await self.get_azure_price("cache", cache_sku, region)
        monthly_cache = cache_price * cache_qty if cache_price > 1.0 else cache_price * 730 * cache_qty

        # 6. Backup Cost (estimate 20% of storage cost)
        monthly_backup = monthly_storage * 0.20

        # 7. AI API Cost (Claude tokens, $15 per million output tokens for Sonnet)
        ai_tokens = spec.get("ai_credits_estimate", 1000000)
        monthly_ai = (ai_tokens / 1000000) * 15.0

        # Totals
        total_monthly = (
            monthly_compute + 
            monthly_db + 
            monthly_storage + 
            monthly_network + 
            monthly_cache + 
            monthly_backup + 
            monthly_ai
        )

        return {
            "breakdown": {
                "compute": round(monthly_compute, 2),
                "database": round(monthly_db, 2),
                "storage": round(monthly_storage, 2),
                "networking": round(monthly_network, 2),
                "cache": round(monthly_cache, 2),
                "backup": round(monthly_backup, 2),
                "ai": round(monthly_ai, 2)
            },
            "monthlyTotal": round(total_monthly, 2),
            "annualTotal": round(total_monthly * 12, 2)
        }

pricing_service = PricingService()
