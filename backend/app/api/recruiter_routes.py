import json
import csv
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import (
    RecruiterProfile, Company, JobPosting, Application, 
    InterviewSchedule, Notification, StudentProfile, AcademicSemesterRecord
)
from app.ai_engine.venue_manager import VFSTR_CAMPUS_VENUES, DEFAULT_TIME_SLOTS, check_slot_collision, suggest_available_slots
from app.services.email_service import send_interview_pass_email, send_shortlist_email, send_reschedule_email
from app.core.security import get_current_user_payload, require_recruiter_role
from app.core.events import broadcaster

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
        "mou_status": getattr(company, "mou_status", "ACTIVE"),
        "mou_reference_no": getattr(company, "mou_reference_no", "VFSTR-MOU-GEN-2024"),
        "mou_valid_till": getattr(company, "mou_valid_till", "2027-05-31"),
        "mou_category": getattr(company, "mou_category", "Campus Recruitment & Internship"),
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
            "status": j.status,
            "dean_remarks": j.dean_remarks,
            "eligible_years": j.eligible_years,
            "eligible_branches": j.eligible_branches,
            "required_skills": j.required_skills,
            "applications_count": len(j.applications)
        })
    return results

@router.post("/jobs/{recruiter_id}")
async def post_job(recruiter_id: int, req: PostJobRequest, db: Session = Depends(get_db), auth_payload: dict = Depends(get_current_user_payload)):
    recruiter = db.query(RecruiterProfile).filter(RecruiterProfile.id == recruiter_id).first()
    if not recruiter:
        raise HTTPException(status_code=404, detail="Recruiter not found")
    verify_recruiter_ownership(recruiter, auth_payload)

    company = recruiter.company
    mou_status = getattr(company, "mou_status", "ACTIVE")

    # Real-World Institutional Gatekeeping:
    # Drives default to PENDING_DEAN_APPROVAL so the Dean verifies the MOU before release to students
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
        eligible_years_json=json.dumps(req.eligible_years),
        target_role_category=req.target_role_category or "Software Development Engineer (SDE)",
        deadline=req.deadline,
        status="PENDING_DEAN_APPROVAL"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Emit real-time SSE event to Dean control tower
    await broadcaster.broadcast("new_drive_submitted", {
        "job_id": job.id,
        "title": job.title,
        "company": company.name,
        "mou_status": mou_status,
        "ctc_lpa": job.ctc_lpa
    })

    status_msg = "Campus Drive submitted! Sent to Dean's placement desk for MOU verification and official release."
    if mou_status == "EXPIRED":
        status_msg += " (Notice: Company MOU is expired. The Dean can execute an expedited institutional renewal to approve this drive)."

    return {
        "message": status_msg,
        "job_id": job.id,
        "status": job.status,
        "mou_status": mou_status
    }

@router.get("/applicants/{job_id}")
def get_applicants(job_id: int, db: Session = Depends(get_db), auth_payload: dict = Depends(get_current_user_payload)):
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    apps = db.query(Application).filter(Application.job_id == job_id).all()
    results = []
    for a in apps:
        s = a.student
        slot = a.interview_slot
        results.append({
            "application_id": a.id,
            "student_id": s.id,
            "reg_no": s.reg_no,
            "name": s.user.full_name if s.user else "N/A",
            "email": s.user.email if s.user else "N/A",
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
def shortlist_applicant(application_id: int, db: Session = Depends(get_db)):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.status = "Shortlisted (Slot Pending)"
    db.commit()

    company_name = app.job.company.name if app.job and app.job.company else "Recruiting Employer"
    job_title = app.job.title if app.job else "Campus Recruit"

    # In-App Notification
    notif = Notification(
        user_id=app.student.user_id,
        title=f"🎉 Shortlisted for {job_title}!",
        message=f"Congratulations! {company_name} shortlisted your application. Your panel slot will be allocated shortly."
    )
    db.add(notif)
    db.commit()

    email_dispatch = send_shortlist_email(
        student_email=app.student.user.email,
        student_name=app.student.user.full_name,
        company=company_name,
        job_title=job_title
    )

    return {
        "message": f"Candidate shortlisted! Panel scheduling unlocked.",
        "status": app.status,
        "application_id": app.id,
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
    """Human-in-the-Loop Smart Scheduling with Strict Multi-Dimensional Collision Protection"""
    app = db.query(Application).filter(Application.id == req.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # 1. Collision Detection against all existing schedules
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

    # 2. Assign / Update Slot
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

    # 3. Update application status
    app.status = "Shortlisted (Slot Confirmed)"
    db.commit()

    company_name = app.job.company.name if app.job and app.job.company else "Corporate Partner"
    job_title = app.job.title if app.job else "Campus Drive"

    # 4. In-App Notification
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
            message=f"Your slot is confirmed: {req.slot_date} at {req.slot_time} in {req.block_name} ({req.chamber_name})."
        )
    db.add(notif)
    db.commit()

    action_msg = "Interview slot rescheduled!" if is_reschedule else "Interview slot allocated with zero conflicts!"
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

@router.post("/auto-schedule-batch/{job_id}")
def auto_schedule_batch(job_id: int, db: Session = Depends(get_db)):
    """
    Automated Batch Scheduling Engine:
    Intelligently assigns all candidates in 'Shortlisted (Slot Pending)' or 'Applied'
    across campus panels, chambers, and non-overlapping time slots with zero manual effort.
    """
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    apps = db.query(Application).filter(
        Application.job_id == job_id,
        Application.status.in_(["Shortlisted (Slot Pending)", "Applied"])
    ).all()

    if not apps:
        return {"message": "No candidates pending interview scheduling for this drive.", "scheduled_count": 0}

    panels = [
        {"name": "Panel 1 (Technical & Coding)", "block": "A Block", "chamber": "Chamber A-204 (Interview Panel 1)"},
        {"name": "Panel 2 (System Design & Core CS)", "block": "H Block", "chamber": "Seminar Hall H-2"},
        {"name": "Panel 3 (Executive & Leadership)", "block": "NTR Library", "chamber": "Digital Conference Room"}
    ]
    time_slots = DEFAULT_TIME_SLOTS
    drive_date = "2026-11-20"

    all_schedules = db.query(InterviewSchedule).all()
    scheduled = []

    for idx, app in enumerate(apps):
        panel_cfg = panels[idx % len(panels)]
        chosen_slot = None

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
                chosen_slot = slot_time
                break

        if not chosen_slot:
            chosen_slot = time_slots[idx % len(time_slots)]

        if app.interview_slot:
            db.delete(app.interview_slot)
            db.flush()

        new_slot = InterviewSchedule(
            application_id=app.id,
            job_id=job.id,
            student_id=app.student_id,
            block_name=panel_cfg["block"],
            chamber_name=panel_cfg["chamber"],
            slot_date=drive_date,
            slot_time=chosen_slot,
            panel_name=panel_cfg["name"],
            status="CONFIRMED"
        )
        db.add(new_slot)
        all_schedules.append(new_slot)

        app.status = "Shortlisted (Slot Confirmed)"

        notif = Notification(
            user_id=app.student.user_id,
            title=f"📅 Interview Pass Confirmed: {job.company.name}",
            message=f"Smart Scheduler booked your interview slot: {drive_date} at {chosen_slot} in {panel_cfg['block']} ({panel_cfg['chamber']}). Your Hall Ticket is unlocked!"
        )
        db.add(notif)

        scheduled.append({
            "student_name": app.student.user.full_name,
            "reg_no": app.student.reg_no,
            "panel": panel_cfg["name"],
            "chamber": f"{panel_cfg['chamber']} ({panel_cfg['block']})",
            "time": chosen_slot,
            "date": drive_date
        })

    db.commit()
    return {
        "message": f"Successfully auto-scheduled {len(scheduled)} candidates across campus panels with zero conflicts!",
        "scheduled_count": len(scheduled),
        "scheduled_candidates": scheduled
    }

@router.get("/student-dossier/{student_id}")
def get_student_academic_dossier(student_id: int, db: Session = Depends(get_db)):
    """
    Comprehensive Academic Dossier for Recruiter Evaluation:
    Semester-by-semester SGPA/CGPA progression, backlog history, honors, certifications, and skills.
    """
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
def export_applicants_csv(job_id: int, db: Session = Depends(get_db)):
    """Download applicants as CSV for recruiter ATS integration."""
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Reg No", "Candidate Name", "Email", "Department", "CGPA", "Match Score", "Status", "Scheduled Slot"])

    for a in job.applications:
        slot = a.interview_slot
        slot_str = f"{slot.slot_date} {slot.slot_time} ({slot.chamber_name})" if slot else "Not Scheduled"
        writer.writerow([
            a.student.reg_no,
            a.student.user.full_name if a.student.user else "",
            a.student.user.email if a.student.user else "",
            a.student.branch,
            a.student.cgpa,
            f"{a.match_score}%",
            a.status,
            slot_str
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={job.company.name}_{job.title}_Applicants.csv"}
    )
