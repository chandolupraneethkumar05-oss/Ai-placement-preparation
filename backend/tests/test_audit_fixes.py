import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.session import Base, get_db
from app.models.all_models import User, StudentProfile, Company, RecruiterProfile, JobPosting, Application, InterviewSchedule
from app.core.security import get_password_hash, create_access_token
from app.ai_engine.resume_extractor import ai_enhance_bullet, ai_generate_summary, calculate_ats_score
from app.ai_engine.venue_manager import check_slot_collision
from app.services.email_service import send_shortlist_email, send_interview_pass_email
from main import app

# In-memory SQLite for isolated test execution
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine_test = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine_test)
    db = TestingSessionLocal()
    
    # Seed minimal baseline for testing
    pw = get_password_hash("testpass123")
    admin_user = User(
        identifier="admin@vignan.ac.in",
        email="admin@vignan.ac.in",
        hashed_password=pw,
        role="admin",
        full_name="Admin Test"
    )
    db.add(admin_user)

    c1 = Company(name="Amazon", domain="amazon.com", is_verified=True)
    c2 = Company(name="TCS", domain="tcs.com", is_verified=True)
    c3 = Company(name="Infosys", domain="infosys.com", is_verified=True)
    c4 = Company(name="Cognizant", domain="cognizant.com", is_verified=False)
    db.add_all([c1, c2, c3, c4])
    db.commit()

    student_user = User(
        identifier="231FA05001",
        email="student@vignan.ac.in",
        hashed_password=pw,
        role="student",
        full_name="Student Test"
    )
    db.add(student_user)
    db.commit()

    student_prof = StudentProfile(
        user_id=student_user.id,
        reg_no="231FA05001",
        degree="B.Tech",
        branch="CSE",
        cgpa=8.5,
        active_backlogs=0,
        skills=["Python", "SQL", "FastAPI"],
        ats_score=85,
        target_role="Software Development Engineer (SDE)",
        placement_status="SHORTLISTED"
    )
    db.add(student_prof)

    rec_user = User(
        identifier="recruiter@amazon.com",
        email="recruiter@amazon.com",
        hashed_password=pw,
        role="recruiter",
        full_name="Amazon Recruiter"
    )
    db.add(rec_user)
    db.commit()

    rec_prof = RecruiterProfile(
        user_id=rec_user.id,
        company_id=c1.id,
        designation="Lead HR",
        official_email="recruiter@amazon.com",
        employee_id="AMZ-001",
        is_verified=True
    )
    db.add(rec_prof)
    db.commit()

    job = JobPosting(
        company_id=c1.id,
        recruiter_id=rec_prof.id,
        title="SDE-1",
        description="Core developer",
        job_type="Full-Time",
        ctc_lpa=32.0,
        min_cgpa=7.5,
        max_backlogs=0,
        eligible_branches_json='["CSE", "IT"]',
        required_skills_json='["Python", "SQL"]',
        eligible_years_json='[4]',
        status="ACTIVE"
    )
    db.add(job)
    db.commit()

    appl = Application(
        job_id=job.id,
        student_id=student_prof.id,
        match_score=90.0,
        is_eligible=True,
        status="Applied"
    )
    db.add(appl)
    db.commit()

    yield db
    db.close()
    Base.metadata.drop_all(bind=engine_test)

client = TestClient(app)

def test_admin_registration_blocked_without_secret_key():
    """Security Fix 2.4: Administrator registration must require authorized key."""
    res = client.post("/auth/register", json={
        "role": "admin",
        "identifier": "attacker@evil.com",
        "email": "attacker@evil.com",
        "password": "Password123!",
        "full_name": "Rogue Admin",
        "admin_invitation_key": "WRONG_KEY"
    })
    assert res.status_code == 403
    assert "Master Admin Key is required" in res.json()["detail"]

def test_recruiter_registration_blocked_without_invitation_code():
    """Security Fix 2.5: Corporate recruiter registration requires verified institutional invitation."""
    res = client.post("/auth/register", json={
        "role": "recruiter",
        "identifier": "unverified@company.com",
        "email": "unverified@company.com",
        "password": "Password123!",
        "full_name": "Fake Recruiter",
        "company_name": "Unknown Corp",
        "official_email": "unverified@company.com",
        "employee_id": "EMP-000",
        "invitation_code": "INVALID_CODE"
    })
    assert res.status_code == 403
    assert "Placement Invitation Code" in res.json()["detail"]

def test_shortlist_dispatches_email_notification():
    """User Issue 2: Candidate shortlist triggers real email dispatch and status update."""
    db = TestingSessionLocal()
    appl = db.query(Application).first()
    rec_user = db.query(User).filter(User.role == "recruiter").first()
    token = create_access_token({"sub": str(rec_user.id), "role": "recruiter", "email": rec_user.email})

    res = client.post(
        f"/recruiter/shortlist/{appl.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "shortlisted" in data["message"].lower()
    assert data["status"] == "Shortlisted (Slot Pending)"
    assert data["email_delivery"] in ["delivered", "simulated"]

    # Verify student application status in DB
    db.refresh(appl)
    assert appl.status == "Shortlisted (Slot Pending)"
    db.close()

def test_multidate_venue_collision_detection():
    """Phase 5: Slots on different dates at same time/room do NOT collide."""
    class MockSchedule:
        def __init__(self, block, chamber, date, time, student_id):
            self.block_name = block
            self.chamber_name = chamber
            self.slot_date = date
            self.slot_time = time
            self.student_id = student_id

    existing = [
        MockSchedule("A Block", "Chamber A-101", "2026-11-20", "10:00 AM - 10:30 AM", 1)
    ]

    # Same room, same time, DIFFERENT DATE -> NO COLLISION
    res_diff_date = check_slot_collision(
        existing_schedules=existing,
        block="A Block",
        chamber="Chamber A-101",
        slot_date="2026-11-21",
        slot_time="10:00 AM - 10:30 AM",
        student_id=2
    )
    assert res_diff_date["collision"] is False

    # Same room, same time, SAME DATE -> COLLISION
    res_same_date = check_slot_collision(
        existing_schedules=existing,
        block="A Block",
        chamber="Chamber A-101",
        slot_date="2026-11-20",
        slot_time="10:00 AM - 10:30 AM",
        student_id=2
    )
    assert res_same_date["collision"] is True
    assert "already booked on 2026-11-20" in res_same_date["reason"]

def test_resume_bullet_enhancer_never_invents_percentages():
    """Phase 3.1: Resume bullet enhancer rewrites active verbs without inventing metrics/percentages."""
    input_bullet = "Worked on python web application and managed database queries."
    enhanced = ai_enhance_bullet(input_bullet, target_role="Software Engineer")

    # Must improve professional wording
    enhanced_text = enhanced["enhanced"]
    assert len(enhanced_text) >= len(input_bullet)
    # Must NOT invent fake percentages like 40%, 94.2%, 99.8%
    assert "40%" not in enhanced_text
    assert "94.2%" not in enhanced_text
    assert "99.8%" not in enhanced_text

def test_dynamic_verified_companies_calculation():
    """User Issue 1: HOD/Dean portal displays true dynamic ratio (3 verified out of 4 total)."""
    db = TestingSessionLocal()
    admin_user = db.query(User).filter(User.role == "admin").first()
    token = create_access_token({"sub": str(admin_user.id), "role": "admin", "email": admin_user.email})

    res = client.get(
        "/admin/analytics",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_companies"] == 4
    assert data["verified_companies"] == 3
    db.close()

def test_admin_toggle_company_verification():
    """Admin can dynamically toggle accreditation for companies."""
    db = TestingSessionLocal()
    admin_user = db.query(User).filter(User.role == "admin").first()
    cognizant = db.query(Company).filter(Company.name == "Cognizant").first()
    assert cognizant.is_verified is False
    token = create_access_token({"sub": str(admin_user.id), "role": "admin", "email": admin_user.email})

    # Verify Cognizant
    res = client.post(
        f"/admin/verify-company/{cognizant.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    assert res.json()["is_verified"] is True

    # Check analytics now reflects 4/4 dynamically
    res_analytics = client.get(
        "/admin/analytics",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_analytics.json()["verified_companies"] == 4
    db.close()
