import os
from dotenv import load_dotenv

# Load local environment if present
load_dotenv()

class Settings:
    PORT: int = int(os.getenv("PORT", 8000))
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "true").lower() == "true"
    
    # Anthropic API Key
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    # Firebase Service Credentials
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "")
    FIREBASE_CLIENT_EMAIL: str = os.getenv("FIREBASE_CLIENT_EMAIL", "")
    FIREBASE_PRIVATE_KEY: str = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")
    FIREBASE_STORAGE_BUCKET: str = os.getenv("FIREBASE_STORAGE_BUCKET", "")
    
    # Redis configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    
    # Azure Retail Pricing API URL
    AZURE_PRICING_API_URL: str = os.getenv("AZURE_PRICING_API_URL", "https://prices.azure.com/api/retail/prices")

    @property
    def is_firebase_configured(self) -> bool:
        return bool(self.FIREBASE_PROJECT_ID and self.FIREBASE_CLIENT_EMAIL and self.FIREBASE_PRIVATE_KEY)

    @property
    def is_redis_configured(self) -> bool:
        return bool(self.REDIS_URL)

    @property
    def is_claude_configured(self) -> bool:
        return bool(self.ANTHROPIC_API_KEY)

settings = Settings()
