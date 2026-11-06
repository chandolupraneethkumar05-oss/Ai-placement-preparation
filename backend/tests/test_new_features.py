import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.session import Base, get_db
from app.models.all_models import (
    User, StudentProfile, Company, RecruiterProfile, JobPosting, 
    Application, InterviewSchedule, Notification, AcademicSemesterRecord, DriveAttendance
)
from app.core.security import get_password_hash, create_access_token
from main import app

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

@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine_test)
    app.dependency_overrides[get_db] = override_get_db
    db = TestingSessionLocal()
    pw = get_password_hash("testpass123")

    admin = User(identifier="dean@vignan.ac.in", email="dean@vignan.ac.in", hashed_password=pw, role="admin", full_name="Dean Placements")
    db.add(admin)

    # Active MOU Company
    c_amz = Company(
        name="Amazon",
        domain="amazon.com",
        is_verified=True,
        mou_reference_no="VFSTR-MOU-AMZ-2024",
        mou_valid_from="2024-06-01",
        mou_valid_till="2027-05-31",
        mou_status="ACTIVE"
    )
    # Expired MOU Company
    c_cts = Company(
        name="Cognizant",
        domain="cognizant.com",
        is_verified=False,
        mou_reference_no="VFSTR-MOU-CTS-2021",
        mou_valid_from="2021-05-01",
        mou_valid_till="2024-04-30",
        mou_status="EXPIRED"
    )
    db.add_all([c_amz, c_cts])
    db.commit()

    # Recruiter Profile for Amazon
    r_user = User(identifier="rec@amazon.com", email="rec@amazon.com", hashed_password=pw, role="recruiter", full_name="Amazon Recruiter")
    db.add(r_user)
    db.commit()
    r_prof = RecruiterProfile(user_id=r_user.id, company_id=c_amz.id, designation="Lead HR", employee_id="AMZ-01", is_verified=True)
    db.add(r_prof)

    # Recruiter Profile for Cognizant
    cts_user = User(identifier="rec@cognizant.com", email="rec@cognizant.com", hashed_password=pw, role="recruiter", full_name="Cognizant Recruiter")
    db.add(cts_user)
    db.commit()
    cts_prof = RecruiterProfile(user_id=cts_user.id, company_id=c_cts.id, designation="HR Lead", employee_id="CTS-01", is_verified=False)
    db.add(cts_prof)

    # Student Profile
    s_user = User(identifier="231FA05001", email="student@vignan.ac.in", hashed_password=pw, role="student", full_name="Rahul Test")
    db.add(s_user)
    db.commit()

    s_prof = StudentProfile(
        user_id=s_user.id,
        reg_no="231FA05001",
        degree="B.Tech",
        branch="CSE",
        cgpa=8.8,
        active_backlogs=0,
        skills=["Python", "SQL", "FastAPI"],
        ats_score=85,
        target_role="Software Development Engineer (SDE)",
        honors_json='["Dean\'s Merit Scholar"]',
        certifications_json='["AWS Certified Cloud Practitioner"]'
    )
    db.add(s_prof)
    db.commit()

    # Academic Semesters for Student
    for sem in range(1, 7):
        rec = AcademicSemesterRecord(
            student_id=s_prof.id,
            semester_num=sem,
            sgpa=8.5 + (sem * 0.05),
            cgpa_at_sem=8.5 + (sem * 0.04),
            credits_earned=22,
            backlogs_in_sem=1 if sem == 3 else 0,
            is_cleared=True,
            cleared_date="Nov 2024 (Supplementary Exam)" if sem == 3 else None
        )
        db.add(rec)

    # Active Job
    job = JobPosting(
        company_id=c_amz.id,
        recruiter_id=r_prof.id,
        title="SDE-1",
        description="Backend & Distributed Systems",
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

    # Application & Confirmed Slot
    appl = Application(
        job_id=job.id,
        student_id=s_prof.id,
        match_score=90,
        is_eligible=True,
        status="Shortlisted (Slot Confirmed)"
    )
    db.add(appl)
    db.commit()

    slot = InterviewSchedule(
        application_id=appl.id,
        job_id=job.id,
        student_id=s_prof.id,
        block_name="A Block",
        chamber_name="Chamber A-204",
        slot_date="2026-11-20",
        slot_time="10:30 AM - 11:00 AM",
        panel_name="Panel 1",
        status="CONFIRMED"
    )
    db.add(slot)

    # Notification
    notif = Notification(user_id=s_user.id, title="Test Notif", message="Test message", is_read=False)
    db.add(notif)
    db.commit()

    yield db
    db.close()
    Base.metadata.drop_all(bind=engine_test)
    app.dependency_overrides.pop(get_db, None)

client = TestClient(app)

def test_auth_me_session_rehydration():
    """Verify /auth/me decodes bearer token and restores full student session."""
    db = TestingSessionLocal()
    s_user = db.query(User).filter(User.role == "student").first()
    token = create_access_token({"sub": str(s_user.id), "role": "student", "identifier": s_user.identifier})

    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "student"
    assert data["reg_no"] == "231FA05001"
    assert data["branch"] == "CSE"
    assert "4th Year" in data["year"]
    db.close()

def test_notifications_lifecycle():
    """Verify fetching and dismissing real in-app notifications."""
    db = TestingSessionLocal()
    s_user = db.query(User).filter(User.role == "student").first()
    token = create_access_token({"sub": str(s_user.id), "role": "student", "identifier": s_user.identifier})

    # Fetch notifications
    res = client.get("/auth/notifications", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert data[0]["title"] == "Test Notif"
    assert data[0]["is_read"] is False

    # Dismiss all
    res_dismiss = client.post("/auth/notifications/dismiss-all", headers={"Authorization": f"Bearer {token}"})
    assert res_dismiss.status_code == 200

    # Verify marked as read in DB
    n = db.query(Notification).filter(Notification.user_id == s_user.id).first()
    assert n.is_read is True
    db.close()

def test_hall_ticket_and_shortlisted_interviews_attribute_fix():
    """Verify app.interview_slot fix prevents AttributeError on hall ticket and shortlisted interviews."""
    db = TestingSessionLocal()
    s_prof = db.query(StudentProfile).first()
    appl = db.query(Application).first()
    s_token = create_access_token({"sub": str(s_prof.user_id), "role": "student", "identifier": s_prof.reg_no})
    s_headers = {"Authorization": f"Bearer {s_token}"}

    # Shortlisted Interviews
    res_interviews = client.get(f"/student/shortlisted-interviews/{s_prof.id}", headers=s_headers)
    assert res_interviews.status_code == 200
    data_interviews = res_interviews.json()
    assert len(data_interviews) == 1
    assert data_interviews[0]["interview_slot"]["chamber"] == "Chamber A-204"

    # Hall Ticket
    res_ticket = client.get(f"/student/hall-ticket/{s_prof.id}/{appl.id}", headers=s_headers)
    assert res_ticket.status_code == 200
    ticket = res_ticket.json()
    assert "OFFICIAL PLACEMENT INTERVIEW HALL TICKET" in ticket["document_title"]
    assert ticket["chamber"] == "Chamber A-204"
    assert "VFSTR-231FA05001" in ticket["verification_hash"]
    db.close()

def test_recruiter_post_job_sets_pending_dean_approval():
    """Verify recruiter-posted drive defaults to PENDING_DEAN_APPROVAL for MOU compliance review."""
    db = TestingSessionLocal()
    r_prof = db.query(RecruiterProfile).first()
    r_user = db.query(User).filter(User.id == r_prof.user_id).first()
    token = create_access_token({"sub": str(r_user.id), "role": "recruiter", "identifier": r_user.identifier})

    res = client.post(
        f"/recruiter/jobs/{r_prof.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Cloud Architect",
            "description": "AWS Systems",
            "ctc_lpa": 28.0,
            "min_cgpa": 7.0,
            "required_skills": ["AWS", "Python"],
            "eligible_branches": ["CSE", "IT"],
            "eligible_years": [4]
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "PENDING_DEAN_APPROVAL"

    # Verify drive is in Dean's pending queue
    admin_user = db.query(User).filter(User.role == "admin").first()
    admin_token = create_access_token({"sub": str(admin_user.id), "role": "admin", "identifier": admin_user.identifier})
    res_pending = client.get("/admin/pending-drives", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_pending.status_code == 200
    pending_list = res_pending.json()
    cloud_drive = next((d for d in pending_list if d["title"] == "Cloud Architect"), None)
    assert cloud_drive is not None
    assert cloud_drive["mou_status"] == "ACTIVE"
    db.close()

def test_dean_approves_active_mou_drive():
    """Dean approves pending drive from active MOU partner and releases it to ACTIVE."""
    db = TestingSessionLocal()
    r_prof = db.query(RecruiterProfile).first()
    pending_job = JobPosting(
        company_id=r_prof.company_id,
        recruiter_id=r_prof.id,
        title="Frontend Specialist",
        description="React UI",
        ctc_lpa=14.0,
        min_cgpa=6.5,
        max_backlogs=0,
        eligible_branches_json='["CSE", "IT"]',
        required_skills_json='["React"]',
        eligible_years_json='[4]',
        status="PENDING_DEAN_APPROVAL"
    )
    db.add(pending_job)
    db.commit()

    admin_user = db.query(User).filter(User.role == "admin").first()
    admin_token = create_access_token({"sub": str(admin_user.id), "role": "admin", "identifier": admin_user.identifier})
    res_approve = client.post(f"/admin/approve-drive/{pending_job.id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_approve.status_code == 200
    assert res_approve.json()["status"] == "ACTIVE"

    db.refresh(pending_job)
    assert pending_job.status == "ACTIVE"
    db.close()

def test_dean_renews_expired_mou_and_approves_drive():
    """Dean exercises 'Renew MOU & Approve Drive' for company with expired MOU."""
    db = TestingSessionLocal()
    cts = db.query(Company).filter(Company.name == "Cognizant").first()
    assert cts.mou_status == "EXPIRED"

    cts_job = JobPosting(
        company_id=cts.id,
        title="GenC Pro",
        description="Enterprise Java",
        ctc_lpa=8.0,
        min_cgpa=6.5,
        max_backlogs=0,
        eligible_branches_json='["CSE"]',
        required_skills_json='["Java"]',
        eligible_years_json='[4]',
        status="PENDING_DEAN_APPROVAL"
    )
    db.add(cts_job)
    db.commit()

    admin_user = db.query(User).filter(User.role == "admin").first()
    admin_token = create_access_token({"sub": str(admin_user.id), "role": "admin", "identifier": admin_user.identifier})
    res_renew = client.post(
        f"/admin/renew-mou-and-approve/{cts_job.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"extension_years": 3}
    )
    assert res_renew.status_code == 200
    data = res_renew.json()
    assert data["mou_status"] == "ACTIVE"
    assert "2029" in data["mou_valid_till"]
    assert data["status"] == "ACTIVE"

    db.refresh(cts)
    assert cts.mou_status == "ACTIVE"
    assert cts.is_verified is True
    db.close()

def test_recruiter_student_academic_dossier():
    """Recruiter views comprehensive semester-by-semester SGPA ledger and backlogs for candidate."""
    db = TestingSessionLocal()
    s_prof = db.query(StudentProfile).first()
    rec_user = db.query(User).filter(User.role == "recruiter").first()
    rec_token = create_access_token({"sub": str(rec_user.id), "role": "recruiter", "identifier": rec_user.identifier})

    res = client.get(f"/recruiter/student-dossier/{s_prof.id}", headers={"Authorization": f"Bearer {rec_token}"})
    assert res.status_code == 200
    dossier = res.json()
    assert dossier["reg_no"] == "231FA05001"
    assert dossier["overall_cgpa"] == 8.8
    assert len(dossier["semester_progression"]) == 6
    assert dossier["semester_progression"][2]["semester_num"] == 3
    assert dossier["semester_progression"][2]["backlogs_in_sem"] == 1
    assert "Supplementary" in dossier["semester_progression"][2]["cleared_date"]
    assert len(dossier["honors"]) > 0
    assert len(dossier["certifications"]) > 0
    db.close()

def test_recruiter_auto_schedule_batch():
    """Smart Batch Auto-Scheduler allocates candidates across panels with zero collisions."""
    db = TestingSessionLocal()
    job = db.query(JobPosting).filter(JobPosting.status == "ACTIVE").first()
    s_prof = db.query(StudentProfile).first()

    # Create additional student and application
    pw = get_password_hash("pass")
    s2_user = User(identifier="231FA05002", email="s2@vignan.ac.in", hashed_password=pw, role="student", full_name="Student Two")
    db.add(s2_user)
    db.commit()
    s2_prof = StudentProfile(user_id=s2_user.id, reg_no="231FA05002", degree="B.Tech", branch="CSE", cgpa=8.2)
    db.add(s2_prof)
    db.commit()

    app2 = Application(job_id=job.id, student_id=s2_prof.id, status="Shortlisted (Slot Pending)")
    db.add(app2)
    db.commit()

    rec_user = job.recruiter.user
    rec_token = create_access_token({"sub": str(rec_user.id), "role": "recruiter", "identifier": rec_user.identifier})

    res_batch = client.post(f"/recruiter/auto-schedule-batch/{job.id}", headers={"Authorization": f"Bearer {rec_token}"})
    assert res_batch.status_code == 200
    data = res_batch.json()
    assert data["scheduled_count"] >= 1

    # Verify both are scheduled with CONFIRMED slots in DB
    db.refresh(app2)
    assert app2.status == "Shortlisted (Slot Confirmed)"
    assert app2.interview_slot is not None
    db.close()
