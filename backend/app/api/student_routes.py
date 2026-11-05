import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import StudentProfile, JobPosting, Application, Notification
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

router = APIRouter(prefix="/student", tags=["Student Portal"])

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

@router.get("/profile/{student_id}")
def get_student_profile(student_id: int, db: Session = Depends(get_db), auth_payload: dict = Depends(get_current_user_payload)):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Security Guardrail: Check authorization if token passed
    if auth_payload and auth_payload.get("role") == "student":
        if str(profile.user_id) != str(auth_payload.get("sub")):
            raise HTTPException(status_code=403, detail="Security Violation: You are not authorized to view another student's profile.")

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
async def upload_resume(student_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")

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
def get_resume_builder_data(student_id: int, db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")

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
def save_resume_builder_data(student_id: int, req: SaveResumeBuilderRequest, db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")

    # 1. Convert JSON to clean standard plain-text for ATS scanning
    plain_text = convert_builder_json_to_text(req.builder_data)
    
    # 2. Extract genuine skills against institutional taxonomy
    extracted_skills = extract_skills_from_text(plain_text)
    
    # 3. Calculate genuine role-aware ATS score
    target_role_to_use = req.target_role or profile.target_role or ""
    ats_result = calculate_ats_score(plain_text, extracted_skills, target_role=target_role_to_use)

    # 4. Save to DB
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
        "message": "Resume builder saved and genuine ATS score calculated.",
        "ats_score": profile.ats_score,
        "skills_extracted": extracted_skills,
        "verdict": ats_result["verdict"],
        "breakdown": {
            "contact": ats_result.get("contact_score", 0),
            "sections": ats_result.get("sections_score", 0),
            "skills": ats_result.get("skills_score", 0),
            "metrics": ats_result.get("metrics_score", 0),
            "formatting": ats_result.get("formatting_score", 0)
        },
        "strengths": ats_result.get("strengths", []),
        "recommendations": ats_result["recommendations"]
    }

@router.post("/resume-ai/enhance-bullet")
def enhance_bullet(req: AIBulletEnhanceRequest):
    return ai_enhance_bullet(req.bullet_text, req.target_role or "Software Engineer")

@router.post("/resume-ai/generate-summary")
def generate_summary(req: AISummaryRequest):
    summary = ai_generate_summary(req.name, req.target_role, req.skills)
    return {"summary": summary}

@router.post("/evaluate-ats-preview")
def preview_ats_score(req: ATSPreviewRequest):
    text = ""
    if req.builder_data:
        text = convert_builder_json_to_text(req.builder_data)
    elif req.resume_text:
        text = req.resume_text

    skills = extract_skills_from_text(text)
    ats_result = calculate_ats_score(text, skills, target_role=req.target_role or "")
    return ats_result

@router.put("/target-role/{student_id}")
def update_target_role(student_id: int, req: UpdateTargetRoleRequest, db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")

    profile.target_role = req.target_role

    # Dynamic Rescanning: If resume exists, rescan against the new target role!
    if profile.resume_text and len(profile.resume_text.strip()) > 20:
        extracted_skills = extract_skills_from_text(profile.resume_text)
        ats_result = calculate_ats_score(profile.resume_text, extracted_skills, target_role=req.target_role)
        profile.skills = extracted_skills
        profile.ats_score = ats_result["ats_score"]
        profile.ats_feedback_json = json.dumps(ats_result["recommendations"])

    db.commit()
    return {
        "message": "Target role saved and resume rescanned against role requirements",
        "target_role": profile.target_role,
        "ats_score": profile.ats_score,
        "feedback": json.loads(profile.ats_feedback_json) if profile.ats_feedback_json else []
    }

@router.put("/manual-resume/{student_id}")
def update_manual_resume(student_id: int, req: UpdateResumeManualRequest, db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")

    ats_result = calculate_ats_score(req.resume_text, req.skills, target_role=req.target_role or profile.target_role or "")
    profile.skills = req.skills
    profile.resume_text = req.resume_text
    profile.ats_score = ats_result["ats_score"]
    profile.ats_feedback_json = json.dumps(ats_result["recommendations"])
    if req.target_role:
        profile.target_role = req.target_role

    db.commit()
    return {
        "message": "Resume updated successfully",
        "ats_score": profile.ats_score,
        "feedback": ats_result["recommendations"]
    }

@router.get("/jobs/{student_id}")
def get_jobs_for_student(student_id: int, db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")

    jobs = db.query(JobPosting).filter(JobPosting.status == "ACTIVE").all()
    results = []

    applied_dict = {app.job_id: app.status for app in profile.applications}

    for job in jobs:
        eligibility = check_student_eligibility(profile, job)
        match = calculate_match_score(profile.skills, profile.resume_text, job.title, job.required_skills, job.description)
        rounds = get_company_rounds(job.company.name if job.company else "")

        target_role_match = bool(
            profile.target_role and (
                profile.target_role.lower() in job.title.lower() or 
                job.title.lower() in profile.target_role.lower() or
                (job.target_role_category and profile.target_role.lower() in job.target_role_category.lower())
            )
        )

        results.append({
            "job_id": job.id,
            "title": job.title,
            "company": job.company.name if job.company else "Campus Drive",
            "ctc_lpa": job.ctc_lpa,
            "job_type": job.job_type,
            "min_cgpa": job.min_cgpa,
            "eligible_branches": job.eligible_branches,
            "required_skills": job.required_skills,
            "deadline": job.deadline,
            "is_eligible": eligibility["is_eligible"],
            "eligibility_reasons": eligibility["reasons"],
            "match_score": match["match_score"],
            "matched_skills": match["matched_skills"],
            "missing_skills": match["missing_skills"],
            "target_role_match": target_role_match,
            "recruitment_rounds": rounds,
            "has_applied": job.id in applied_dict,
            "application_status": applied_dict.get(job.id, None)
        })

    # Sort: Target role matches & eligible first, then by match score
    results.sort(key=lambda x: (x["target_role_match"], x["is_eligible"], x["match_score"]), reverse=True)
    return results

@router.post("/apply/{student_id}/{job_id}")
def apply_job(student_id: int, job_id: int, db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not profile or not job:
        raise HTTPException(status_code=404, detail="Student or Job not found")

    # STRICT GUARDRAIL: Skill gap roadmap requires an authentic uploaded or built resume
    if not profile.resume_text or len(profile.resume_text.strip()) < 30:
        raise HTTPException(
            status_code=400,
            detail="Resume required. Please upload your PDF/Word resume or complete the Talent Shine Builder first before generating a personalized skill remediation roadmap."
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

    return {"message": "Application submitted", "status": "Applied"}

@router.get("/applications/{student_id}")
def get_student_applications(student_id: int, db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")

    apps = db.query(Application).filter(Application.student_id == student_id).all()
    results = []
    for a in apps:
        slot = a.interview_slot
        rounds = get_company_rounds(a.job.company.name if a.job.company else "")

        results.append({
            "id": a.id,
            "job_id": a.job_id,
            "job_title": a.job.title,
            "company": a.job.company.name,
            "ctc_lpa": a.job.ctc_lpa,
            "status": a.status,
            "match_score": a.match_score,
            "applied_at": a.applied_at.isoformat() if a.applied_at else "",
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

@router.get("/shortlisted-interviews/{student_id}")
def get_shortlisted_interviews(student_id: int, db: Session = Depends(get_db)):
    """Returns only the companies where this student is officially shortlisted/confirmed."""
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    results = []
    for app in profile.applications:
        if "shortlisted" in app.status.lower() or "confirmed" in app.status.lower():
            comp_name = app.job.company.name if app.job and app.job.company else "Company"
            rounds = get_company_rounds(comp_name)
            slot = app.interview_schedule
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
    db: Session = Depends(get_db)
):
    # STRICT GUARDRAIL: Candidate MUST be officially shortlisted by the company to unlock interview assessment!
    if student_id:
        profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
        if profile:
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

    pyq = fetch_pyq_for_company(company_name, round_type)
    return pyq

@router.post("/evaluate-mock")
def evaluate_mock(req: MockSubmissionRequest):
    question_data = {
        "company": req.company_name,
        "title": req.question_title,
        "required_concepts": req.required_concepts,
        "benchmark_summary": req.benchmark_summary
    }
    evaluation = evaluate_pyq_response(question_data, req.student_answer)
    return evaluation

@router.get("/roadmap/{student_id}/{job_id}")
def get_student_roadmap(student_id: int, job_id: int, db: Session = Depends(get_db)):
    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not profile or not job:
        raise HTTPException(status_code=404, detail="Student or Job not found")

    year_info = parse_vfstr_reg_no(profile.reg_no, profile.degree)
    
    # Calculate real missing skills between student profile skills and job required skills
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
