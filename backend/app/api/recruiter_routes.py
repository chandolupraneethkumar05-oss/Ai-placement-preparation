import json
import csv
import io
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Any
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.all_models import (
    User, RecruiterProfile, Company, JobPosting, Application, 
    InterviewSchedule, Notification, StudentProfile, AcademicSemesterRecord
)
from app.ai_engine.venue_manager import VFSTR_CAMPUS_VENUES, DEFAULT_TIME_SLOTS, check_slot_collision, suggest_available_slots
from app.services.email_service import send_interview_pass_email, send_shortlist_email, send_reschedule_email
from app.core.security import require_recruiter_role, get_current_user_payload
from app.core.events import broadcaster

router = APIRouter(prefix="/recruiter", tags=["Recruiter Portal"])

def sanitize_csv_cell(val: Any) -> Any:
    """Neutralizes formula injection characters (=, +, -, @, \\t, \\r)."""
    if val is None:
        return ""
    s = str(val)
    if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{s}"
    return s

def verify_recruiter_ownership(recruiter: RecruiterProfile, auth_payload: Optional[dict]):
    """Strictly prevents Recruiter IDOR and unauthenticated access."""
    if not auth_payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in as a corporate recruiter."
        )
    role = auth_payload.get("role")
    if role == "admin":
        return
    if role != "recruiter":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Corporate recruiter credentials required."
        )
    if str(recruiter.user_id) != str(auth_payload.get("sub")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Security Violation: You are not authorized to view or manage another corporate recruiter's drives or candidates."
        )

def verify_job_ownership(job: JobPosting, auth_payload: Optional[dict]):
    """Ensures a recruiter can only manage candidates and scheduling for their own job drives."""
    if not auth_payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    role = auth_payload.get("role")
    if role == "admin":
        return
    if role != "recruiter":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Corporate recruiter credentials required.")
    if job.recruiter and str(job.recruiter.user_id) != str(auth_payload.get("sub")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Security Violation: You cannot access or modify applicants for a drive belonging to another recruiter."
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
    eligible_years: List[int] = [4]
    target_role_category: Optional[str] = "Software Development Engineer (SDE)"
    deadline: str = "2026-12-31"

class AllocateSlotRequest(BaseModel):
    application_id: int
    block_name: str
    chamber_name: str
    slot_date: str
    slot_time: str
    panel_name: str = "Panel 1 (Technical & Coding)"

class AutoScheduleBatchRequest(BaseModel):
    job_id: Optional[int] = None
    slot_duration_minutes: Optional[int] = 45
    interview_date: Optional[str] = None
    default_venue: Optional[str] = None

@router.get("/dashboard/{recruiter_id}")
def get_recruiter_dashboard(
    recruiter_id: int, 
    db: Session = Depends(get_db), 
    auth_payload: dict = Depends(get_current_user_payload)
):
    recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.id == recruiter_id).first()
    if not recruiter:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")
    verify_recruiter_ownership(recruiter, auth_payload)

    company = recruiter.company
    jobs = recruiter.posted_jobs
    job_ids = [j.id for j in jobs]
    
    total_apps = db.query(Application).filter(Application.job_id.in_(job_ids)).count() if job_ids else 0
    shortlisted_apps = db.query(Application).filter(
        Application.job_id.in_(job_ids), 
        Application.status.in_(["Shortlisted", "Shortlisted (Slot Pending)", "Shortlisted (Slot Confirmed)"])
    ).count() if job_ids else 0

    return {
        "recruiter_id": recruiter.id,
        "name": recruiter.user.full_name,
        "company_name": company.name,
        "company_domain": company.domain,
        "is_verified": recruiter.is_verified,
        "total_jobs": len(jobs),
        "total_applications": total_apps,
        "total_shortlisted": shortlisted_apps,
        "mou_status": getattr(company, "mou_status", "ACTIVE"),
        "mou_reference_no": getattr(company, "mou_reference_no", "VFSTR-MOU-GEN-2024")
    }

@router.get("/jobs/{recruiter_id}")
def get_recruiter_jobs(
    recruiter_id: int, 
    db: Session = Depends(get_db), 
    auth_payload: dict = Depends(get_current_user_payload)
):
    recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.id == recruiter_id).first()
    if not recruiter:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")
    verify_recruiter_ownership(recruiter, auth_payload)

    jobs = db.query(JobPosting).filter(JobPosting.recruiter_id == recruiter.id).all()
    results = []
    for j in jobs:
        results.append({
            "id": j.id,
            "title": j.title,
            "company_name": j.company.name if j.company else "",
            "mou_status": getattr(j.company, "mou_status", "ACTIVE"),
            "mou_reference_no": getattr(j.company, "mou_reference_no", ""),
            "ctc_lpa": j.ctc_lpa,
            "min_cgpa": j.min_cgpa,
            "max_backlogs": j.max_backlogs,
            "eligible_branches": j.eligible_branches,
            "eligible_years": j.eligible_years,
            "required_skills": j.required_skills,
            "status": j.status,
            "deadline": j.deadline,
            "applications_count": len(j.applications)
        })
    return results

@router.post("/jobs/{recruiter_id}")
def create_job_posting(
    recruiter_id: int, 
    job_req: PostJobRequest, 
    db: Session = Depends(get_db), 
    auth_payload: dict = Depends(get_current_user_payload)
):
    """
    Creates a new campus recruitment drive.
    Defaults to 'PENDING_DEAN_APPROVAL' under Institutional MOU Governance.
    """
    recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.id == recruiter_id).first()
    if not recruiter:
        raise HTTPException(status_code=404, detail="Recruiter profile not found")
    verify_recruiter_ownership(recruiter, auth_payload)

    company = recruiter.company
    job_status = "PENDING_DEAN_APPROVAL"

    new_job = JobPosting(
        recruiter_id=recruiter.id,
        company_id=recruiter.company_id,
        title=job_req.title,
        description=job_req.description,
        job_type=job_req.job_type,
        ctc_lpa=job_req.ctc_lpa,
        min_cgpa=job_req.min_cgpa,
        max_backlogs=job_req.max_backlogs,
        eligible_branches_json=json.dumps(job_req.eligible_branches),
        eligible_years_json=json.dumps(job_req.eligible_years),
        required_skills_json=json.dumps(job_req.required_skills),
        target_role_category=job_req.target_role_category or "Software Development Engineer (SDE)",
        deadline=job_req.deadline,
        status=job_status
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    # Dispatches institutional notification to Dean of Placements
    admin_users = db.query(User).filter(User.role == "admin").all()
    for admin in admin_users:
        db.add(Notification(
            user_id=admin.id,
            title="📋 New Campus Drive Awaiting Approval",
            message=f"Recruiter {recruiter.user.full_name} ({company.name}) submitted '{new_job.title}' ({new_job.ctc_lpa} LPA). MOU compliance verification required."
        ))
    db.commit()

    return {
        "message": "Campus Recruitment Drive registered successfully! Pending Dean MOU compliance approval.",
        "job_id": new_job.id,
        "status": new_job.status,
        "company_name": company.name,
        "mou_status": getattr(company, "mou_status", "ACTIVE")
    }

@router.get("/applicants/{job_id}")
def get_job_applicants(
    job_id: int, 
    db: Session = Depends(get_db), 
    auth_payload: dict = Depends(get_current_user_payload)
):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job drive not found")
    verify_job_ownership(job, auth_payload)

    applicants = []
    for a in job.applications:
        st = a.student
        slot = a.interview_slot
        applicants.append({
            "application_id": a.id,
            "student_id": st.id,
            "reg_no": st.reg_no,
            "name": st.user.full_name if st.user else "",
            "email": st.user.email if st.user else "",
            "degree": st.degree,
            "branch": st.branch,
            "cgpa": st.cgpa,
            "active_backlogs": st.active_backlogs,
            "match_score": a.match_score,
            "ats_score": st.ats_score,
            "status": a.status,
            "applied_at": a.applied_at.isoformat() if a.applied_at else "",
            "has_resume": bool(st.resume_text),
            "interview_slot": {
                "block": slot.block_name,
                "chamber": slot.chamber_name,
                "date": slot.slot_date,
                "time": slot.slot_time,
                "panel": slot.panel_name,
                "status": slot.status
            } if slot else None
        })
    return applicants

@router.post("/shortlist/{application_id}")
def shortlist_applicant(
    application_id: int, 
    db: Session = Depends(get_db), 
    auth_payload: dict = Depends(get_current_user_payload)
):
    """Recruiter explicitly shortlists a student for the interview stage."""
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    verify_job_ownership(app.job, auth_payload)

    app.status = "Shortlisted (Slot Pending)"
    db.commit()

    company_name = app.job.company.name if app.job and app.job.company else "Corporate Partner"
    db.add(Notification(
        user_id=app.student.user_id,
        title=f"🎉 Congratulations! Shortlisted by {company_name}",
        message=f"You have been shortlisted for '{app.job.title}'. Your physical interview chamber slot will be allocated shortly."
    ))
    db.commit()

    email_res = send_shortlist_email(
        student_email=app.student.user.email if app.student.user else f"{app.student.reg_no.lower()}@vignan.ac.in",
        student_name=app.student.user.full_name,
        company=company_name,
        job_title=app.job.title
    )
    delivery_status = "delivered" if email_res.get("delivered") else "simulated"

    return {
        "message": f"Candidate {app.student.reg_no} successfully shortlisted!",
        "status": app.status,
        "application_id": app.id,
        "email_delivery": delivery_status
    }

@router.get("/suggest-venues")
def suggest_venues(
    block: str = "A Block", 
    date: str = "2026-11-20", 
    db: Session = Depends(get_db)
):
    all_schedules = db.query(InterviewSchedule).all()
    suggestions = suggest_available_slots(all_schedules, target_block=block, target_date=date)
    return {
        "all_blocks": VFSTR_CAMPUS_VENUES,
        "time_slots": DEFAULT_TIME_SLOTS,
        "suggested_slots": suggestions
    }

@router.post("/allocate-slot")
def allocate_slot(
    req: AllocateSlotRequest, 
    db: Session = Depends(get_db), 
    auth_payload: dict = Depends(get_current_user_payload)
):
    """Human-in-the-Loop Smart Scheduling with Strict Collision Protection."""
    app = db.query(Application).filter(Application.id == req.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    verify_job_ownership(app.job, auth_payload)

    # Collision Detection against all existing schedules
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

    existing_slot = db.query(InterviewSchedule).filter(InterviewSchedule.application_id == req.application_id).first()
    is_reschedule = False

    if existing_slot:
        is_reschedule = True
        existing_slot.block_name = req.block_name
        existing_slot.chamber_name = req.chamber_name
        existing_slot.slot_date = req.slot_date
        existing_slot.slot_time = req.slot_time
        existing_slot.panel_name = req.panel_name
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

    app.status = "Shortlisted (Slot Confirmed)"
    db.commit()

    company_name = app.job.company.name if app.job and app.job.company else "Corporate Partner"
    job_title = app.job.title if app.job else "Campus Drive"

    if is_reschedule:
        notif = Notification(
            user_id=app.student.user_id,
            title=f"⚠️ Change Happened in Your Drive: {company_name}",
            message=f"Change happened in your drive: Your interview slot for '{job_title}' was rescheduled by the recruiter to {req.slot_date} at {req.slot_time} in {req.block_name} ({req.chamber_name}). Please regenerate your Hall Ticket."
        )
    else:
        notif = Notification(
            user_id=app.student.user_id,
            title=f"📅 Interview Pass Confirmed: {company_name}",
            message=f"Your slot is confirmed: {req.slot_date} at {req.slot_time} in {req.block_name} ({req.chamber_name}). Your Hall Ticket is now active."
        )
    db.add(notif)
    db.commit()

    return {
        "message": "Interview slot rescheduled!" if is_reschedule else "Interview slot allocated with zero conflicts!",
        "is_reschedule": is_reschedule,
        "status": app.status,
        "slot": {
            "block": req.block_name,
            "chamber": req.chamber_name,
            "date": req.slot_date,
            "time": req.slot_time
        }
    }

def execute_batch_scheduling(
    job_id: int, 
    requested_date: Optional[str], 
    db: Session, 
    auth_payload: Optional[dict]
):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    verify_job_ownership(job, auth_payload)

    # CRITICAL RULE: ONLY schedule candidates who have been officially shortlisted!
    # Never automatically schedule candidates in 'Applied' status.
    apps = db.query(Application).filter(
        Application.job_id == job_id,
        Application.status.in_(["Shortlisted (Slot Pending)", "Shortlisted"])
    ).all()

    if not apps:
        return {
            "message": "No candidates pending interview scheduling. Ensure applicants are shortlisted first.",
            "scheduled_count": 0,
            "unallocated_count": 0,
            "scheduled_candidates": []
        }

    # Dynamic target date: validate if provided, or compute 7 days ahead
    if requested_date:
        drive_date = requested_date.strip()
    else:
        drive_date = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d")

    panels = [
        {"name": "Panel 1 (Technical & Coding)", "block": "A Block", "chamber": "Chamber A-204 (Interview Panel 1)"},
        {"name": "Panel 2 (System Design & Core CS)", "block": "H Block", "chamber": "Seminar Hall H-2"},
        {"name": "Panel 3 (Executive & Leadership)", "block": "NTR Library", "chamber": "Digital Conference Room"}
    ]
    time_slots = DEFAULT_TIME_SLOTS

    all_schedules = db.query(InterviewSchedule).all()
    scheduled = []
    unallocated = []

    for app in apps:
        chosen_panel = None
        chosen_slot = None

        # Search for a collision-free panel and slot combination
        for panel_cfg in panels:
            for slot_time in time_slots:
                col = check_slot_collision(
                    existing_schedules=all_schedules,
                    block=panel_cfg["block"],
                    chamber=panel_cfg["chamber"],
                    slot_date=drive_date,
                    slot_time=slot_time,
                    student_id=app.student_id
                )
                if not col["collision"]:
                    chosen_panel = panel_cfg
                    chosen_slot = slot_time
                    break
            if chosen_slot:
                break

        # If no slot is free on standard panels, check other university chambers
        if not chosen_slot:
            for block_key, chambers in VFSTR_CAMPUS_VENUES.items():
                for chamber_info in chambers:
                    for slot_time in time_slots:
                        col = check_slot_collision(
                            existing_schedules=all_schedules,
                            block=block_key,
                            chamber=chamber_info["chamber"],
                            slot_date=drive_date,
                            slot_time=slot_time,
                            student_id=app.student_id
                        )
                        if not col["collision"]:
                            chosen_panel = {"name": f"Ad-hoc Panel ({chamber_info['chamber']})", "block": block_key, "chamber": chamber_info["chamber"]}
                            chosen_slot = slot_time
                            break
                    if chosen_slot:
                        break
                if chosen_slot:
                    break

        # If still no slot available without collision, DO NOT FORCE COLLISION!
        if not chosen_slot:
            unallocated.append({
                "student_name": app.student.user.full_name if app.student.user else app.student.reg_no,
                "reg_no": app.student.reg_no,
                "reason": "Chambers and panels are fully booked for the requested date. Additional interview session required."
            })
            continue

        if app.interview_slot:
            db.delete(app.interview_slot)
            db.flush()

        new_slot = InterviewSchedule(
            application_id=app.id,
            job_id=job.id,
            student_id=app.student_id,
            block_name=chosen_panel["block"],
            chamber_name=chosen_panel["chamber"],
            slot_date=drive_date,
            slot_time=chosen_slot,
            panel_name=chosen_panel["name"],
            status="CONFIRMED"
        )
        db.add(new_slot)
        all_schedules.append(new_slot)

        app.status = "Shortlisted (Slot Confirmed)"

        notif = Notification(
            user_id=app.student.user_id,
            title=f"📅 Interview Pass Confirmed: {job.company.name}",
            message=f"Smart Scheduler allocated your slot: {drive_date} at {chosen_slot} in {chosen_panel['block']} ({chosen_panel['chamber']}). Your Hall Ticket is now available!"
        )
        db.add(notif)

        scheduled.append({
            "student_name": app.student.user.full_name if app.student.user else app.student.reg_no,
            "reg_no": app.student.reg_no,
            "panel": chosen_panel["name"],
            "chamber": f"{chosen_panel['chamber']} ({chosen_panel['block']})",
            "time": chosen_slot,
            "date": drive_date
        })

    db.commit()
    return {
        "message": f"Successfully auto-scheduled {len(scheduled)} candidate(s) with zero room/candidate collisions!" + (f" ({len(unallocated)} unallocated due to room capacity)." if unallocated else ""),
        "scheduled_count": len(scheduled),
        "unallocated_count": len(unallocated),
        "scheduled_candidates": scheduled,
        "unallocated_candidates": unallocated
    }

@router.post("/auto-schedule-batch/{job_id}")
def auto_schedule_batch_path(
    job_id: int, 
    db: Session = Depends(get_db), 
    auth_payload: dict = Depends(get_current_user_payload)
):
    """Path-based endpoint for batch interview scheduling."""
    return execute_batch_scheduling(job_id, requested_date=None, db=db, auth_payload=auth_payload)

@router.post("/auto-schedule-batch")
def auto_schedule_batch_body(
    payload: AutoScheduleBatchRequest, 
    db: Session = Depends(get_db), 
    auth_payload: dict = Depends(get_current_user_payload)
):
    """Body-based endpoint for batch interview scheduling matching frontend contract."""
    if not payload.job_id:
        raise HTTPException(status_code=400, detail="job_id is required in request body")
    return execute_batch_scheduling(payload.job_id, requested_date=payload.interview_date, db=db, auth_payload=auth_payload)

@router.get("/student-dossier/{student_id}")
def get_student_academic_dossier(
    student_id: int, 
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(get_current_user_payload)
):
    """Comprehensive Academic Dossier for Recruiter Evaluation."""
    if not auth_payload or auth_payload.get("role") not in ("recruiter", "admin"):
        raise HTTPException(status_code=403, detail="Corporate recruiter or administrator privileges required.")

    profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    sem_records = db.query(AcademicSemesterRecord).filter(
        AcademicSemesterRecord.student_id == student_id
    ).order_by(AcademicSemesterRecord.semester_num.asc()).all()

    sem_list = []
    total_credits = 0
    total_backlogs_ever = 0
    for s in sem_records:
        total_credits += s.credits_earned
        total_backlogs_ever += s.backlogs_in_sem
        sem_list.append({
            "semester_num": s.semester_num,
            "sgpa": s.sgpa,
            "cgpa_at_sem": s.cgpa_at_sem,
            "credits_earned": s.credits_earned,
            "backlogs_in_sem": s.backlogs_in_sem,
            "is_cleared": s.is_cleared,
            "cleared_date": s.cleared_date
        })

    return {
        "student_id": profile.id,
        "name": profile.user.full_name if profile.user else "",
        "reg_no": profile.reg_no,
        "degree": profile.degree,
        "branch": profile.branch,
        "overall_cgpa": profile.cgpa,
        "active_backlogs": profile.active_backlogs,
        "historical_backlogs_count": total_backlogs_ever,
        "total_credits_earned": total_credits,
        "placement_status": profile.placement_status,
        "target_role": profile.target_role,
        "ats_score": profile.ats_score,
        "skills": profile.skills,
        "honors": profile.honors,
        "certifications": profile.certifications,
        "semester_progression": sem_list,
        "resume_text_available": bool(profile.resume_text)
    }

@router.get("/export-applicants/{job_id}")
def export_applicants_csv(
    job_id: int, 
    db: Session = Depends(get_db),
    auth_payload: dict = Depends(get_current_user_payload)
):
    """Download applicants as CSV with formula injection protection."""
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    verify_job_ownership(job, auth_payload)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Reg No", "Candidate Name", "Email", "Department", "CGPA", "Match Score", "Status", "Scheduled Slot"])

    for a in job.applications:
        slot = a.interview_slot
        slot_str = f"{slot.slot_date} {slot.slot_time} ({slot.chamber_name})" if slot else "Not Scheduled"
        writer.writerow([
            sanitize_csv_cell(a.student.reg_no),
            sanitize_csv_cell(a.student.user.full_name if a.student.user else ""),
            sanitize_csv_cell(a.student.user.email if a.student.user else ""),
            sanitize_csv_cell(a.student.branch),
            sanitize_csv_cell(a.student.cgpa),
            sanitize_csv_cell(f"{a.match_score}%"),
            sanitize_csv_cell(a.status),
            sanitize_csv_cell(slot_str)
        ])

    output.seek(0)
    company_clean = (job.company.name if job.company else "Company").replace(" ", "_")
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={company_clean}_{job.id}_Applicants.csv"}
    )
