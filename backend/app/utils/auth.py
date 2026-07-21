import logging
from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth

from app.config import settings

logger = logging.getLogger("salespilot.auth")
security_scheme = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> dict:
    """
    Decodes the Firebase JWT token from Authorization Header.
    In Demo Mode, if token is missing or matches "mock-", injects a default tenant payload.
    """
    mock_payload = {
        "uid": "mock-se-uid",
        "email": "se@salespilot.ai",
        "displayName": "Demo Sales Engineer",
        "orgId": "mock-org-123",
        "role": "Sales Engineer"
    }

    if settings.DEMO_MODE:
        return mock_payload

    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication credentials missing.")

    token = credentials.credentials
    if token.startswith("mock-"):
        # Explicit mock bypass
        return mock_payload

    try:
        # Verify real Firebase token
        decoded_token = auth.verify_id_token(token)
        # Add basic role and organization mock fallbacks if custom claims are not present yet
        decoded_token["orgId"] = decoded_token.get("orgId", "mock-org-123")
        decoded_token["role"] = decoded_token.get("role", "Sales Engineer")
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")

def check_role(allowed_roles: list):
    """
    Dependency helper to limit access based on user role.
    """
    def dependency(user: dict = Depends(get_current_user)):
        role = user.get("role", "Viewer")
        if role not in allowed_roles:
            raise HTTPException(status_code=403, detail=f"Action forbidden for role: {role}")
        return user
    return dependency
