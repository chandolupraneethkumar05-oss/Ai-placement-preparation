import json
import os
from app.database.session import SessionLocal, Base, engine
from app.models.all_models import User, StudentProfile, Company, RecruiterProfile, JobPosting, Application, InterviewSchedule, Notification
from app.core.security import get_password_hash
from app.ai_engine.resume_extractor import calculate_ats_score

def seed_database(force_recreate: bool = False):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # STRICT PERSISTENCE: If database already contains accounts and not forcing recreate, preserve user accounts!
    existing_users_count = db.query(User).count()
    if existing_users_count > 0 and not force_recreate:
        print(f"VFSTR Placement Database already initialized with {existing_users_count} users. Preserving registered accounts.")
        cognizant = db.query(Company).filter(Company.name == "Cognizant").first()
        if cognizant and cognizant.is_verified:
            cognizant.is_verified = False
            db.commit()
        db.close()
        return

    if force_recreate:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    print("Seeding VFSTR Placement Database with genuine non-hardcoded schemas and Talent Shine builder support...")
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

    # 2. Companies & Recruiters (3 Verified Industry Partners, 1 Pending Accreditation Review)
    companies_data = [
        {"name": "Amazon", "domain": "amazon.com", "website": "https://amazon.jobs", "recruiter_name": "Vikram Seth", "email": "recruiter@amazon.com", "designation": "Campus Lead", "employee_id": "AMZ-HR-7891", "is_verified": True},
        {"name": "TCS", "domain": "tcs.com", "website": "https://tcs.com/careers", "recruiter_name": "Ananya Roy", "email": "careers@tcs.com", "designation": "Talent Partner", "employee_id": "TCS-TA-4021", "is_verified": True},
        {"name": "Infosys", "domain": "infosys.com", "website": "https://infosys.com", "recruiter_name": "Deepak Verma", "email": "campus@infosys.com", "designation": "HR Specialist", "employee_id": "INF-HR-9012", "is_verified": True},
        {"name": "Cognizant", "domain": "cognizant.com", "website": "https://cognizant.com", "recruiter_name": "Rohan Mehra", "email": "campus@cognizant.com", "designation": "University Lead", "employee_id": "CTS-UR-3108", "is_verified": False}
    ]

    company_objs = {}
    recruiter_objs = {}
    for c in companies_data:
        comp = Company(name=c["name"], domain=c["domain"], website=c["website"], is_verified=c.get("is_verified", False))
        db.add(comp)
        db.commit()
        db.refresh(comp)
        company_objs[c["name"]] = comp

        rec_user = User(identifier=c["email"], email=c["email"], hashed_password=default_pw, role="recruiter", full_name=c["recruiter_name"])
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
            is_verified=True
        )
        db.add(rec_prof)
        db.commit()
        db.refresh(rec_prof)
        recruiter_objs[c["name"]] = rec_prof

    # 3. Job Postings with recruiter-selected academic years
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
            "deadline": "2026-11-20"
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
            "deadline": "2026-11-25"
        },
        {
            "company": "Infosys",
            "title": "Specialist Programmer (SP)",
            "description": "Advanced competitive coding, algorithmic optimization, and backend engineering.",
            "job_type": "Full-Time",
            "ctc_lpa": 9.5,
            "min_cgpa": 7.5,
            "max_backlogs": 0,
            "eligible_branches": ["CSE", "IT", "AI_DS"],
            "required_skills": ["C++", "Java", "Data Structures", "Algorithms"],
            "eligible_years": [4],
            "target_role": "Software Development Engineer (SDE)",
            "deadline": "2026-12-01"
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
            "deadline": "2026-11-30"
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
            status="ACTIVE"
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        job_objs.append(job)

    # 4. Standard Pre-Configured Sample Students (for instant login & evaluation)
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
        # In 2026, 231 batch B.Tech is 4th Year, 241 batch B.Tech is 3rd Year
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
            ats_feedback_json=json.dumps(ats_eval.get("feedback", [])),
            target_role=s["target_role"],
            target_company=s["target_company"],
            placement_status="UNPLACED"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    print("Database initialized successfully with sample accounts (Admin, Recruiters, and Verified Students)!")
    db.commit()
    db.close()

if __name__ == "__main__":
    seed_database(force_recreate=True)
