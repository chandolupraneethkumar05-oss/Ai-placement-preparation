import os
import json
import hmac
import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.all_models import StudentProfile, JobPosting, Application, Notification, DriveAttendance, InterviewSchedule
from app.ai_engine.year_calculator import parse_vfstr_reg_no
from app.ai_engine.eligibility import check_student_eligibility
from app.ai_engine.matcher import calculate_match_score
from app.ai_engine.skill_gap import generate_personalized_roadmap
from app.ai_engine.resume_extractor import (
    extract_text_from_file, 
    extract_skills_from_text, 
    calculate_ats_score,
    convert_builder_json_to_text,
    ai_enhance_bullet,
    ai_generate_summary
)
from app.ai_engine.company_rounds import get_company_rounds
from app.ai_engine.pyq_rag_engine import fetch_pyq_for_company, evaluate_pyq_response
from app.core.security import get_current_user_payload
from app.core.config import SECRET_KEY

router = APIRouter(prefix="/student", tags=["Student Portal"])

def generate_hall_ticket_token(reg_no: str, app_id: int, slot_id: int, slot_date: str, slot_time: str) -> str:
    """Generates a tamper-proof HMAC verification token."""
    msg = f"{reg_no}:{app_id}:{slot_id}:{slot_date}:{slot_time}".encode("utf-8")
    sig = hmac.new(SECRET_KEY.encode("utf-8"), msg, hashlib.sha256).hexdigest()[:16].upper()
    return f"VFSTR-{reg_no}-{app_id}-{slot_id}-{sig}"

def verify_student_ownership(student_profile: StudentProfile, auth_payload: Optional[dict]):
    """
    Protects against Insecure Direct Object References (IDOR).
    Requires authenticated session matching the student's account.
    """
    if not auth_payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Authentication required. Please sign in to access student data."
        )
    role = auth_payload.get("role")
    if role in ("admin", "recruiter"):
        return
    if role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access forbidden: Student privileges required."
        )
    if str(student_profile.user_id) != str(auth_payload.get("sub")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Security Violation: You are not authorized to view or mutate another student's profile or applications."
        )

class UpdateTargetRoleRequest(BaseModel):
    target_role: str

class UpdateResumeManualRequest(BaseModel):
    skills: List[str]
    resume_text: str
    target_role: Optional[str] = None

class SaveResumeBuilderRequest(BaseModel):
    builder_data: Dict[str, Any]
    selected_template: Optional[str] = "gengar"
    accent_color: Optional[str] = "#dc2626"
    target_role: Optional[str] = None

class AIBulletEnhanceRequest(BaseModel):
    bullet_text: str
    target_role: Optional[str] = "Software Engineer"
    api_key: Optional[str] = None

class AISummaryRequest(BaseModel):
    name: str
    target_role: str
    skills: List[str]

class ATSPreviewRequest(BaseModel):
    builder_data: Optional[Dict[str, Any]] = None
    resume_text: Optional[str] = None
    target_role: Optional[str] = None

class MockSubmissionRequest(BaseModel):
    company_name: str
    question_title: str
    question_text: str
    required_concepts: List[str]
    benchmark_summary: str
    student_answer: str
    api_key: Optional[str] = None

@router.get("/profile/{student_id}")
def get_student_profile(
    student_id: int, 
    db: Session = Depends(get_db), 
    auth_payload: dict = Depends(get_current_user_payload)
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    verify_student_ownership(profile, auth_payload)

    year_info = parse_vfstr_reg_no(profile.reg_no, profile.degree)
    
    # Real Dynamic Readiness Index: 0 if no resume uploaded!
    if not profile.resume_text or profile.ats_score == 0:
        readiness = 0
    else:
        readiness = int(round((min(10.0, profile.cgpa) / 10.0) * 30 + min(35, len(profile.skills) * 5) + (profile.ats_score * 0.35)))
        readiness = max(20, min(99, readiness))

    return {
        "id": profile.id,
        "name": profile.user.full_name,
        "email": profile.user.email,
        "reg_no": profile.reg_no,
        "degree": profile.degree,
        "branch": profile.branch,
        "cgpa": profile.cgpa,
        "active_backlogs": profile.active_backlogs,
        "skills": profile.skills,
        "target_role": profile.target_role,
        "target_company": profile.target_company,
        "resume_text": profile.resume_text,
        "ats_score": profile.ats_score,
        "ats_feedback": json.loads(profile.ats_feedback_json) if profile.ats_feedback_json else [],
        "placement_status": profile.placement_status,
        "year_info": year_info,
        "readiness_index": readiness,
        "selected_template": profile.selected_template or "gengar",
        "accent_color": profile.accent_color or "#dc2626",
        "has_resume": bool(profile.resume_text and len(profile.resume_text.strip()) > 30)
    }

@router.post("/upload-resume/{student_id}")
async def upload_resume(
    student_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    auth: dict = Depends(get_current_user_payload)
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")
    verify_student_ownership(profile, auth)

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File size exceeds 5MB limit. Please upload a smaller document.")
    try:
        extracted_text = extract_text_from_file(contents, file.filename)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    found_skills = extract_skills_from_text(extracted_text)
    merged_skills = sorted(list(set(profile.skills + found_skills)))
    
    # Calculate REAL Role-Aware ATS Score
    ats_result = calculate_ats_score(extracted_text, merged_skills, target_role=profile.target_role or "")

    profile.resume_text = extracted_text
    profile.skills = merged_skills
    profile.ats_score = ats_result["ats_score"]
    profile.ats_feedback_json = json.dumps(ats_result["recommendations"])
    db.commit()

    return {
        "message": "Resume scanned and analyzed with genuine ATS metrics.",
        "skills_extracted": found_skills,
        "total_skills": merged_skills,
        "ats_score": ats_result["ats_score"],
        "breakdown": {
            "contact": ats_result.get("contact_score", 0),
            "sections": ats_result.get("sections_score", 0),
            "skills": ats_result.get("skills_score", 0),
            "metrics": ats_result.get("metrics_score", 0),
            "formatting": ats_result.get("formatting_score", 0)
        },
        "strengths": ats_result.get("strengths", []),
        "recommendations": ats_result["recommendations"],
        "next_step": "select_target_role"
    }

@router.get("/resume-builder/{student_id}")
def get_resume_builder_data(
    student_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(get_current_user_payload)
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")
    verify_student_ownership(profile, auth)

    builder_data = {}
    if profile.resume_builder_json:
        try:
            builder_data = json.loads(profile.resume_builder_json)
        except Exception:
            builder_data = {}

    if not builder_data or not builder_data.get("basics"):
        builder_data = {
            "basics": {
                "fullName": profile.user.full_name,
                "headline": f"{profile.degree} in {profile.branch} | Aspiring {profile.target_role or 'Software Engineer'}",
                "email": profile.user.email,
                "phone": "+91 9346743290",
                "website": "https://linkedin.com/in/" + profile.user.full_name.lower().replace(" ", ""),
                "location": "Vadlamudi, Guntur, AP",
                "picture": ""
            },
            "summary": "Enthusiastic engineering student at VFSTR with strong foundations in computer science principles and software engineering.",
            "profiles": [
                {"network": "GitHub", "username": profile.user.full_name.lower().replace(" ", ""), "url": "https://github.com/"},
                {"network": "LinkedIn", "username": profile.user.full_name.lower().replace(" ", ""), "url": "https://linkedin.com/in/"}
            ],
            "experience": [],
            "education": [
                {
                    "institution": "Vignan's Foundation for Science, Technology and Research (VFSTR)",
                    "degree": profile.degree,
                    "field": profile.branch,
                    "score": f"{profile.cgpa:.2f} CGPA",
                    "dateRange": f"{profile.start_year} - {profile.end_year}"
                }
            ],
            "skills": [
                {"name": "Languages", "keywords": "Python, Java, C++, SQL"},
                {"name": "Web & Backend", "keywords": "React, FastAPI, Node.js"}
            ],
            "languages": [
                {"name": "English", "fluency": "Fluent"},
                {"name": "Telugu", "fluency": "Native"}
            ],
            "awards": [],
            "certifications": [],
            "interests": [{"name": "Competitive Coding"}, {"name": "Open Source"}],
            "projects": [],
            "publications": [],
            "volunteering": [],
            "references": []
        }

    return {
        "builder_data": builder_data,
        "selected_template": profile.selected_template or "gengar",
        "accent_color": profile.accent_color or "#dc2626",
        "ats_score": profile.ats_score,
        "ats_feedback": json.loads(profile.ats_feedback_json) if profile.ats_feedback_json else []
    }

@router.put("/resume-builder/{student_id}")
def save_resume_builder_data(
    student_id: int, 
    req: SaveResumeBuilderRequest, 
    db: Session = Depends(get_db),
    auth: dict = Depends(get_current_user_payload)
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")
    verify_student_ownership(profile, auth)

    plain_text = convert_builder_json_to_text(req.builder_data)
    extracted_skills = extract_skills_from_text(plain_text)
    
    target_role_to_use = req.target_role or profile.target_role or ""
    ats_result = calculate_ats_score(plain_text, extracted_skills, target_role=target_role_to_use)

    profile.resume_builder_json = json.dumps(req.builder_data)
    profile.resume_text = plain_text
    profile.skills = extracted_skills
    profile.ats_score = ats_result["ats_score"]
    profile.ats_feedback_json = json.dumps(ats_result["recommendations"])
    profile.selected_template = req.selected_template or "gengar"
    profile.accent_color = req.accent_color or "#dc2626"
    if req.target_role:
        profile.target_role = req.target_role

    db.commit()

    return {
        "message": "Resume builder saved and ATS rescan complete.",
        "ats_score": ats_result["ats_score"],
        "breakdown": {
            "contact": ats_result.get("contact_score", 0),
            "sections": ats_result.get("sections_score", 0),
            "skills": ats_result.get("skills_score", 0),
            "metrics": ats_result.get("metrics_score", 0),
            "formatting": ats_result.get("formatting_score", 0)
        },
        "recommendations": ats_result["recommendations"]
    }

@router.put("/target-role/{student_id}")
def update_target_role(
    student_id: int, 
    req: UpdateTargetRoleRequest, 
    db: Session = Depends(get_db),
    auth: dict = Depends(get_current_user_payload)
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")
    verify_student_ownership(profile, auth)

    new_role = req.target_role.strip()
    profile.target_role = new_role
    
    if profile.resume_text:
        ats_result = calculate_ats_score(profile.resume_text, profile.skills, target_role=new_role)
        profile.ats_score = ats_result["ats_score"]
        profile.ats_feedback_json = json.dumps(ats_result["recommendations"])
    
    db.commit()
    return {
        "message": f"Target role set to {new_role}",
        "target_role": new_role,
        "ats_score": profile.ats_score
    }

@router.put("/manual-resume/{student_id}")
def update_manual_resume(
    student_id: int, 
    req: UpdateResumeManualRequest, 
    db: Session = Depends(get_db),
    auth: dict = Depends(get_current_user_payload)
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")
    verify_student_ownership(profile, auth)

    profile.skills = req.skills
    profile.resume_text = req.resume_text
    if req.target_role:
        profile.target_role = req.target_role

    ats_result = calculate_ats_score(req.resume_text, req.skills, target_role=profile.target_role or "")
    profile.ats_score = ats_result["ats_score"]
    profile.ats_feedback_json = json.dumps(ats_result["recommendations"])
    db.commit()

    return {
        "message": "Profile updated manually and rescanned.",
        "ats_score": ats_result["ats_score"],
        "recommendations": ats_result["recommendations"]
    }

@router.post("/resume-ai/enhance-bullet")
def enhance_bullet_api(req: AIBulletEnhanceRequest):
    return {"enhanced_bullet": ai_enhance_bullet(req.bullet_text, req.target_role or "Software Engineer")}

@router.post("/resume-ai/generate-summary")
def generate_summary_api(req: AISummaryRequest):
    return {"summary": ai_generate_summary(req.name, req.target_role, req.skills)}

@router.post("/evaluate-ats-preview")
def evaluate_ats_preview(req: ATSPreviewRequest):
    text_to_eval = req.resume_text or ""
    if not text_to_eval and req.builder_data:
        text_to_eval = convert_builder_json_to_text(req.builder_data)
    skills = extract_skills_from_text(text_to_eval)
    return calculate_ats_score(text_to_eval, skills, target_role=req.target_role or "")

@router.get("/jobs/{student_id}")
def get_jobs_for_student(
    student_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(get_current_user_payload)
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")
    verify_student_ownership(profile, auth)

    jobs = db.query(JobPosting).filter(JobPosting.status == "ACTIVE").all()
    results = []

    applied_dict = {a.job_id: a.status for a in profile.applications}

    for job in jobs:
        eligibility = check_student_eligibility(profile, job)
        match = calculate_match_score(profile.skills, profile.resume_text, job.title, job.required_skills, job.description)
        rounds = get_company_rounds(job.company.name if job.company else "")
        target_role_match = bool(profile.target_role and profile.target_role.lower() in job.title.lower())

        results.append({
            "job_id": job.id,
            "title": job.title,
            "company": job.company.name if job.company else "",
            "mou_status": getattr(job.company, "mou_status", "ACTIVE"),
            "company_mou_ref": getattr(job.company, "mou_reference_no", ""),
            "company_mou_status": getattr(job.company, "mou_status", "ACTIVE"),
            "ctc_lpa": job.ctc_lpa,
            "job_type": job.job_type,
            "min_cgpa": job.min_cgpa,
            "max_backlogs": job.max_backlogs,
            "eligible_branches": job.eligible_branches,
            "required_skills": job.required_skills,
            "deadline": job.deadline,
            "is_eligible": eligibility["is_eligible"],
            "eligibility_reasons": eligibility["reasons"],
            "eligibility_diagnostics": eligibility.get("diagnostics", {}),
            "match_score": match["match_score"],
            "matched_skills": match["matched_skills"],
            "missing_skills": match["missing_skills"],
            "target_role_match": target_role_match,
            "recruitment_rounds": rounds,
            "has_applied": job.id in applied_dict,
            "application_status": applied_dict.get(job.id, None)
        })

    results.sort(key=lambda x: (x["target_role_match"], x["is_eligible"], x["match_score"]), reverse=True)
    return results

@router.get("/attendance/{student_id}")
def get_student_placement_attendance(
    student_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(get_current_user_payload)
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")
    verify_student_ownership(profile, auth)

    records = db.query(DriveAttendance).filter(DriveAttendance.student_id == student_id).order_by(DriveAttendance.check_in_time.desc()).all()
    results = []
    for r in records:
        results.append({
            "id": r.id,
            "job_id": r.job_id,
            "job_title": r.job.title if r.job else "Campus Drive",
            "company_name": r.job.company.name if r.job and r.job.company else "Company",
            "event_type": r.event_type,
            "status": r.status,
            "check_in_time": r.check_in_time.isoformat() if r.check_in_time else "",
            "verified_by": r.verified_by,
            "scan_hash": r.hall_ticket_scan_hash
        })

    return {
        "student_id": profile.id,
        "reg_no": profile.reg_no,
        "name": profile.user.full_name if profile.user else "",
        "total_attended_events": len([r for r in records if r.status == "PRESENT"]),
        "records": results
    }

@router.post("/apply/{student_id}/{job_id}")
def apply_job(
    student_id: int, 
    job_id: int, 
    db: Session = Depends(get_db), 
    auth: dict = Depends(get_current_user_payload)
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not profile or not job:
        raise HTTPException(status_code=404, detail="Student or Job not found")
    verify_student_ownership(profile, auth)

    if job.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Cannot apply: Recruitment drive is currently pending Dean approval or closed.")

    if not profile.resume_text or len(profile.resume_text.strip()) < 30:
        raise HTTPException(
            status_code=400,
            detail="Resume required. Please upload your PDF/Word resume or complete the Talent Shine Builder first before applying."
        )

    existing = db.query(Application).filter(Application.student_id == student_id, Application.job_id == job_id).first()
    if existing:
        return {"message": "Already applied", "status": existing.status}

    eligibility = check_student_eligibility(profile, job)
    match = calculate_match_score(profile.skills, profile.resume_text, job.title, job.required_skills, job.description)

    app = Application(
        student_id=student_id,
        job_id=job_id,
        status="Applied",
        match_score=match["match_score"],
        is_eligible=eligibility["is_eligible"],
        eligibility_reason=eligibility["summary"],
        missing_skills_json=json.dumps(match["missing_skills"])
    )
    db.add(app)
    db.commit()

    notif = Notification(
        user_id=profile.user_id,
        title=f"Application Received: {job.title}",
        message=f"You successfully applied for {job.title} at {job.company.name}."
    )
    db.add(notif)
    db.commit()

    return {
        "message": "Application submitted successfully!",
        "application_id": app.id,
        "is_eligible": eligibility["is_eligible"],
        "match_score": match["match_score"]
    }

@router.get("/applications/{student_id}")
def get_student_applications(
    student_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(get_current_user_payload)
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")
    verify_student_ownership(profile, auth)

    apps = db.query(Application).filter(Application.student_id == student_id).all()
    results = []
    for a in apps:
        slot = a.interview_slot
        results.append({
            "application_id": a.id,
            "job_id": a.job_id,
            "job_title": a.job.title if a.job else "Position",
            "company_name": a.job.company.name if a.job and a.job.company else "Company",
            "company_mou_status": getattr(a.job.company, "mou_status", "ACTIVE") if a.job else "ACTIVE",
            "status": a.status,
            "match_score": a.match_score,
            "is_eligible": a.is_eligible,
            "applied_at": a.applied_at.isoformat() if a.applied_at else "",
            "interview_slot": {
                "block": slot.block_name,
                "chamber": slot.chamber_name,
                "date": slot.slot_date,
                "time": slot.slot_time,
                "panel": slot.panel_name,
                "status": slot.status
            } if slot else None
        })
    return results

@router.get("/shortlisted-interviews/{student_id}")
def get_shortlisted_interviews(
    student_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(get_current_user_payload)
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")
    verify_student_ownership(profile, auth)

    results = []
    for app in profile.applications:
        if "shortlisted" in app.status.lower() or "confirmed" in app.status.lower():
            comp_name = app.job.company.name if app.job and app.job.company else "Company"
            rounds = get_company_rounds(comp_name)
            slot = app.interview_slot
            results.append({
                "application_id": app.id,
                "job_id": app.job.id,
                "job_title": app.job.title,
                "company_name": comp_name,
                "status": app.status,
                "recruitment_rounds": rounds,
                "interview_slot": {
                    "block": slot.block_name,
                    "chamber": slot.chamber_name,
                    "date": slot.slot_date,
                    "time": slot.slot_time,
                    "panel": slot.panel_name,
                    "status": slot.status
                } if slot else None
            })
    return results

@router.get("/mock-interview/{company_name}")
def get_mock_interview(
    company_name: str, 
    round_type: Optional[str] = None, 
    student_id: Optional[int] = None, 
    exclude: Optional[str] = None,
    api_key: Optional[str] = None,
    db: Session = Depends(get_db),
    auth: dict = Depends(get_current_user_payload)
):
    target_role = "Software Engineer"
    if student_id:
        profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
        if profile:
            verify_student_ownership(profile, auth)
            target_role = profile.target_role or "Software Engineer"
            is_shortlisted = any(
                (app.job and app.job.company and app.job.company.name.lower() == company_name.lower()) and
                ("shortlisted" in app.status.lower() or "confirmed" in app.status.lower())
                for app in profile.applications
            )
            if not is_shortlisted:
                raise HTTPException(
                    status_code=403,
                    detail=f"Strict Placement Guardrail: Technical Interview Assessment is locked. You must be shortlisted by {company_name} to access this assessment."
                )

    exclude_list = [t.strip() for t in exclude.split(",") if t.strip()] if exclude else []
    pyq = fetch_pyq_for_company(
        company_name=company_name,
        round_category=round_type,
        exclude_titles=exclude_list,
        api_key=api_key,
        target_role=target_role
    )
    return pyq

@router.post("/evaluate-mock")
def evaluate_mock(req: MockSubmissionRequest):
    question_data = {
        "company": req.company_name,
        "title": req.question_title,
        "question": req.question_text,
        "required_concepts": req.required_concepts,
        "benchmark_summary": req.benchmark_summary
    }
    evaluation = evaluate_pyq_response(question_data, req.student_answer, api_key=req.api_key)
    return evaluation

@router.post("/optimize-bullet")
def optimize_bullet(req: AIBulletEnhanceRequest):
    from app.ai_engine.gemini_service import optimize_bullet_with_gemini
    if req.api_key or os.getenv("GEMINI_API_KEY"):
        gemini_res = optimize_bullet_with_gemini(req.bullet_text, req.target_role, api_key=req.api_key)
        if gemini_res:
            return {"optimized_bullet": gemini_res, "engine": "Google Gemini STAR Optimizer"}
    enhanced = ai_enhance_bullet(req.bullet_text, req.target_role or "Software Engineer")
    return {"optimized_bullet": enhanced, "engine": "VFSTR Institutional STAR Engine"}

@router.get("/hall-ticket/{student_id}/{application_id}")
def get_hall_ticket(
    student_id: int, 
    application_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(get_current_user_payload)
):
    """
    Issues official placement interview hall ticket and admit card.
    Strictly verifies student ownership and requires confirmed interview slot (no placeholder data).
    Generates cryptographically unpredictable HMAC verification token.
    """
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")
    verify_student_ownership(profile, auth)

    app = db.query(Application).filter(Application.id == application_id, Application.student_id == student_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application record not found")
    
    # Must have an allocated, confirmed interview schedule (never placeholder)
    slot = app.interview_slot
    if not slot or slot.status != "CONFIRMED":
        raise HTTPException(
            status_code=400, 
            detail="Hall ticket cannot be generated: Interview slot has not been confirmed yet. Please wait for the recruiter to allocate your chamber schedule."
        )

    comp_name = app.job.company.name if app.job and app.job.company else "Recruiting Partner"
    verification_hash = generate_hall_ticket_token(
        reg_no=profile.reg_no,
        app_id=app.id,
        slot_id=slot.id,
        slot_date=slot.slot_date,
        slot_time=slot.slot_time
    )
    
    return {
        "institution": "Vignan's Foundation for Science, Technology and Research",
        "document_title": "OFFICIAL PLACEMENT INTERVIEW HALL TICKET & ADMIT CARD",
        "reg_no": profile.reg_no,
        "student_name": profile.user.full_name,
        "degree": profile.degree,
        "branch": profile.branch,
        "cgpa": profile.cgpa,
        "company_name": comp_name,
        "job_title": app.job.title if app.job else "Campus Recruit",
        "ctc_lpa": app.job.ctc_lpa if app.job else 0.0,
        "panel_name": slot.panel_name,
        "block": slot.block_name,
        "chamber": slot.chamber_name,
        "date": slot.slot_date,
        "time": slot.slot_time,
        "verification_hash": verification_hash,
        "instructions": [
            "Report to the assigned placement chamber 15 minutes prior to the scheduled slot.",
            "Carry 2 hard copies of your ATS-verified resume and college ID card.",
            "Dress in official campus formal attire.",
            "Volunteers and Panel In-Charge will scan this QR verification hash upon entry."
        ]
    }

@router.get("/verify-admit-card/{token}")
@router.get("/verify-hall-ticket/{token}")
def verify_hall_ticket_token(token: str, db: Session = Depends(get_db)):
    """
    Verification endpoint for placement volunteers and panel heads to validate scanned admit card QR tokens.
    """
    clean_token = token.strip()
    parts = clean_token.split("-")
    if len(parts) < 5 or parts[0] != "VFSTR" or parts[1] != "PASS":
        raise HTTPException(status_code=400, detail="Invalid token format. Not an official VFSTR admit pass.")

    reg_no = parts[2]
    try:
        app_id = int(parts[3])
    except ValueError:
        raise HTTPException(status_code=400, detail="Malformed application identifier in token.")

    app = db.query(Application).filter(Application.id == app_id).first()
    if not app or app.student.reg_no != reg_no:
        raise HTTPException(status_code=404, detail="Admit card record does not match any registered candidate.")

    slot = app.interview_slot
    if not slot:
        raise HTTPException(status_code=400, detail="No interview slot linked to this admit card.")

    expected_token = generate_hall_ticket_token(
        reg_no=reg_no,
        app_id=app.id,
        slot_id=slot.id,
        slot_date=slot.slot_date,
        slot_time=slot.slot_time
    )

    if not hmac.compare_digest(clean_token, expected_token):
        raise HTTPException(status_code=403, detail="Security Warning: Tampered or invalid verification token signature.")

    return {
        "valid": True,
        "status": "OFFICIALLY_VERIFIED",
        "candidate_name": app.student.user.full_name,
        "reg_no": app.student.reg_no,
        "branch": app.student.branch,
        "company": app.job.company.name if app.job and app.job.company else "Partner Company",
        "job_title": app.job.title if app.job else "Campus Drive",
        "slot_date": slot.slot_date,
        "slot_time": slot.slot_time,
        "chamber": slot.chamber_name,
        "block": slot.block_name,
        "panel": slot.panel_name
    }

@router.get("/roadmap/{student_id}/{job_id}")
def get_student_roadmap(
    student_id: int, 
    job_id: int, 
    db: Session = Depends(get_db),
    auth: dict = Depends(get_current_user_payload)
):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not profile or not job:
        raise HTTPException(status_code=404, detail="Student or Job not found")
    verify_student_ownership(profile, auth)

    year_info = parse_vfstr_reg_no(profile.reg_no, profile.degree)
    
    student_skills_lower = [s.lower() for s in (profile.skills or [])]
    missing = [req for req in job.required_skills if req.lower() not in student_skills_lower]

    roadmap = generate_personalized_roadmap(
        student=profile,
        job=job,
        missing_skills=missing,
        student_year=year_info["year_label"],
        batch=year_info["batch"],
        job_title=job.title,
        company=job.company.name if job.company else "Company"
    )
    return roadmap
