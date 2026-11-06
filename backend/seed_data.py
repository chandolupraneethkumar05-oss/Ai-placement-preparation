import json
import os
from datetime import datetime, timezone
from app.database.session import SessionLocal, Base, engine
from app.models.all_models import (
    User, StudentProfile, Company, RecruiterProfile, JobPosting, 
    Application, InterviewSchedule, Notification, AcademicSemesterRecord, DriveAttendance
)
from app.core.security import get_password_hash
from app.ai_engine.resume_extractor import calculate_ats_score

def seed_database(force_recreate: bool = False):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    existing_users_count = db.query(User).count()
    if existing_users_count > 0 and not force_recreate:
        print(f"VFSTR Placement Database already initialized with {existing_users_count} users.")
        db.close()
        return

    if force_recreate:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    print("Seeding VFSTR Placement Database with institutional MOUs, Academic Semesters, and Smart Scheduling...")
    default_pw = get_password_hash("vignan123")

    # 1. College Administration (Dean / HOD)
    admin = User(
        identifier="dean_placements@vignan.ac.in",
        email="dean_placements@vignan.ac.in",
        hashed_password=default_pw,
        role="admin",
        full_name="Dr. K. V. Rao"
    )
    db.add(admin)
    db.commit()

    # 2. Companies & Recruiters with Authentic Institutional MOUs
    companies_data = [
        {
            "name": "Amazon",
            "domain": "amazon.com",
            "website": "https://amazon.jobs",
            "recruiter_name": "Vikram Seth",
            "email": "recruiter@amazon.com",
            "designation": "HR Campus Lead",
            "employee_id": "AMZ-HR-7891",
            "is_verified": True,
            "mou_reference_no": "VFSTR-MOU-AMZ-2024",
            "mou_valid_from": "2024-06-01",
            "mou_valid_till": "2027-05-31",
            "mou_category": "Tier-1 Strategic Hiring & AWS Cloud Lab",
            "mou_status": "ACTIVE"
        },
        {
            "name": "TCS",
            "domain": "tcs.com",
            "website": "https://tcs.com/careers",
            "recruiter_name": "Ananya Roy",
            "email": "careers@tcs.com",
            "designation": "Talent Partner",
            "employee_id": "TCS-TA-4021",
            "is_verified": True,
            "mou_reference_no": "VFSTR-MOU-TCS-2023",
            "mou_valid_from": "2023-08-01",
            "mou_valid_till": "2026-07-31",
            "mou_category": "Digital Hiring & Faculty Training",
            "mou_status": "ACTIVE"
        },
        {
            "name": "Infosys",
            "domain": "infosys.com",
            "website": "https://infosys.com",
            "recruiter_name": "Deepak Verma",
            "email": "campus@infosys.com",
            "designation": "HR Specialist",
            "employee_id": "INF-HR-9012",
            "is_verified": True,
            "mou_reference_no": "VFSTR-MOU-INF-2024",
            "mou_valid_from": "2024-01-01",
            "mou_valid_till": "2027-12-31",
            "mou_category": "Specialist Programmer Initiative",
            "mou_status": "ACTIVE"
        },
        {
            "name": "Cognizant",
            "domain": "cognizant.com",
            "website": "https://cognizant.com",
            "recruiter_name": "Rohan Mehra",
            "email": "campus@cognizant.com",
            "designation": "University Lead",
            "employee_id": "CTS-UR-3108",
            "is_verified": False,
            "mou_reference_no": "VFSTR-MOU-CTS-2021",
            "mou_valid_from": "2021-05-01",
            "mou_valid_till": "2024-04-30",
            "mou_category": "Campus Recruitment & Skill Training",
            "mou_status": "EXPIRED" # Demonstrates expired MOU scenario
        }
    ]

    company_objs = {}
    recruiter_objs = {}
    for c in companies_data:
        comp = Company(
            name=c["name"],
            domain=c["domain"],
            website=c["website"],
            is_verified=c["is_verified"],
            mou_reference_no=c["mou_reference_no"],
            mou_valid_from=c["mou_valid_from"],
            mou_valid_till=c["mou_valid_till"],
            mou_category=c["mou_category"],
            mou_status=c["mou_status"]
        )
        db.add(comp)
        db.commit()
        db.refresh(comp)
        company_objs[c["name"]] = comp

        rec_user = User(
            identifier=c["email"],
            email=c["email"],
            hashed_password=default_pw,
            role="recruiter",
            full_name=c["recruiter_name"]
        )
        db.add(rec_user)
        db.commit()
        db.refresh(rec_user)

        rec_prof = RecruiterProfile(
            user_id=rec_user.id,
            company_id=comp.id,
            designation=c["designation"],
            official_email=c["email"],
            employee_id=c["employee_id"],
            invitation_code="VFSTR-RECRUIT-2026",
            is_verified=c["is_verified"]
        )
        db.add(rec_prof)
        db.commit()
        db.refresh(rec_prof)
        recruiter_objs[c["name"]] = rec_prof

    # 3. Job Postings: 3 Active, 1 Pending Dean Approval (for demo)
    jobs_data = [
        {
            "company": "Amazon",
            "title": "Software Development Engineer (SDE-1)",
            "description": "Design and architect distributed web applications and high-throughput backend services.",
            "job_type": "Full-Time",
            "ctc_lpa": 32.0,
            "min_cgpa": 7.5,
            "max_backlogs": 0,
            "eligible_branches": ["CSE", "IT", "AI_DS"],
            "required_skills": ["Python", "Java", "Data Structures", "Algorithms", "SQL", "System Design"],
            "eligible_years": [4],
            "target_role": "Software Development Engineer (SDE)",
            "deadline": "2026-11-20",
            "status": "ACTIVE"
        },
        {
            "company": "TCS",
            "title": "Digital Software Developer",
            "description": "Enterprise cloud services, full-stack microservices, and database optimization.",
            "job_type": "Full-Time",
            "ctc_lpa": 7.5,
            "min_cgpa": 7.0,
            "max_backlogs": 0,
            "eligible_branches": ["CSE", "IT", "AI_DS", "ECE"],
            "required_skills": ["Python", "SQL", "FastAPI", "React", "Git"],
            "eligible_years": [4],
            "target_role": "Full-Stack Web Developer",
            "deadline": "2026-11-25",
            "status": "ACTIVE"
        },
        {
            "company": "Amazon",
            "title": "Summer AI / ML Engineering Intern",
            "description": "3-month summer research and engineering internship exploring ML model fine-tuning and computer vision pipelines.",
            "job_type": "Internship",
            "ctc_lpa": 12.0,
            "min_cgpa": 7.0,
            "max_backlogs": 0,
            "eligible_branches": ["CSE", "AI_DS"],
            "required_skills": ["Python", "Machine Learning", "PyTorch", "SQL"],
            "eligible_years": [3],
            "target_role": "AI & Machine Learning Engineer",
            "deadline": "2026-11-30",
            "status": "ACTIVE"
        },
        {
            "company": "Cognizant",
            "title": "GenC Next Developer (Cloud & Microservices)",
            "description": "Development of enterprise microservices and event-driven architectures.",
            "job_type": "Full-Time",
            "ctc_lpa": 6.75,
            "min_cgpa": 6.5,
            "max_backlogs": 0,
            "eligible_branches": ["CSE", "IT", "AI_DS", "ECE"],
            "required_skills": ["Java", "Spring Boot", "SQL", "Git"],
            "eligible_years": [4],
            "target_role": "Full-Stack Web Developer",
            "deadline": "2026-12-15",
            "status": "PENDING_DEAN_APPROVAL" # Demonstrates Dean Approval & MOU renewal gate
        }
    ]

    job_objs = []
    for jd in jobs_data:
        comp = company_objs[jd["company"]]
        rec = recruiter_objs[jd["company"]]
        job = JobPosting(
            company_id=comp.id,
            recruiter_id=rec.id,
            title=jd["title"],
            description=jd["description"],
            job_type=jd["job_type"],
            ctc_lpa=jd["ctc_lpa"],
            min_cgpa=jd["min_cgpa"],
            max_backlogs=jd["max_backlogs"],
            eligible_branches_json=json.dumps(jd["eligible_branches"]),
            required_skills_json=json.dumps(jd["required_skills"]),
            eligible_years_json=json.dumps(jd["eligible_years"]),
            target_role_category=jd["target_role"],
            deadline=jd["deadline"],
            status=jd["status"]
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        job_objs.append(job)

    # 4. Standard Pre-Configured Sample Students
    sample_students = [
        {
            "reg_no": "231FA05001",
            "full_name": "Rahul Sharma",
            "email": "231fa05001@vignan.ac.in",
            "degree": "B.Tech",
            "branch": "CSE",
            "cgpa": 8.85,
            "target_role": "Software Development Engineer (SDE)",
            "target_company": "Amazon",
            "skills": ["Python", "Java", "Data Structures", "Algorithms", "SQL", "System Design", "FastAPI", "React", "Git"],
            "honors": ["Dean's Merit Scholar 2024", "Specialization in Distributed Systems"],
            "certifications": ["AWS Certified Cloud Practitioner", "Oracle Certified Java Associate"],
            "semesters": [
                {"sem": 1, "sgpa": 8.50, "cgpa": 8.50, "backlogs": 0, "cleared": True},
                {"sem": 2, "sgpa": 8.70, "cgpa": 8.60, "backlogs": 0, "cleared": True},
                {"sem": 3, "sgpa": 8.90, "cgpa": 8.70, "backlogs": 1, "cleared": True, "note": "Cleared Math-III in Supplementary (Nov 2024)"},
                {"sem": 4, "sgpa": 9.05, "cgpa": 8.79, "backlogs": 0, "cleared": True},
                {"sem": 5, "sgpa": 8.95, "cgpa": 8.82, "backlogs": 0, "cleared": True},
                {"sem": 6, "sgpa": 8.92, "cgpa": 8.85, "backlogs": 0, "cleared": True}
            ],
            "resume_text": """Rahul Sharma
231fa05001@vignan.ac.in | +91 9876543210 | Guntur, AP | linkedin.com/in/rahulsharma | github.com/rahulsharma

PROFESSIONAL SUMMARY
Proactive Computer Science undergraduate with strong foundation in distributed systems, full-stack development, and algorithmic problem solving. Experienced in building scalable APIs and cloud-ready web applications.

EDUCATION
Vignan's Foundation for Science, Technology and Research (VFSTR)
Bachelor of Technology in Computer Science and Engineering
CGPA: 8.85 / 10.0 | Expected Graduation: May 2027

TECHNICAL SKILLS
- Programming Languages: Python, Java, C++, SQL, JavaScript
- Frameworks & Libraries: FastAPI, React, Spring Boot, Node.js
- Core Concepts: Data Structures, Algorithms, Object-Oriented Design, System Design, Database Management Systems
- Developer Tools: Git, GitHub, Docker, Postman, Linux

PROJECTS
High-Throughput Microservice Platform | Python, FastAPI, PostgreSQL, Docker
- Architected and deployed a containerized microservice capable of handling 4,500+ requests per second with sub-40ms latency.
- Implemented JWT authentication, connection pooling, and optimized SQL queries to reduce DB query times by 35%.

AutoPlace Campus Placement Portal | React, TypeScript, FastAPI, SQLite
- Designed an intelligent placement automation tool with real-time ATS resume screening and conflict-free interview chamber scheduling.
- Integrated automated email notifications and eligibility validation engine adhering to institutional norms.

CERTIFICATIONS & ACHIEVEMENTS
- Finalist, National Smart India Hackathon
- LeetCode Knight (Top 5% globally, 500+ DSA problems solved)"""
        },
        {
            "reg_no": "241FA05001",
            "full_name": "Priya Nair",
            "email": "241fa05001@vignan.ac.in",
            "degree": "B.Tech",
            "branch": "AI_DS",
            "cgpa": 8.40,
            "target_role": "AI & Machine Learning Engineer",
            "target_company": "Amazon",
            "skills": ["Python", "Machine Learning", "PyTorch", "SQL", "Data Structures", "Git"],
            "honors": ["AI Research Merit Scholar"],
            "certifications": ["TensorFlow Developer Certificate"],
            "semesters": [
                {"sem": 1, "sgpa": 8.20, "cgpa": 8.20, "backlogs": 0, "cleared": True},
                {"sem": 2, "sgpa": 8.40, "cgpa": 8.30, "backlogs": 0, "cleared": True},
                {"sem": 3, "sgpa": 8.50, "cgpa": 8.37, "backlogs": 0, "cleared": True},
                {"sem": 4, "sgpa": 8.45, "cgpa": 8.40, "backlogs": 0, "cleared": True}
            ],
            "resume_text": """Priya Nair
241fa05001@vignan.ac.in | +91 9123456780 | Vadlamudi, AP | linkedin.com/in/priyanair | github.com/priyanair

PROFESSIONAL SUMMARY
Motivated Artificial Intelligence & Data Science student with practical experience in deep learning models, data analytics, and PyTorch pipelines.

EDUCATION
Vignan's Foundation for Science, Technology and Research (VFSTR)
Bachelor of Technology in Artificial Intelligence & Data Science
CGPA: 8.40 / 10.0 | Expected Graduation: May 2028

TECHNICAL SKILLS
- Languages: Python, SQL
- ML & AI: Machine Learning, PyTorch, Scikit-Learn, Pandas, NumPy
- Core: Data Structures, Linear Algebra, Probability, Git

PROJECTS
Vision-Based Quality Inspection | Python, PyTorch, OpenCV
- Developed CNN classification pipeline achieving 94.2% accuracy on anomaly detection.
- Utilized data augmentation and transfer learning to reduce training time by 40%."""
        }
    ]

    for s in sample_students:
        s_user = User(
            identifier=s["reg_no"],
            email=s["email"],
            hashed_password=default_pw,
            role="student",
            full_name=s["full_name"]
        )
        db.add(s_user)
        db.commit()
        db.refresh(s_user)

        ats_eval = calculate_ats_score(s["resume_text"], s["skills"])
        start_yr = int("20" + s["reg_no"][:2])
        profile = StudentProfile(
            user_id=s_user.id,
            reg_no=s["reg_no"],
            degree=s["degree"],
            duration_years=4,
            start_year=start_yr,
            end_year=start_yr + 4,
            branch=s["branch"],
            cgpa=s["cgpa"],
            active_backlogs=0,
            skills_json=json.dumps(s["skills"]),
            resume_text=s["resume_text"],
            ats_score=ats_eval.get("ats_score", 82),
            ats_feedback_json=json.dumps(ats_eval.get("recommendations", [])),
            target_role=s["target_role"],
            target_company=s["target_company"],
            placement_status="UNPLACED",
            honors_json=json.dumps(s.get("honors", [])),
            certifications_json=json.dumps(s.get("certifications", []))
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

        # Seed Semester Records
        for sem in s.get("semesters", []):
            sem_rec = AcademicSemesterRecord(
                student_id=profile.id,
                semester_num=sem["sem"],
                sgpa=sem["sgpa"],
                cgpa_at_sem=sem["cgpa"],
                credits_earned=22,
                backlogs_in_sem=sem["backlogs"],
                is_cleared=sem["cleared"],
                cleared_date=sem.get("note", None)
            )
            db.add(sem_rec)

    # 5. Seed Applications and an Interview slot for Rahul Sharma with Amazon SDE-1
    amazon_sde = db.query(JobPosting).filter(JobPosting.title.like("%SDE-1%")).first()
    rahul_prof = db.query(StudentProfile).filter(StudentProfile.reg_no == "231FA05001").first()

    if amazon_sde and rahul_prof:
        appl = Application(
            student_id=rahul_prof.id,
            job_id=amazon_sde.id,
            status="Shortlisted (Slot Confirmed)",
            match_score=92,
            is_eligible=True,
            eligibility_reason="Eligible: Meets all academic & institutional criteria",
            missing_skills_json="[]"
        )
        db.add(appl)
        db.commit()
        db.refresh(appl)

        # Schedule Interview Slot
        slot = InterviewSchedule(
            application_id=appl.id,
            job_id=amazon_sde.id,
            student_id=rahul_prof.id,
            block_name="A Block",
            chamber_name="Chamber A-204 (Interview Panel 1)",
            slot_date="2026-11-20",
            slot_time="10:30 AM - 11:00 AM",
            panel_name="Panel 1 (Technical & Coding)",
            status="CONFIRMED"
        )
        db.add(slot)

        # Seed Drive Attendance (Stage attendance: PPT and Technical Interview)
        att1 = DriveAttendance(
            job_id=amazon_sde.id,
            student_id=rahul_prof.id,
            event_type="PPT",
            status="PRESENT",
            verified_by="T&P Verification Desk",
            hall_ticket_scan_hash=f"VFSTR-{rahul_prof.reg_no}-PPT-2026"
        )
        att2 = DriveAttendance(
            job_id=amazon_sde.id,
            student_id=rahul_prof.id,
            event_type="TECHNICAL_INTERVIEW",
            status="PRESENT",
            verified_by="Panel 1 In-Charge",
            hall_ticket_scan_hash=f"VFSTR-{rahul_prof.reg_no}-TECH-2026"
        )
        db.add_all([att1, att2])

        # Seed Notifications for student
        n1 = Notification(
            user_id=rahul_prof.user_id,
            title="🎯 Application Received: Amazon SDE-1",
            message="Your application for SDE-1 at Amazon was received.",
            is_read=False
        )
        n2 = Notification(
            user_id=rahul_prof.user_id,
            title="🎉 Shortlisted for Amazon SDE-1!",
            message="Amazon shortlisted your profile. Your interview pass has been generated.",
            is_read=False
        )
        n3 = Notification(
            user_id=rahul_prof.user_id,
            title="📅 Interview Pass Confirmed: Amazon",
            message="Your slot: 2026-11-20 at 10:30 AM in A Block (Chamber A-204).",
            is_read=False
        )
        db.add_all([n1, n2, n3])
        db.commit()

    print("Database seeded successfully with MOUs, academic semesters, stage attendance, and real notifications!")
    db.close()

if __name__ == "__main__":
    seed_database(force_recreate=True)
