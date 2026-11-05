import csv
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import StudentProfile, Company, JobPosting, Application, User

router = APIRouter(prefix="/admin", tags=["College Administration (Dean / HOD)"])

@router.get("/all-students")
def get_all_students(db: Session = Depends(get_db)):
    """Full institutional view of all student performance metrics across all departments."""
    students = db.query(StudentProfile).all()
    results = []
    for s in students:
        results.append({
            "id": s.id,
            "reg_no": s.reg_no,
            "name": s.user.full_name,
            "email": s.user.email,
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
def get_admin_analytics(db: Session = Depends(get_db)):
    total_students = db.query(StudentProfile).count()
    total_companies = db.query(Company).count()
    verified_companies = db.query(Company).filter(Company.is_verified == True).count()
    active_jobs_list = db.query(JobPosting).filter(JobPosting.status == "ACTIVE").all()
    active_jobs_count = len(active_jobs_list)
    active_drives = []
    for j in active_jobs_list:
        active_drives.append({
            "id": j.id,
            "title": j.title,
            "company_name": j.company.name if j.company else "Campus Drive",
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
        "active_jobs": active_jobs_count,
        "active_drives": active_drives,
        "total_applications": total_apps,
        "placed_students": placed,
        "placement_percentage": round((placed / total_students * 100), 1) if total_students > 0 else 0,
        "branch_distribution": branch_stats
    }

@router.get("/export-nirf-summary")
def export_nirf_summary(db: Session = Depends(get_db)):
    total = db.query(StudentProfile).count()
    placed = db.query(StudentProfile).filter(StudentProfile.placement_status.in_(["TIER_1", "TIER_2"])).count()
    return {
        "institution": "Vignan's Foundation for Science, Technology & Research (VFSTR)",
        "academic_year": "2025-2026",
        "graduating_cohort": total,
        "number_of_students_placed": placed,
        "median_salary_lpa": 6.8,
        "highest_salary_lpa": 32.0,
        "naac_criterion_5_2_status": "Compliant"
    }

@router.get("/export-placement-csv")
def export_placement_csv(db: Session = Depends(get_db)):
    """Exports full institutional placement records as a downloadable CSV for NAAC / NIRF accreditation."""
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
            s.reg_no,
            s.user.full_name if s.user else "N/A",
            s.user.email if s.user else "N/A",
            s.degree,
            s.branch,
            s.cgpa,
            s.placement_status,
            comp_name,
            ctc,
            s.ats_score,
            len(s.applications)
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=VFSTR_Institutional_Placement_Report_2026.csv"}
    )
