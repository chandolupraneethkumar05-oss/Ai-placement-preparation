import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_SQLITE_PATH = os.path.join(BASE_DIR, "placement.db").replace("\\", "/")

raw_db_url = os.getenv('DATABASE_URL', f'sqlite:///{DEFAULT_SQLITE_PATH}')
if raw_db_url.startswith("postgres://"):
    raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)

DATABASE_URL = raw_db_url
SECRET_KEY = os.getenv('SECRET_KEY', 'vfstr-hackathon-2026-super-secret-key-agentic-ai')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
FRONTEND_URL = os.getenv('FRONTEND_URL', '*')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '').strip()
