import json
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    identifier = Column(String(120), unique=True, index=True, nullable=False) # reg_no for student, email for recruiter/admin
    email = Column(String(120), index=True, nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # 'student', 'recruiter', 'admin'
    full_name = Column(String(120), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)
    recruiter_profile = relationship("RecruiterProfile", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user")

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    reg_no = Column(String(30), unique=True, index=True, nullable=False) # e.g. 211FA05001
    degree = Column(String(20), default="B.Tech") # 'B.Tech' (4 years), 'M.Tech' (2 years)
    duration_years = Column(Integer, default=4)
    start_year = Column(Integer, default=2024)
    end_year = Column(Integer, default=2028)
    branch = Column(String(20), nullable=False) # 'CSE', 'ECE', 'AI_DS', 'IT'
    cgpa = Column(Float, nullable=False)
    active_backlogs = Column(Integer, default=0)
    skills_json = Column(Text, default="[]")
    target_role = Column(String(80), default="")
    target_company = Column(String(80), default="")
    resume_text = Column(Text, default="")
    ats_score = Column(Integer, default=0)
    ats_feedback_json = Column(Text, default="[]")
    resume_builder_json = Column(Text, default="{}")
    selected_template = Column(String(50), default="gengar")
    accent_color = Column(String(30), default="#d32f2f")
    placement_status = Column(String(30), default="UNPLACED") # 'UNPLACED', 'TIER_1', 'TIER_2'
    honors_json = Column(Text, default='["Dean\'s Merit Scholar"]')
    certifications_json = Column(Text, default='["AWS Certified Cloud Practitioner", "Oracle Certified Java Associate"]')
    publications_json = Column(Text, default='[]')
    is_profile_frozen = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="student_profile")
    applications = relationship("Application", back_populates="student", cascade="all, delete-orphan")
    interview_slots = relationship("InterviewSchedule", back_populates="student", cascade="all, delete-orphan")
    semester_records = relationship("AcademicSemesterRecord", back_populates="student", cascade="all, delete-orphan", order_by="AcademicSemesterRecord.semester_num")
    attendances = relationship("DriveAttendance", back_populates="student", cascade="all, delete-orphan")

    @property
    def skills(self):
        try:
            return json.loads(self.skills_json) if self.skills_json else []
        except:
            return []

    @skills.setter
    def skills(self, val):
        self.skills_json = json.dumps(val)

    @property
    def honors(self):
        try:
            return json.loads(self.honors_json) if self.honors_json else []
        except:
            return []

    @property
    def certifications(self):
        try:
            return json.loads(self.certifications_json) if self.certifications_json else []
        except:
            return []

class AcademicSemesterRecord(Base):
    __tablename__ = "academic_semester_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    semester_num = Column(Integer, nullable=False) # 1 to 8
    sgpa = Column(Float, nullable=False)
    cgpa_at_sem = Column(Float, nullable=False)
    credits_earned = Column(Integer, default=22)
    backlogs_in_sem = Column(Integer, default=0)
    backlog_subjects_json = Column(Text, default="[]") # e.g. ["22CS301 Compiler Design"]
    is_cleared = Column(Boolean, default=True)
    cleared_date = Column(String(60), nullable=True) # e.g. 'Nov 2024 (Supplementary Exam)'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    student = relationship("StudentProfile", back_populates="semester_records")

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, nullable=False)
    website = Column(String(200), nullable=True)
    domain = Column(String(80), nullable=True)
    description = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=True)
    registration_id = Column(String(80), nullable=True)
    
    # Institutional Memorandum of Understanding (MOU) Fields
    mou_reference_no = Column(String(80), nullable=True, default="VFSTR-MOU-GEN-2024")
    mou_valid_from = Column(String(30), nullable=True, default="2024-06-01")
    mou_valid_till = Column(String(30), nullable=True, default="2027-05-31")
    mou_category = Column(String(100), default="Tier-1 Campus Recruitment & Internship")
    mou_status = Column(String(30), default="ACTIVE") # 'ACTIVE', 'EXPIRED', 'PENDING_RENEWAL'
    mou_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    recruiters = relationship("RecruiterProfile", back_populates="company")
    jobs = relationship("JobPosting", back_populates="company")

class RecruiterProfile(Base):
    __tablename__ = "recruiter_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    designation = Column(String(80), default="HR Campus Lead")
    official_email = Column(String(120), nullable=True)
    phone = Column(String(30), nullable=True)
    employee_id = Column(String(80), nullable=True) # Corporate Employee ID (e.g. AMZ-HR-7891)
    invitation_code = Column(String(80), nullable=True) # VFSTR Placement Cell Invitation Code
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="recruiter_profile")
    company = relationship("Company", back_populates="recruiters")
    posted_jobs = relationship("JobPosting", back_populates="recruiter")

class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    recruiter_id = Column(Integer, ForeignKey("recruiter_profiles.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=False)
    job_type = Column(String(40), default="Full-Time") # 'Full-Time', 'Internship'
    ctc_lpa = Column(Float, nullable=False)
    min_cgpa = Column(Float, default=6.5)
    max_backlogs = Column(Integer, default=0)
    eligible_branches_json = Column(Text, default='["CSE", "IT", "AI_DS", "ECE"]')
    required_skills_json = Column(Text, default="[]")
    preferred_skills_json = Column(Text, default="[]")
    eligible_years_json = Column(Text, default="[4]") # Recruiter-selected
    target_role_category = Column(String(80), default="Software Development Engineer (SDE)")
    deadline = Column(String(40), default="2026-12-31")
    
    # Dean & Institutional Gatekeeping Status
    status = Column(String(40), default="PENDING_DEAN_APPROVAL") # 'PENDING_DEAN_APPROVAL', 'ACTIVE', 'REJECTED', 'CLOSED'
    dean_remarks = Column(Text, nullable=True)
    approved_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    company = relationship("Company", back_populates="jobs")
    recruiter = relationship("RecruiterProfile", back_populates="posted_jobs")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")
    interview_slots = relationship("InterviewSchedule", back_populates="job", cascade="all, delete-orphan")
    attendances = relationship("DriveAttendance", back_populates="job", cascade="all, delete-orphan")

    @property
    def eligible_branches(self):
        try:
            return json.loads(self.eligible_branches_json) if self.eligible_branches_json else []
        except:
            return []

    @property
    def required_skills(self):
        try:
            return json.loads(self.required_skills_json) if self.required_skills_json else []
        except:
            return []

    @property
    def eligible_years(self):
        try:
            return json.loads(self.eligible_years_json) if self.eligible_years_json else [4]
        except:
            return [4]

class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("student_id", "job_id", name="uq_student_job_application"),
    )

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(40), default="Applied") # 'Applied', 'Shortlisted (Slot Pending)', 'Shortlisted (Slot Confirmed)', 'Selected', 'Rejected'
    match_score = Column(Integer, default=0)
    is_eligible = Column(Boolean, default=True)
    eligibility_reason = Column(Text, default="Eligible")
    missing_skills_json = Column(Text, default="[]")
    applied_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    student = relationship("StudentProfile", back_populates="applications")
    job = relationship("JobPosting", back_populates="applications")
    interview_slot = relationship("InterviewSchedule", back_populates="application", uselist=False, cascade="all, delete-orphan")

class InterviewSchedule(Base):
    __tablename__ = "interview_schedules"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), unique=True, nullable=False)
    job_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    block_name = Column(String(50), nullable=False) # e.g. 'A Block', 'H Block', 'NTR Library'
    chamber_name = Column(String(80), nullable=False) # e.g. 'Chamber A-204'
    slot_date = Column(String(30), default="2026-11-15")
    slot_time = Column(String(60), nullable=False) # e.g. '10:30 AM - 11:00 AM'
    panel_name = Column(String(80), default="Panel 1 (Technical & Coding)")
    status = Column(String(20), default="CONFIRMED")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    application = relationship("Application", back_populates="interview_slot")
    job = relationship("JobPosting", back_populates="interview_slots")
    student = relationship("StudentProfile", back_populates="interview_slots")

class DriveAttendance(Base):
    __tablename__ = "drive_attendances"
    __table_args__ = (
        UniqueConstraint("job_id", "student_id", "event_type", name="uq_job_student_event_attendance"),
    )

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(50), nullable=False) # 'PPT', 'ONLINE_TEST', 'TECHNICAL_INTERVIEW', 'HR_INTERVIEW'
    status = Column(String(30), default="PRESENT") # 'PRESENT', 'ABSENT'
    check_in_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    verified_by = Column(String(80), default="T&P Verification Desk")
    hall_ticket_scan_hash = Column(String(120), nullable=True)

    student = relationship("StudentProfile", back_populates="attendances")
    job = relationship("JobPosting", back_populates="attendances")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="notifications")
