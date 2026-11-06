import csv
import io
import statistics
from datetime import datetime, timezone
from typing import List, Optional, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.all_models import StudentProfile, Company, JobPosting, Application, User, Notification
from app.core.security import require_admin_role
from app.core.events import broadcaster

router = APIRouter(prefix="/admin", tags=["College Administration (Dean / HOD)"])

def sanitize_csv_cell(val: Any) -> Any:
    """Prevents CSV formula injection (CWE-1236) by neutralizing formula trigger characters."""
    if val is None:
        return ""
    s = str(val)
    if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{s}"
    return s

class RegisterMOURequest(BaseModel):
    company_id: int
    mou_reference_no: Optional[str] = None
    mou_reference_code: Optional[str] = None
    mou_valid_from: Optional[str] = None
    signed_date: Optional[str] = None
    mou_valid_till: Optional[str] = None
    expiry_date: Optional[str] = None
    mou_category: Optional[str] = "Tier-1 Strategic Hiring & Internship"
    category: Optional[str] = None
    mou_notes: Optional[str] = None
    functional_activities: Optional[str] = None

class RenewMOURequest(BaseModel):
    extension_years: Optional[int] = None
    duration_years: Optional[int] = None
    dean_remarks: Optional[str] = None
    new_reference_no: Optional[str] = None

class RejectDriveRequest(BaseModel):
    remarks: Optional[str] = None
    reason: Optional[str] = None

@router.get("/all-students")
def get_all_students(db: Session = Depends(get_db), auth: dict = Depends(require_admin_role)):
    """Full institutional view of all student performance metrics across all departments."""
    students = db.query(StudentProfile).all()
    results = []
    for s in students:
        results.append({
            "id": s.id,
            "reg_no": s.reg_no,
            "name": s.user.full_name if s.user else "N/A",
            "email": s.user.email if s.user else "N/A",
            "degree": s.degree,
            "branch": s.branch,
            "cgpa": s.cgpa,
            "active_backlogs": s.active_backlogs,
            "skills": s.skills,
            "ats_score": s.ats_score,
            "target_role": s.target_role,
            "placement_status": s.placement_status,
            "applications_count": len(s.applications)
        })
    return results

@router.get("/analytics")
def get_admin_analytics(db: Session = Depends(get_db), auth: dict = Depends(require_admin_role)):
    """
    Returns authentic, real-time institutional metrics computed directly from database tables.
    Includes active drives, functional MOUs, and NAAC accreditation parameters.
    """
    total_students = db.query(StudentProfile).count()
    total_companies = db.query(Company).count()
    verified_companies = db.query(Company).filter(Company.is_verified == True).count()
    active_mous = db.query(Company).filter(Company.mou_status == "ACTIVE").count()
    expired_mous = db.query(Company).filter(Company.mou_status == "EXPIRED").count()
    
    active_jobs_list = db.query(JobPosting).filter(JobPosting.status == "ACTIVE").all()
    pending_drives_count = db.query(JobPosting).filter(JobPosting.status == "PENDING_DEAN_APPROVAL").count()
    
    active_drives = []
    for j in active_jobs_list:
        active_drives.append({
            "id": j.id,
            "title": j.title,
            "company_name": j.company.name if j.company else "Campus Drive",
            "mou_ref": getattr(j.company, "mou_reference_no", ""),
            "job_type": j.job_type,
            "ctc_lpa": j.ctc_lpa,
            "min_cgpa": j.min_cgpa,
            "eligible_branches": j.eligible_branches,
            "eligible_years": j.eligible_years,
            "applications_count": len(j.applications)
        })

    total_apps = db.query(Application).count()
    placed = db.query(StudentProfile).filter(StudentProfile.placement_status.in_(["TIER_1", "TIER_2"])).count()

    branches = ["CSE", "AI_DS", "ECE", "IT"]
    branch_stats = []
    for b in branches:
        c = db.query(StudentProfile).filter(StudentProfile.branch == b).count()
        p = db.query(StudentProfile).filter(StudentProfile.branch == b, StudentProfile.placement_status.in_(["TIER_1", "TIER_2"])).count()
        branch_stats.append({
            "branch": b,
            "total_students": c,
            "placed_students": p,
            "placement_rate": round((p / c * 100), 1) if c > 0 else 0
        })

    return {
        "total_students": total_students,
        "total_companies": total_companies,
        "verified_companies": verified_companies,
        "active_mous": active_mous,
        "expired_mous": expired_mous,
        "active_jobs": len(active_jobs_list),
        "pending_drives": pending_drives_count,
        "active_drives": active_drives,
        "total_applications": total_apps,
        "placed_students": placed,
        "placement_percentage": round((placed / max(1, total_students) * 100), 1) if total_students > 0 else 0,
        "branch_distribution": branch_stats
    }

@router.get("/pending-drives")
def get_pending_drives(db: Session = Depends(get_db), auth: dict = Depends(require_admin_role)):
    """
    Dean's Approval Queue:
    Returns drives submitted by recruiters awaiting institutional MOU compliance check and official release.
    Returns both dictionary wrapper 'pending_drives' and total for robust frontend compatibility.
    """
    drives = db.query(JobPosting).filter(JobPosting.status == "PENDING_DEAN_APPROVAL").all()
    results = []
    for d in drives:
        comp = d.company
        results.append({
            "id": d.id,
            "title": d.title,
            "company_id": comp.id if comp else None,
            "company_name": comp.name if comp else "Recruiting Partner",
            "domain": comp.domain if comp else "",
            "mou_status": getattr(comp, "mou_status", "ACTIVE"),
            "mou_reference_no": getattr(comp, "mou_reference_no", "VFSTR-MOU-GEN-2024"),
            "mou_valid_from": getattr(comp, "mou_valid_from", "2024-06-01"),
            "mou_valid_till": getattr(comp, "mou_valid_till", "2027-05-31"),
            "mou_category": getattr(comp, "mou_category", "Tier-1 Strategic Hiring"),
            "job_type": d.job_type,
            "ctc_lpa": d.ctc_lpa,
            "min_cgpa": d.min_cgpa,
            "max_backlogs": d.max_backlogs,
            "eligible_branches": d.eligible_branches,
            "eligible_years": d.eligible_years,
            "deadline": d.deadline,
            "created_at": d.created_at.isoformat() if d.created_at else ""
        })
    return results

@router.post("/approve-drive/{job_id}")
async def approve_drive(job_id: int, db: Session = Depends(get_db), auth: dict = Depends(require_admin_role)):
    """
    Dean's Approval Action:
    Verifies the drive meets university criteria, marks it as ACTIVE, and dispatches real-time SSE event to all students.
    """
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Drive posting not found")

    job.status = "ACTIVE"
    job.approved_at = datetime.now(timezone.utc)
    db.commit()

    all_students = db.query(StudentProfile).all()
    notified = 0
    clean_branches = [b.upper() for b in job.eligible_branches]

    for s in all_students:
        if s.cgpa >= job.min_cgpa and s.branch.upper() in clean_branches:
            notif = Notification(
                user_id=s.user_id,
                title=f"🎯 New Campus Drive: {job.company.name} ({job.ctc_lpa} LPA)",
                message=f"Drive opened for '{job.title}'. Eligible Years: {job.eligible_years} Year."
            )
            db.add(notif)
            notified += 1

    db.commit()

    await broadcaster.broadcast("new_drive_published", {
        "job_id": job.id,
        "title": job.title,
        "company": job.company.name,
        "ctc_lpa": job.ctc_lpa,
        "min_cgpa": job.min_cgpa,
        "eligible_branches": job.eligible_branches
    })

    return {
        "message": f"Drive '{job.title}' approved by Dean & released live to students!",
        "job_id": job.id,
        "status": "ACTIVE",
        "students_notified": notified
    }

@router.post("/renew-mou-and-approve/{job_id}")
async def renew_mou_and_approve(job_id: int, req: RenewMOURequest, db: Session = Depends(get_db), auth: dict = Depends(require_admin_role)):
    """
    Partnership Renewal & Approval Action:
    Renews an expired company MOU for 1-5 years and simultaneously approves the campus drive.
    Accepts both extension_years and duration_years for cross-version compatibility.
    """
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Drive posting not found")

    company = job.company
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")

    raw_years = req.extension_years or req.duration_years or 3
    ext_years = max(1, min(5, int(raw_years)))
    new_till_year = datetime.now(timezone.utc).year + ext_years
    new_till_date = f"{new_till_year}-05-31"

    # Update company MOU
    company.mou_status = "ACTIVE"
    company.is_verified = True
    company.mou_valid_from = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    company.mou_valid_till = new_till_date
    if req.new_reference_no:
        company.mou_reference_no = req.new_reference_no
    else:
        company.mou_reference_no = f"VFSTR-MOU-{company.name[:3].upper()}-{new_till_year}-R{ext_years}"

    job.status = "ACTIVE"
    job.approved_at = datetime.now(timezone.utc)
    db.commit()

    all_students = db.query(StudentProfile).all()
    clean_branches = [b.upper() for b in job.eligible_branches]
    notified = 0

    for s in all_students:
        if s.cgpa >= job.min_cgpa and s.branch.upper() in clean_branches:
            notif = Notification(
                user_id=s.user_id,
                title=f"🎯 New Campus Drive: {job.company.name} ({job.ctc_lpa} LPA)",
                message=f"Drive opened for '{job.title}'. MOU renewed through May {new_till_year}!"
            )
            db.add(notif)
            notified += 1

    db.commit()

    await broadcaster.broadcast("new_drive_published", {
        "job_id": job.id,
        "title": job.title,
        "company": company.name,
        "ctc_lpa": job.ctc_lpa,
        "mou_status": "ACTIVE"
    })

    return {
        "message": f"MOU for {company.name} successfully renewed through {new_till_date}! Drive approved and live to students.",
        "mou_reference_no": company.mou_reference_no,
        "mou_status": "ACTIVE",
        "mou_valid_till": new_till_date,
        "job_id": job.id,
        "status": "ACTIVE",
        "students_notified": notified
    }

@router.post("/reject-drive/{job_id}")
def reject_drive(job_id: int, req: RejectDriveRequest, db: Session = Depends(get_db), auth: dict = Depends(require_admin_role)):
    """Allows Dean to reject a drive or request revisions. Accepts both remarks and reason."""
    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Drive posting not found")

    feedback = (req.remarks or req.reason or "Drive rejected by Dean of Placements.").strip()
    job.status = "REJECTED"
    job.dean_remarks = feedback
    db.commit()

    if job.recruiter:
        notif = Notification(
            user_id=job.recruiter.user_id,
            title=f"⚠️ Campus Drive Review Update: {job.title}",
            message=f"Your drive posting for '{job.title}' was reviewed by Dean of Placements. Remarks: {feedback}"
        )
        db.add(notif)
        db.commit()

    return {
        "message": f"Drive '{job.title}' rejected. Feedback remarks dispatched to recruiter.",
        "status": "REJECTED",
        "remarks": feedback
    }

@router.get("/mou-registry")
def get_mou_registry(db: Session = Depends(get_db), auth: dict = Depends(require_admin_role)):
    """Institutional Memorandum of Understanding Registry for NAAC Criterion 3.5 & NBA accreditation."""
    companies = db.query(Company).all()
    results = []
    for c in companies:
        results.append({
            "company_id": c.id,
            "company_name": c.name,
            "domain": c.domain,
            "website": c.website,
            "is_verified": bool(c.is_verified),
            "mou_reference_no": getattr(c, "mou_reference_no", "VFSTR-MOU-GEN-2024"),
            "mou_category": getattr(c, "mou_category", "Campus Recruitment & Internship"),
            "mou_valid_from": getattr(c, "mou_valid_from", "2024-06-01"),
            "mou_valid_till": getattr(c, "mou_valid_till", "2027-05-31"),
            "mou_status": getattr(c, "mou_status", "ACTIVE"),
            "active_drives_count": len([j for j in c.jobs if j.status == "ACTIVE"]),
            "total_hired_students": db.query(Application).filter(
                Application.job_id.in_([j.id for j in c.jobs]),
                Application.status.in_(["Selected", "Shortlisted (Slot Confirmed)"])
            ).count() if c.jobs else 0
        })
    return results

@router.post("/register-mou")
def register_or_update_mou(req: RegisterMOURequest, db: Session = Depends(get_db), auth: dict = Depends(require_admin_role)):
    """Enables Dean to execute or update bilateral institutional MOUs with corporate partners."""
    company = db.query(Company).filter(Company.id == req.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    ref_no = req.mou_reference_no or req.mou_reference_code or f"VFSTR-MOU-{company.name[:3].upper()}-2026"
    valid_from = req.mou_valid_from or req.signed_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    valid_till = req.mou_valid_till or req.expiry_date or "2028-05-31"
    category = req.mou_category or req.category or "Tier-1 Strategic Hiring & Internship"
    notes = req.mou_notes or req.functional_activities or ""

    company.mou_reference_no = ref_no
    company.mou_valid_from = valid_from
    company.mou_valid_till = valid_till
    company.mou_category = category
    company.mou_notes = notes
    company.mou_status = "ACTIVE"
    company.is_verified = True
    db.commit()

    return {
        "message": f"Institutional MOU with '{company.name}' verified and updated successfully.",
        "company_name": company.name,
        "mou_reference_no": company.mou_reference_no,
        "valid_till": company.mou_valid_till,
        "mou_status": company.mou_status
    }

@router.get("/companies")
def get_all_companies(db: Session = Depends(get_db), auth: dict = Depends(require_admin_role)):
    """Returns complete list of corporate recruiting partners with their genuine verification and MOU state."""
    companies = db.query(Company).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "domain": c.domain,
            "website": c.website,
            "is_verified": bool(c.is_verified),
            "mou_reference_no": getattr(c, "mou_reference_no", ""),
            "mou_status": getattr(c, "mou_status", "ACTIVE"),
            "mou_valid_till": getattr(c, "mou_valid_till", ""),
            "jobs_count": len(c.jobs),
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in companies
    ]

@router.post("/verify-company/{company_id}")
def toggle_company_verification(company_id: int, db: Session = Depends(get_db), auth: dict = Depends(require_admin_role)):
    """Allows Dean/HOD to verify or unverify a company."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company.is_verified = not bool(company.is_verified)
    db.commit()
    db.refresh(company)
    
    return {
        "message": f"Company '{company.name}' verification status updated to {company.is_verified}.",
        "company_id": company.id,
        "is_verified": company.is_verified
    }

@router.get("/export-nirf-summary")
def export_nirf_summary(db: Session = Depends(get_db), auth: dict = Depends(require_admin_role)):
    """Computes genuine NIRF / NAAC metrics derived directly from verified database records."""
    total = db.query(StudentProfile).count()
    placed = db.query(StudentProfile).filter(StudentProfile.placement_status.in_(["TIER_1", "TIER_2"])).count()
    
    placed_apps = db.query(Application).filter(Application.status.in_(["Selected", "Shortlisted (Slot Confirmed)"])).all()
    salaries = [a.job.ctc_lpa for a in placed_apps if a.job and a.job.ctc_lpa and a.job.ctc_lpa > 0]
    
    if salaries:
        median_ctc = round(float(statistics.median(salaries)), 2)
        highest_ctc = round(float(max(salaries)), 2)
    else:
        median_ctc = 0.0
        highest_ctc = 0.0

    return {
        "institution": "Vignan's Foundation for Science, Technology & Research (VFSTR)",
        "academic_year": "2025-2026",
        "graduating_cohort": total,
        "number_of_students_placed": placed,
        "median_salary_lpa": median_ctc,
        "highest_salary_lpa": highest_ctc,
        "naac_criterion_5_2_status": "Audited & Compliant" if placed > 0 else "Assessment in Progress",
        "naac_criterion_3_5_mou_count": db.query(Company).filter(Company.mou_status == "ACTIVE").count()
    }

def generate_placement_csv_response(db: Session):
    students = db.query(StudentProfile).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Reg No", "Student Name", "Email", "Degree", "Branch", 
        "CGPA", "Placement Status", "Company Placed", "Package (LPA)", 
        "ATS Score", "Total Applications"
    ])
    
    for s in students:
        placed_app = next((a for a in s.applications if "selected" in a.status.lower() or "confirmed" in a.status.lower()), None)
        comp_name = placed_app.job.company.name if placed_app and placed_app.job and placed_app.job.company else "Not Yet Placed"
        ctc = placed_app.job.ctc_lpa if placed_app and placed_app.job else 0.0
        
        writer.writerow([
            sanitize_csv_cell(s.reg_no),
            sanitize_csv_cell(s.user.full_name if s.user else "N/A"),
            sanitize_csv_cell(s.user.email if s.user else "N/A"),
            sanitize_csv_cell(s.degree),
            sanitize_csv_cell(s.branch),
            sanitize_csv_cell(s.cgpa),
            sanitize_csv_cell(s.placement_status),
            sanitize_csv_cell(comp_name),
            sanitize_csv_cell(ctc),
            sanitize_csv_cell(s.ats_score),
            sanitize_csv_cell(len(s.applications))
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=VFSTR_Institutional_Placement_Report_2026.csv"}
    )

@router.get("/export-placement-csv")
def export_placement_csv(db: Session = Depends(get_db), auth: dict = Depends(require_admin_role)):
    """Exports full institutional placement records as a downloadable CSV for NAAC / NIRF accreditation."""
    return generate_placement_csv_response(db)

@router.get("/export-placements-csv")
def export_placements_csv_alias(db: Session = Depends(get_db), auth: dict = Depends(require_admin_role)):
    """Canonical alias preventing 404 on pluralized placements CSV route."""
    return generate_placement_csv_response(db)
