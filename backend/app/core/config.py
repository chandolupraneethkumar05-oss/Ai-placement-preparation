import os
import secrets

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_SQLITE_PATH = os.path.join(BASE_DIR, "placement.db").replace("\\", "/")

# Environment
APP_ENV = os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "development")).lower()

# Database
raw_db_url = os.getenv('DATABASE_URL', f'sqlite:///{DEFAULT_SQLITE_PATH}')
if raw_db_url.startswith("postgres://"):
    raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
DATABASE_URL = raw_db_url

# Security & JWT
configured_secret = os.getenv('SECRET_KEY', '').strip()
if not configured_secret:
    if APP_ENV == "production":
        # In production, require an explicitly configured SECRET_KEY or generate a cryptographically strong one with warning
        configured_secret = secrets.token_hex(32)
        print("[SECURITY WARNING] SECRET_KEY not provided in production environment. Generated ephemeral 256-bit key.")
    else:
        configured_secret = "vfstr-hackathon-2026-super-secret-key-agentic-ai"

SECRET_KEY = configured_secret
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Role-Based Registration Protection Keys
ADMIN_INVITATION_KEY = os.getenv('ADMIN_INVITATION_KEY', 'VFSTR-ADMIN-SECURE-2026').strip()
RECRUITER_INVITATION_CODE = os.getenv('RECRUITER_INVITATION_CODE', 'VFSTR-RECRUIT-2026').strip().upper()

# Demo personas security gate
ENABLE_DEMO_LOGIN = os.getenv('ENABLE_DEMO_LOGIN', 'true').lower() in ('true', '1', 'yes')

# CORS
FRONTEND_URL = os.getenv('FRONTEND_URL', '*')

# AI Services
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '').strip()

# Email Service
RESEND_API_KEY = os.getenv('RESEND_API_KEY', '').strip()
EMAIL_FROM_ADDRESS = os.getenv('EMAIL_FROM_ADDRESS', 'VFSTR Placements <onboarding@resend.dev>').strip()
