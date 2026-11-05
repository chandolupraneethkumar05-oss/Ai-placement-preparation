from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    email: str
    full_name: str
    role: str # 'student', 'recruiter', 'admin'

class UserCreate(UserBase):
    password: str
    # Student specific
    reg_no: Optional[str] = None
    branch: Optional[str] = "CSE"
    cgpa: Optional[float] = 7.5
    active_backlogs: Optional[int] = 0
    # Recruiter specific
    company_name: Optional[str] = None
    designation: Optional[str] = "HR Manager"
    employee_id: Optional[str] = None
    invitation_code: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    user_id: int
    profile_id: Optional[int] = None
    reg_no: Optional[str] = None

class StudentProfileUpdate(BaseModel):
    skills: List[str]
    target_role: Optional[str] = None
    target_company: Optional[str] = None
    resume_text: Optional[str] = None

class JobPostingCreate(BaseModel):
    title: str
    description: str
    job_type: str = "Full-Time"
    ctc_lpa: float
    min_cgpa: float = 6.5
    max_backlogs: int = 0
    eligible_branches: List[str] = ["CSE", "IT", "AI_DS", "ECE"]
    required_skills: List[str]
    preferred_skills: Optional[List[str]] = []
    eligible_years: List[int] = [4]
    deadline: str = "2026-12-31"

class ApplicationCreate(BaseModel):
    job_id: int

class ScheduleRequest(BaseModel):
    job_id: int
    panels_count: int = 2
    venue: str = "VFSTR E-Block 204"
