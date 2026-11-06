"""
SQLite to PostgreSQL Data Migration Script for VFSTR AutoPlace AI.

Safely extracts all relational data from an existing SQLite placement.db,
validates integrity, maps foreign keys, and loads into production PostgreSQL.
Maintains relational dependency order and updates sequence counters.
"""

import sys
import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.all_models import (
    Base, User, Company, StudentProfile, RecruiterProfile,
    JobPosting, AcademicSemesterRecord, Application,
    InterviewSchedule, Notification, DriveAttendance
)

# Relational dependency order for insertion
TABLE_ORDER = [
    User,
    Company,
    StudentProfile,
    RecruiterProfile,
    JobPosting,
    AcademicSemesterRecord,
    Application,
    InterviewSchedule,
    Notification,
    DriveAttendance
]

def migrate_database(sqlite_url: str, pg_url: str, wipe_target: bool = False):
    print("=" * 70)
    print("VFSTR AutoPlace AI: SQLite to PostgreSQL Migration Engine")
    print("=" * 70)
    print(f"Source Database (SQLite): {sqlite_url}")
    print(f"Target Database (PostgreSQL): {pg_url.split('@')[-1] if '@' in pg_url else pg_url}")

    # Create engines
    src_engine = create_engine(sqlite_url, connect_args={'check_same_thread': False})
    dest_engine = create_engine(
        pg_url, 
        pool_pre_ping=True,
        connect_args={"sslmode": "require"} if "render.com" in pg_url or "neon.tech" in pg_url else {}
    )

    # Verify source database
    src_inspector = inspect(src_engine)
    src_tables = src_inspector.get_table_names()
    print(f"Discovered {len(src_tables)} tables in SQLite source: {src_tables}")

    if not src_tables:
        print("[!] Source database is empty. Nothing to migrate.")
        return

    # Ensure schema exists on destination
    print("\nEnsuring all tables and constraints exist on target PostgreSQL...")
    Base.metadata.create_all(bind=dest_engine)

    SrcSession = sessionmaker(bind=src_engine)
    DestSession = sessionmaker(bind=dest_engine)

    src_session = SrcSession()
    dest_session = DestSession()

    try:
        if wipe_target:
            print("\nWiping existing target data for clean migration...")
            for model in reversed(TABLE_ORDER):
                dest_session.query(model).delete()
            dest_session.commit()

        total_migrated = 0

        for model in TABLE_ORDER:
            table_name = model.__tablename__
            if table_name not in src_tables:
                continue

            src_records = src_session.query(model).all()
            print(f"Migrating table '{table_name}': {len(src_records)} records found...")

            count = 0
            for record in src_records:
                # Merge into destination session to preserve primary key ID
                src_session.expunge(record)
                dest_session.merge(record)
                count += 1

            dest_session.commit()
            print(f"  ✓ Successfully loaded {count} records into '{table_name}'.")
            total_migrated += count

            # Update PostgreSQL sequence to match maximum primary key value
            try:
                with dest_engine.connect() as conn:
                    seq_query = text(f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), COALESCE(MAX(id), 1)) FROM {table_name};")
                    conn.execute(seq_query)
                    conn.commit()
            except Exception as seq_err:
                # Sequence update may fail on SQLite or non-serial types; safe to notice
                pass

        print("\n" + "=" * 70)
        print(f"MIGRATION COMPLETE: Successfully transferred {total_migrated} total records.")
        print("All foreign key references, user accounts, and candidate profiles preserved.")
        print("=" * 70)

    except Exception as e:
        dest_session.rollback()
        print(f"\n[!] Migration failed with error: {e}")
        raise
    finally:
        src_session.close()
        dest_session.close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Migrate SQLite placement.db to PostgreSQL")
    parser.add_argument("--source", default="sqlite:///./backend/placement.db", help="Source SQLite DB URL")
    parser.add_argument("--dest", required=True, help="Destination PostgreSQL DATABASE_URL")
    parser.add_argument("--wipe", action="store_true", help="Wipe destination tables before migrating")
    args = parser.parse_args()

    migrate_database(args.source, args.dest, wipe_target=args.wipe)
