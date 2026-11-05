from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User, StudentProfile, RecruiterProfile, Company
from app.core.security import verify_password, get_password_hash, create_access_token
from app.ai_engine.year_calculator import parse_vfstr_reg_no

router = APIRouter(prefix="/auth", tags=["Authentication & Security"])

# STRICT RECRUITER VERIFICATION GUARDRAILS
DISALLOWED_PERSONAL_DOMAINS = {
    "gmail.com", "yahoo.com", "ymail.com", "hotmail.com", "outlook.com", 
    "live.com", "icloud.com", "rediffmail.com", "zoho.com", "protonmail.com", 
    "mail.com", "gmx.com", "tempmail.com", "aol.com"
}
OFFICIAL_VFSTR_INVITATION_CODE = "VFSTR-RECRUIT-2026"

class AuthRegisterRequest(BaseModel):
    role: str # 'student', 'recruiter', 'admin'
    full_name: str
    password: str
    # Student Fields
    reg_no: Optional[str] = None
    degree: Optional[str] = "B.Tech"
    branch: Optional[str] = "CSE"
    cgpa: Optional[float] = 7.5
    # Recruiter Fields (Strict Corporate Guardrails)
    email: Optional[str] = None
    company_name: Optional[str] = None
    designation: Optional[str] = "HR Campus Lead"
    employee_id: Optional[str] = None
    invitation_code: Optional[str] = None

class AuthLoginRequest(BaseModel):
    role: str # 'student', 'recruiter', 'admin'
    identifier: str # reg_no for student, email for recruiter/admin
    password: str

@router.post("/register")
def register(req: AuthRegisterRequest, db: Session = Depends(get_db)):
    role = req.role.lower()

    if role == "student":
        if not req.reg_no:
            raise HTTPException(status_code=400, detail="Registration number is mandatory for student sign up")
        identifier = req.reg_no.strip().upper()
        
        # STRICT GUARDRAIL: Exactly 10 characters for VFSTR Roll Number (e.g., 211FA05001)
        if len(identifier) != 10:
            raise HTTPException(
                status_code=400, 
                detail="VFSTR Registration Number must be exactly 10 characters (e.g., 211FA05001, 241FA05999)."
            )

        existing = db.query(User).filter(User.identifier == identifier).first()
        if existing:
            raise HTTPException(status_code=400, detail="Student with this registration number already registered")

        # Autonomous year calculation
        year_info = parse_vfstr_reg_no(identifier, req.degree or "B.Tech")

        hashed_pw = get_password_hash(req.password)
        email = f"{identifier.lower()}@vignan.ac.in"
        user = User(identifier=identifier, email=email, hashed_password=hashed_pw, role="student", full_name=req.full_name)
        db.add(user)
        db.commit()
        db.refresh(user)

        # STRICT GUARDRAIL: Zero hardcoded skills, zero hardcoded ATS scores for new students!
        profile = StudentProfile(
            user_id=user.id,
            reg_no=identifier,
            degree=year_info["degree"],
            duration_years=year_info["duration_years"],
            start_year=year_info["start_year"],
            end_year=year_info["end_year"],
            branch=req.branch or "CSE",
            cgpa=req.cgpa or 7.8,
            skills_json='[]',
            resume_text='',
            ats_score=0,
            ats_feedback_json='[]',
            target_role='',
            target_company='',
            resume_builder_json='{}'
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

        token = create_access_token({"sub": str(user.id), "role": "student", "identifier": identifier})
        return {
            "access_token": token,
            "role": "student",
            "full_name": user.full_name,
            "user_id": user.id,
            "profile_id": profile.id,
            "reg_no": identifier,
            "email": email,
            "year_info": year_info
        }

    elif role == "recruiter":
        email = req.email.strip().lower() if req.email else None
        if not email:
            raise HTTPException(status_code=400, detail="Official corporate email is required for recruiter sign up")
        
        # GUARDRAIL 1: Disallow free/personal email domains
        domain = email.split("@")[-1].lower() if "@" in email else ""
        if domain in DISALLOWED_PERSONAL_DOMAINS or not domain:
            raise HTTPException(
                status_code=400, 
                detail="Personal email providers (@gmail, @yahoo, @outlook, etc.) are strictly prohibited. Recruiters must use an official corporate enterprise email domain."
            )

        # GUARDRAIL 2: Verified Corporate Employee ID (minimum 4 alphanumeric characters)
        emp_id = (req.employee_id or "").strip()
        if len(emp_id) < 4:
            raise HTTPException(
                status_code=400,
                detail="Official Corporate Employee ID / Staff ID is mandatory (minimum 4 characters, e.g. AMZ-HR-7891)."
            )

        # GUARDRAIL 3: Official VFSTR Placement Drive Invitation Code
        inv_code = (req.invitation_code or "").strip().upper()
        if inv_code != OFFICIAL_VFSTR_INVITATION_CODE:
            raise HTTPException(
                status_code=403,
                detail="Invalid VFSTR Placement Invitation Code. Only corporate recruiters invited and pre-approved by VFSTR Training & Placement Cell can register."
            )

        existing = db.query(User).filter(User.identifier == email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Recruiter with this corporate email already registered")

        comp_name = req.company_name or "Tech Recruit Partner"
        company = db.query(Company).filter(Company.name == comp_name).first()
        if not company:
            company = Company(name=comp_name, domain=domain, is_verified=True)
            db.add(company)
            db.commit()
            db.refresh(company)

        hashed_pw = get_password_hash(req.password)
        user = User(identifier=email, email=email, hashed_password=hashed_pw, role="recruiter", full_name=req.full_name)
        db.add(user)
        db.commit()
        db.refresh(user)

        recruiter_profile = RecruiterProfile(
            user_id=user.id,
            company_id=company.id,
            designation=req.designation or "HR Campus Lead",
            official_email=email,
            employee_id=emp_id,
            invitation_code=inv_code,
            is_verified=True
        )
        db.add(recruiter_profile)
        db.commit()
        db.refresh(recruiter_profile)

        token = create_access_token({"sub": str(user.id), "role": "recruiter", "identifier": email})
        return {
            "access_token": token,
            "role": "recruiter",
            "full_name": user.full_name,
            "user_id": user.id,
            "profile_id": recruiter_profile.id,
            "company_name": company.name,
            "employee_id": emp_id,
            "is_verified": True,
            "email": email
        }

    elif role == "admin":
        email = req.email.strip().lower() if req.email else None
        if not email:
            raise HTTPException(status_code=400, detail="Institutional email is required for Administrator sign up")
        existing = db.query(User).filter(User.identifier == email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Administrator with this email already registered")

        hashed_pw = get_password_hash(req.password)
        user = User(identifier=email, email=email, hashed_password=hashed_pw, role="admin", full_name=req.full_name)
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token({"sub": str(user.id), "role": "admin", "identifier": email})
        return {
            "access_token": token,
            "role": "admin",
            "full_name": user.full_name,
            "user_id": user.id,
            "profile_id": None,
            "email": email
        }

    else:
        raise HTTPException(status_code=400, detail="Invalid role specified. Must be 'student', 'recruiter', or 'admin'")

@router.post("/login")
def login(req: AuthLoginRequest, db: Session = Depends(get_db)):
    role = req.role.lower()
    identifier = req.identifier.strip()
    
    if role == "student":
        identifier = identifier.upper() # Roll number normalized
        # STRICT GUARDRAIL: Exactly 10 characters for student roll number
        if len(identifier) != 10:
            raise HTTPException(
                status_code=400,
                detail="VFSTR Registration Number must be exactly 10 characters (e.g., 211FA05001)."
            )
    elif role == "recruiter":
        email_clean = identifier.lower()
        domain = email_clean.split("@")[-1] if "@" in email_clean else ""
        if domain in DISALLOWED_PERSONAL_DOMAINS:
            raise HTTPException(
                status_code=400,
                detail="Personal email providers (@gmail, @yahoo, @outlook, etc.) are strictly prohibited. Recruiters must use their official corporate work email."
            )

    user = db.query(User).filter(User.identifier == identifier, User.role == role).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"No active account found for {role.capitalize()} with identifier '{identifier}'"
        )

    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials provided. Please check your password."
        )

    token = create_access_token({"sub": str(user.id), "role": user.role, "identifier": user.identifier})

    profile_id = None
    year_info = None
    reg_no = None
    company_name = None
    employee_id = None

    if role == "student" and user.student_profile:
        profile_id = user.student_profile.id
        reg_no = user.student_profile.reg_no
        year_info = parse_vfstr_reg_no(user.student_profile.reg_no, user.student_profile.degree)
    elif role == "recruiter" and user.recruiter_profile:
        profile_id = user.recruiter_profile.id
        company_name = user.recruiter_profile.company.name if user.recruiter_profile.company else None
        employee_id = user.recruiter_profile.employee_id

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "full_name": user.full_name,
        "user_id": user.id,
        "profile_id": profile_id,
        "reg_no": reg_no,
        "company_name": company_name,
        "employee_id": employee_id,
        "is_verified": True if role == "recruiter" else False,
        "email": user.email,
        "year_info": year_info
    }

@router.get("/demo-personas")
def get_demo_personas(db: Session = Depends(get_db)):
    """Provides instant 1-click test personas for the hackathon evaluator."""
    personas = []
    
    # Student 1: Rahul Sharma (With resume)
    s1 = db.query(User).filter(User.identifier == "211FA05001").first()
    if s1 and s1.student_profile:
        t1 = create_access_token({"sub": str(s1.id), "role": "student", "identifier": s1.identifier})
        personas.append({
            "label": "Rahul Sharma (4th Year CSE | With Resume)",
            "role": "student",
            "identifier": s1.identifier,
            "token": t1,
            "full_name": s1.full_name,
            "user_id": s1.id,
            "profile_id": s1.student_profile.id,
            "reg_no": s1.student_profile.reg_no,
            "email": s1.email
        })

    # Student 2: New Student (Zero resume, Real 0 ATS Score test)
    s_new = db.query(User).filter(User.identifier == "241FA05999").first()
    if s_new and s_new.student_profile:
        t_new = create_access_token({"sub": str(s_new.id), "role": "student", "identifier": s_new.identifier})
        personas.append({
            "label": "Fresh Student (New User | No Resume | Real 0 ATS)",
            "role": "student",
            "identifier": s_new.identifier,
            "token": t_new,
            "full_name": s_new.full_name,
            "user_id": s_new.id,
            "profile_id": s_new.student_profile.id,
            "reg_no": s_new.student_profile.reg_no,
            "email": s_new.email
        })

    # Recruiter: Amazon HR
    r1 = db.query(User).filter(User.identifier == "recruiter@amazon.com").first()
    if r1 and r1.recruiter_profile:
        tr1 = create_access_token({"sub": str(r1.id), "role": "recruiter", "identifier": r1.identifier})
        personas.append({
            "label": "Vikram Seth (HR Lead | Amazon)",
            "role": "recruiter",
            "identifier": r1.identifier,
            "token": tr1,
            "full_name": r1.full_name,
            "user_id": r1.id,
            "profile_id": r1.recruiter_profile.id,
            "reg_no": None,
            "email": r1.email
        })

    # Admin: Dean Placements
    a1 = db.query(User).filter(User.role == "admin").first()
    if a1:
        ta1 = create_access_token({"sub": str(a1.id), "role": "admin", "identifier": a1.identifier})
        personas.append({
            "label": "Dr. K. V. Rao (Dean Training & Placements | VFSTR)",
            "role": "admin",
            "identifier": a1.identifier,
            "token": ta1,
            "full_name": a1.full_name,
            "user_id": a1.id,
            "profile_id": None,
            "reg_no": None,
            "email": a1.email
        })

    return personas
