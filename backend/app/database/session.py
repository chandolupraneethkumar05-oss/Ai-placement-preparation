from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import DATABASE_URL, APP_ENV

is_sqlite = 'sqlite' in DATABASE_URL.lower()

engine_kwargs = {}
if is_sqlite:
    engine_kwargs["connect_args"] = {'check_same_thread': False}
else:
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_size": 10,
        "max_overflow": 20
    })
    # If using a remote/hosted PostgreSQL provider without explicit sslmode, mandate require
    if any(host in DATABASE_URL.lower() for host in ["render.com", "neon.tech", "supabase.co", "aws.com", "railway.app"]):
        if "sslmode" not in DATABASE_URL.lower():
            engine_kwargs["connect_args"] = {"sslmode": "require"}

try:
    engine = create_engine(DATABASE_URL, **engine_kwargs)
except Exception as e:
    print(f"[DATABASE INIT ERROR] Failed to create SQLAlchemy engine with URL '{DATABASE_URL}': {e}")
    raise

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if is_sqlite:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_database_health() -> dict:
    """
    Executes a live query to verify database connectivity and returns diagnostic information.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "connected": True,
            "engine": "sqlite" if is_sqlite else "postgresql",
            "url_scheme": DATABASE_URL.split("://")[0] if "://" in DATABASE_URL else "unknown"
        }
    except Exception as e:
        return {
            "connected": False,
            "engine": "sqlite" if is_sqlite else "postgresql",
            "error": str(e)
        }
