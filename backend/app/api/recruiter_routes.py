import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import RecruiterProfile, Company, JobPosting, Application, InterviewSchedule, Notification, StudentProfile
from app.ai_engine.venue_manager import VFSTR_CAMPUS_VENUES, DEFAULT_TIME_SLOTS, check_slot_collision, suggest_available_slots
from app.services.email_service import send_interview_pass_email, send_shortlist_email, send_reschedule_email
from app.core.security import get_current_user_payload

router = APIRouter(prefix="/recruiter", tags=["Recruiter Portal"])

def verify_recruiter_ownership(recruiter: RecruiterProfile, auth_payload: Optional[dict]):
    """Prevents Recruiter IDOR vulnerabilities."""
    if auth_payload and auth_payload.get("role") == "recruiter":
        if str(recruiter.user_id) != str(auth_payload.get("sub")):
            raise HTTPException(
                status_code=403,
                detail="Security Violation: You are not authorized to view or manage another corporate recruiter's drives or candidates."
            )

class PostJobRequest(BaseModel):
    title: str
    description: str
    job_type: str = "Full-Time"
    ctc_lpa: float
    min_cgpa: float = 6.5
    max_backlogs: int = 0
    eligible_branches: List[str] = ["CSE", "IT", "AI_DS", "ECE"]
    required_skills: List[str]
    eligible_years: List[int] = [4] # Recruiter explicitly selected!
    target_role_category: Optional[str] = "Software Development Engineer (SDE)"
    deadline: str = "2026-12-31"

class AllocateSlotRequest(BaseModel):
    application_id: int
    block_name: str
    chamber_name: str
    slot_date: str
    slot_time: str
    panel_name: str = "Panel 1 (Technical & Coding)"

@router.get("/dashboard/{recruiter_id}")
def get_recruiter_dashboard(recruiter_id: int, db: Session = Depends(get_db), auth_payload: dict = Depends(get_current_user_payload)):
    recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.id == recruiter_id).first()
    if not recruiter:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")
    verify_recruiter_ownership(recruiter, auth_payload)

    company = recruiter.company
    jobs = recruiter.posted_jobs
    job_ids = [j.id for j in jobs]
    total_apps = db.query(Application).filter(Application.job_id.in_(job_ids)).count() if job_ids else 0

    return {
        "recruiter_id": recruiter.id,
        "recruiter_name": recruiter.user.full_name,
        "company_name": company.name,
        "employee_id": recruiter.employee_id,
        "official_email": recruiter.official_email,
        "is_verified": bool(recruiter.is_verified and company.is_verified),
        "active_jobs_count": len(jobs),
        "total_applicants": total_apps,
        "available_blocks": list(VFSTR_CAMPUS_VENUES.keys()),
        "time_slots": DEFAULT_TIME_SLOTS
    }

@router.get("/jobs/{recruiter_id}")
def get_recruiter_jobs(recruiter_id: int, db: Session = Depends(get_db), auth_payload: dict = Depends(get_current_user_payload)):
    recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.id == recruiter_id).first()
    if not recruiter:
        raise HTTPException(status_code=404, detail="Recruiter not found")
    verify_recruiter_ownership(recruiter, auth_payload)

    results = []
    for j in recruiter.posted_jobs:
        results.append({
            "id": j.id,
            "title": j.title,
            "job_type": j.job_type,
            "ctc_lpa": j.ctc_lpa,
            "min_cgpa": j.min_cgpa,
            "eligible_years": j.eligible_years,
            "eligible_branches": j.eligible_branches,
            "required_skills": j.required_skills,
            "applications_count": len(j.applications)
        })
    return results

@router.post("/jobs/{recruiter_id}")
def post_job(recruiter_id: int, req: PostJobRequest, db: Session = Depends(get_db), auth_payload: dict = Depends(get_current_user_payload)):
    recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.id == recruiter_id).first()
    if not recruiter:
        raise HTTPException(status_code=404, detail="Recruiter not found")
    verify_recruiter_ownership(recruiter, auth_payload)

    job = JobPosting(
        company_id=recruiter.company_id,
        recruiter_id=recruiter.id,
        title=req.title,
        description=req.description,
        job_type=req.job_type,
        ctc_lpa=req.ctc_lpa,
        min_cgpa=req.min_cgpa,
        max_backlogs=req.max_backlogs,
        eligible_branches_json=json.dumps(req.eligible_branches),
        required_skills_json=json.dumps(req.required_skills),
        eligible_years_json=json.dumps(req.eligible_years), # Recruiter-selected years!
        target_role_category=req.target_role_category or "Software Development Engineer (SDE)",
        deadline=req.deadline,
        status="ACTIVE"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Dispatches smart notification to students matching criteria
    all_students = db.query(StudentProfile).all()
    notified = 0
    clean_branches = [b.upper() for b in req.eligible_branches]

    for s in all_students:
        if s.cgpa >= req.min_cgpa and s.branch.upper() in clean_branches:
            notif = Notification(
                user_id=s.user_id,
                title=f"🎯 New Campus Drive: {recruiter.company.name} ({req.ctc_lpa} LPA)",
                message=f"Drive opened for '{req.title}'. Eligible Years: {req.eligible_years} Year."
            )
            db.add(notif)
            notified += 1

    db.commit()
    return {"message": "Campus Drive published successfully", "job_id": job.id, "students_notified": notified}

@router.get("/applicants/{job_id}")
def get_applicants(job_id: int, db: Session = Depends(get_db), auth_payload: dict = Depends(get_current_user_payload)):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if auth_payload and auth_payload.get("role") == "recruiter":
        recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == auth_payload.get("sub")).first()
        if recruiter and job.company_id != recruiter.company_id:
            raise HTTPException(status_code=403, detail="Security Violation: You cannot view applicants for another company's drive.")

    apps = db.query(Application).filter(Application.job_id == job_id).all()
    results = []
    for a in apps:
        s = a.student
        slot = a.interview_slot
        results.append({
            "application_id": a.id,
            "student_id": s.id,
            "reg_no": s.reg_no,
            "name": s.user.full_name,
            "email": s.user.email,
            "branch": s.branch,
            "cgpa": s.cgpa,
            "skills": s.skills,
            "match_score": a.match_score,
            "is_eligible": a.is_eligible,
            "status": a.status,
            "scheduled_slot": {
                "block": slot.block_name,
                "chamber": slot.chamber_name,
                "date": slot.slot_date,
                "time": slot.slot_time,
                "panel": slot.panel_name
            } if slot else None
        })

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results

@router.post("/shortlist/{application_id}")
def shortlist_applicant(application_id: int, db: Session = Depends(get_db), auth_payload: dict = Depends(get_current_user_payload)):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if auth_payload and auth_payload.get("role") == "recruiter":
        recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == auth_payload.get("sub")).first()
        if recruiter and app.job and app.job.company_id != recruiter.company_id:
            raise HTTPException(status_code=403, detail="Security Violation: You cannot shortlist applicants for another company's drive.")

    # Transitions to Shortlisted (Slot Pending)
    app.status = "Shortlisted (Slot Pending)"
    db.commit()

    company_name = app.job.company.name if app.job and app.job.company else "Recruiting Employer"
    job_title = app.job.title if app.job else "Campus Recruit"

    # 1. In-App Notification
    notif = Notification(
        user_id=app.student.user_id,
        title=f"🎉 Shortlisted for {job_title}!",
        message=f"Congratulations! {company_name} shortlisted your application. Your panel slot will be allocated shortly."
    )
    db.add(notif)
    db.commit()

    # 2. Email Dispatch: Send real notification to student's email
    email_dispatch = send_shortlist_email(
        student_email=app.student.user.email,
        student_name=app.student.user.full_name,
        company=company_name,
        job_title=job_title
    )

    return {
        "message": f"Candidate shortlisted! Notification email dispatched to {app.student.user.email}.",
        "status": app.status,
        "email_delivery": email_dispatch.get("status")
    }

@router.get("/suggest-venues")
def suggest_venues(block: Optional[str] = "A Block", date: Optional[str] = None, db: Session = Depends(get_db)):
    all_slots = db.query(InterviewSchedule).all()
    suggestions = suggest_available_slots(all_slots, slot_date=date or "", block_preference=block or "A Block")
    return {
        "all_blocks": VFSTR_CAMPUS_VENUES,
        "time_slots": DEFAULT_TIME_SLOTS,
        "suggested_slots": suggestions
    }

@router.post("/allocate-slot")
def allocate_slot(req: AllocateSlotRequest, db: Session = Depends(get_db), auth_payload: dict = Depends(get_current_user_payload)):
    """Human-in-the-Loop Smart Scheduling with Strict Collision Protection"""
    app = db.query(Application).filter(Application.id == req.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if auth_payload and auth_payload.get("role") == "recruiter":
        recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.user_id == auth_payload.get("sub")).first()
        if recruiter and app.job and app.job.company_id != recruiter.company_id:
            raise HTTPException(status_code=403, detail="Security Violation: You cannot allocate interview chambers for another company's drive.")

    # 1. Collision Detection against all existing schedules considering Date, Time, Venue, and Student
    all_schedules = db.query(InterviewSchedule).filter(InterviewSchedule.application_id != req.application_id).all()
    col_check = check_slot_collision(
        existing_schedules=all_schedules,
        block=req.block_name,
        chamber=req.chamber_name,
        slot_date=req.slot_date,
        slot_time=req.slot_time,
        student_id=app.student_id
    )
    
    if col_check["collision"]:
        raise HTTPException(status_code=409, detail=col_check["reason"])

    # 2. Assign / Update Slot (Detect Rescheduling)
    existing_slot = db.query(InterviewSchedule).filter(InterviewSchedule.application_id == req.application_id).first()
    is_reschedule = False
    old_details = None

    if existing_slot:
        is_reschedule = True
        old_details = {
            "block": existing_slot.block_name,
            "chamber": existing_slot.chamber_name,
            "date": existing_slot.slot_date,
            "time": existing_slot.slot_time
        }
        existing_slot.block_name = req.block_name
        existing_slot.chamber_name = req.chamber_name
        existing_slot.slot_date = req.slot_date
        existing_slot.slot_time = req.slot_time
        existing_slot.panel_name = req.panel_name
        slot = existing_slot
    else:
        slot = InterviewSchedule(
            application_id=req.application_id,
            job_id=app.job_id,
            student_id=app.student_id,
            block_name=req.block_name,
            chamber_name=req.chamber_name,
            slot_date=req.slot_date,
            slot_time=req.slot_time,
            panel_name=req.panel_name,
            status="CONFIRMED"
        )
        db.add(slot)

    # 3. Update application status to Confirmed
    app.status = "Shortlisted (Slot Confirmed)"
    db.commit()

    company_name = app.job.company.name if app.job and app.job.company else "Corporate Partner"
    job_title = app.job.title if app.job else "Campus Drive"

    # 4. In-App Notification (Distinguishes initial booking from reschedule)
    if is_reschedule:
        notif = Notification(
            user_id=app.student.user_id,
            title=f"⚠️ Change Happened in Your Drive: {company_name}",
            message=f"Change happened in your drive: Your interview slot for '{job_title}' was rescheduled by the recruiter. New Schedule: {req.slot_date} at {req.slot_time} in {req.block_name} ({req.chamber_name}). Please regenerate your Hall Ticket."
        )
    else:
        notif = Notification(
            user_id=app.student.user_id,
            title=f"📅 Interview Pass Confirmed: {company_name}",
            message=f"Your slot is confirmed: {req.slot_date} at {req.slot_time} in {req.block_name} ({req.chamber_name})."
        )
    db.add(notif)
    db.commit()

    # 5. Registered Email Dispatch via Resend API
    if is_reschedule and old_details:
        email_dispatch = send_reschedule_email(
            student_email=app.student.user.email,
            student_name=app.student.user.full_name,
            company=company_name,
            job_title=job_title,
            old_details=old_details,
            new_block=req.block_name,
            new_chamber=req.chamber_name,
            new_slot_time=req.slot_time,
            new_slot_date=req.slot_date
        )
    else:
        email_dispatch = send_interview_pass_email(
            student_email=app.student.user.email,
            student_name=app.student.user.full_name,
            company=company_name,
            job_title=job_title,
            block=req.block_name,
            chamber=req.chamber_name,
            slot_time=req.slot_time,
            slot_date=req.slot_date
        )

    action_msg = "Interview slot rescheduled! Urgent change notification dispatched to candidate." if is_reschedule else "Interview slot allocated with zero conflicts! Pass sent to student email."
    return {
        "message": action_msg,
        "is_reschedule": is_reschedule,
        "status": app.status,
        "slot": {
            "block": req.block_name,
            "chamber": req.chamber_name,
            "date": req.slot_date,
            "time": req.slot_time
        }
    }
