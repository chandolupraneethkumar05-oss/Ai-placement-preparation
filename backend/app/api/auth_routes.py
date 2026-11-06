import os
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User, StudentProfile, RecruiterProfile, Company
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import ADMIN_INVITATION_KEY, RECRUITER_INVITATION_CODE, ENABLE_DEMO_LOGIN, APP_ENV
from app.ai_engine.year_calculator import parse_vfstr_reg_no

router = APIRouter(prefix="/auth", tags=["Authentication & Security"])

# STRICT RECRUITER VERIFICATION GUARDRAILS
DISALLOWED_PERSONAL_DOMAINS = {
    "gmail.com", "yahoo.com", "ymail.com", "hotmail.com", "outlook.com", 
    "live.com", "icloud.com", "rediffmail.com", "zoho.com", "protonmail.com", 
    "mail.com", "gmx.com", "tempmail.com", "aol.com"
}

class AuthRegisterRequest(BaseModel):
    role: str = Field(..., description="Role: 'student', 'recruiter', or 'admin'")
    full_name: str = Field(..., min_length=2, max_length=120)
    password: str = Field(..., min_length=6, max_length=128)
    # Student Fields
    reg_no: Optional[str] = None
    degree: Optional[str] = "B.Tech"
    branch: Optional[str] = "CSE"
    cgpa: Optional[float] = 7.5
    # Recruiter Fields
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
    role = req.role.lower().strip()

    if role == "student":
        if not req.reg_no:
            raise HTTPException(status_code=400, detail="Registration number is mandatory for student sign up")
        identifier = req.reg_no.strip().upper()
        
        # Guardrail: Exactly 10 characters for Student Roll Number (e.g. 211FA05001)
        if len(identifier) != 10:
            raise HTTPException(
                status_code=400, 
                detail="Student Registration Number must be exactly 10 characters (e.g., 211FA05001, 241FA05999)."
            )

        existing = db.query(User).filter(User.identifier == identifier).first()
        if existing:
            raise HTTPException(status_code=400, detail="Student with this registration number already registered")

        year_info = parse_vfstr_reg_no(identifier, req.degree or "B.Tech")
        hashed_pw = get_password_hash(req.password)
        email = f"{identifier.lower()}@vignan.ac.in"

        # Atomic transaction
        try:
            user = User(
                identifier=identifier,
                email=email,
                hashed_password=hashed_pw,
                role="student",
                full_name=req.full_name
            )
            db.add(user)
            db.flush()

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
            db.refresh(user)
            db.refresh(profile)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Registration failed during database write: {str(e)}")

        token = create_access_token({"sub": str(user.id), "role": "student", "identifier": identifier})
        return {
            "access_token": token,
            "role": "student",
            "full_name": user.full_name,
            "user_id": user.id,
            "profile_id": profile.id,
            "reg_no": identifier,
            "email": email,
            "degree": profile.degree,
            "branch": profile.branch,
            "year": year_info["year_label"],
            "batch": year_info["batch"]
        }

    elif role == "recruiter":
        email = req.email.strip().lower() if req.email else None
        if not email or "@" not in email:
            raise HTTPException(status_code=400, detail="Valid corporate work email is mandatory for recruiters")
        
        domain = email.split("@")[-1].lower()
        if domain in DISALLOWED_PERSONAL_DOMAINS:
            raise HTTPException(
                status_code=400, 
                detail=f"Registration rejected: Personal email providers (@{domain}) are strictly prohibited for corporate recruiters. Please use official company email."
            )

        emp_id = (req.employee_id or "").strip()
        if len(emp_id) < 4:
            raise HTTPException(
                status_code=400,
                detail="Official Corporate Employee ID / Staff ID is mandatory (minimum 4 characters, e.g. AMZ-HR-7891)."
            )

        inv_code = (req.invitation_code or "").strip().upper()
        if inv_code != RECRUITER_INVITATION_CODE:
            raise HTTPException(
                status_code=403,
                detail="Invalid VFSTR Placement Invitation Code. Only corporate recruiters invited and pre-approved by the Training & Placement Cell can register."
            )

        existing = db.query(User).filter(User.identifier == email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Recruiter with this corporate email already registered")

        comp_name = req.company_name or "Tech Recruit Partner"
        
        # Atomic transaction
        try:
            company = db.query(Company).filter(Company.name == comp_name).first()
            if not company:
                company = Company(name=comp_name, domain=domain, is_verified=False)
                db.add(company)
                db.flush()

            hashed_pw = get_password_hash(req.password)
            user = User(
                identifier=email,
                email=email,
                hashed_password=hashed_pw,
                role="recruiter",
                full_name=req.full_name
            )
            db.add(user)
            db.flush()

            recruiter_profile = RecruiterProfile(
                user_id=user.id,
                company_id=company.id,
                designation=req.designation or "HR Campus Lead",
                official_email=email,
                employee_id=emp_id,
                invitation_code=inv_code,
                is_verified=company.is_verified
            )
            db.add(recruiter_profile)
            db.commit()
            db.refresh(user)
            db.refresh(recruiter_profile)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Recruiter registration failed: {str(e)}")

        token = create_access_token({"sub": str(user.id), "role": "recruiter", "identifier": email})
        return {
            "access_token": token,
            "role": "recruiter",
            "full_name": user.full_name,
            "user_id": user.id,
            "profile_id": recruiter_profile.id,
            "company_name": company.name,
            "employee_id": emp_id,
            "is_verified": recruiter_profile.is_verified,
            "email": email
        }

    elif role == "admin":
        email = req.email.strip().lower() if req.email else None
        if not email or "@" not in email:
            raise HTTPException(status_code=400, detail="Institutional email is required for Administrator sign up")
        
        # SECURE ADMIN GUARDRAIL: Master Admin Invitation Key required
        admin_key = (req.invitation_code or "").strip()
        if not ADMIN_INVITATION_KEY or admin_key != ADMIN_INVITATION_KEY:
            raise HTTPException(
                status_code=403,
                detail="Security Violation: Public administrator registration is restricted. A valid institutional Master Admin Key is required."
            )

        existing = db.query(User).filter(User.identifier == email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Administrator with this email already registered")

        hashed_pw = get_password_hash(req.password)
        try:
            user = User(
                identifier=email,
                email=email,
                hashed_password=hashed_pw,
                role="admin",
                full_name=req.full_name
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Administrator creation failed: {str(e)}")

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
    role = req.role.lower().strip()
    identifier = req.identifier.strip()
    
    if role == "student":
        identifier = identifier.upper()
        if len(identifier) != 10:
            raise HTTPException(
                status_code=400,
                detail="VFSTR Student Registration Number must be exactly 10 characters (e.g., 231FA05001)"
            )
    else:
        identifier = identifier.lower()

    user = db.query(User).filter(User.identifier == identifier).first()
    
    if not user:
        if role == "student":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Registration Number '{identifier}' is not registered. Please create a student account."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Account '{identifier}' is not registered. Please sign up or contact T&P administration."
            )

    if user.role != role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Account '{identifier}' is registered as '{user.role.upper()}', not '{role.upper()}'."
        )

    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password. Please check your credentials and try again."
        )

    token = create_access_token({"sub": str(user.id), "role": user.role, "identifier": user.identifier})

    # Student metadata
    if user.role == "student" and user.student_profile:
        sp = user.student_profile
        year_info = parse_vfstr_reg_no(sp.reg_no, sp.degree)
        return {
            "access_token": token,
            "role": "student",
            "full_name": user.full_name,
            "user_id": user.id,
            "profile_id": sp.id,
            "reg_no": sp.reg_no,
            "email": user.email,
            "degree": sp.degree,
            "branch": sp.branch,
            "year": year_info["year_label"],
            "batch": year_info["batch"]
        }

    # Recruiter metadata
    elif user.role == "recruiter" and user.recruiter_profile:
        rp = user.recruiter_profile
        return {
            "access_token": token,
            "role": "recruiter",
            "full_name": user.full_name,
            "user_id": user.id,
            "profile_id": rp.id,
            "company_name": rp.company.name if rp.company else "Tech Company",
            "employee_id": rp.employee_id,
            "is_verified": rp.is_verified,
            "email": user.email
        }

    # Admin metadata
    elif user.role == "admin":
        return {
            "access_token": token,
            "role": "admin",
            "full_name": user.full_name,
            "user_id": user.id,
            "profile_id": None,
            "email": user.email
        }

    return {
        "access_token": token,
        "role": user.role,
        "full_name": user.full_name,
        "user_id": user.id,
        "profile_id": None,
        "email": user.email
    }

@router.get("/demo-personas")
def get_demo_personas(db: Session = Depends(get_db)):
    """
    Returns sandboxed preview personas for evaluation.
    In production environments or when ENABLE_DEMO_LOGIN=False, public demo tokens are disabled.
    Administrator persona tokens are strictly excluded from public demo endpoints.
    """
    if not ENABLE_DEMO_LOGIN or APP_ENV == "production":
        raise HTTPException(
            status_code=403,
            detail="Public demo login is disabled in this environment for security. Please sign in with registered credentials."
        )

    personas = []

    # Student 1: 4th Year With Resume (Eligible for Full-Time Drives)
    s1 = db.query(User).filter(User.identifier.in_(["231FA05001", "211FA05001"])).first()
    if s1 and s1.student_profile:
        t1 = create_access_token({"sub": str(s1.id), "role": "student", "identifier": s1.identifier})
        personas.append({
            "label": f"{s1.full_name} (4th Year CSE | With Resume)",
            "role": "student",
            "identifier": s1.identifier,
            "token": t1,
            "full_name": s1.full_name,
            "user_id": s1.id,
            "profile_id": s1.student_profile.id,
            "reg_no": s1.student_profile.reg_no,
            "email": s1.email
        })

    # Student 2: 3rd Year (Eligible for Internship Drives)
    s_new = db.query(User).filter(User.identifier.in_(["241FA05001", "241FA05999"])).first()
    if s_new and s_new.student_profile:
        t_new = create_access_token({"sub": str(s_new.id), "role": "student", "identifier": s_new.identifier})
        personas.append({
            "label": f"{s_new.full_name} (3rd Year AI_DS | Intern Ready)",
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

    # Note: Admin persona is deliberately NOT issued via public demo token to prevent unauthorized institutional takeover.
    return personas
