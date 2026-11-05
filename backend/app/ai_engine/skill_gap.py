from app.ai_engine.year_calculator import parse_vfstr_reg_no

ROADMAP_TEMPLATES = {
    1: [
        {"day": "Month 1-2", "title": "Programming & Logic Fundamentals", "details": "Master Python/C syntax, loops, OOP concepts and Git/GitHub repository management.", "priority": "High"},
        {"day": "Month 3-4", "title": "Mathematical Foundations", "details": "Discrete mathematics, linear algebra basics, and time complexity notation (Big-O).", "priority": "Medium"},
        {"day": "Month 5-6", "title": "Introductory Data Structures", "details": "Arrays, Strings, Linked Lists and basic sorting algorithms on LeetCode/HackerRank.", "priority": "High"}
    ],
    2: [
        {"day": "Month 1-2", "title": "Advanced Data Structures & Algorithms", "details": "Trees, Graphs, Dynamic Programming, and Recursion problems.", "priority": "High"},
        {"day": "Month 3-4", "title": "Core CS Foundations & Databases", "details": "DBMS (SQL normalization, indexing), OS concepts (threads, processes), Computer Networks.", "priority": "High"},
        {"day": "Month 5-6", "title": "Mini Project & Stack Specialization", "details": "Build a full-stack CRUD application or ML classification pipeline with clean README.", "priority": "Medium"}
    ],
    3: [
        {"day": "Month 1-2", "title": "Domain Mastery & Target Stack", "details": "Deep dive into target tech stack (FastAPI/React/AWS or PyTorch/MLOps).", "priority": "High"},
        {"day": "Month 3-4", "title": "Competitive Coding & Core Revision", "details": "Solve Top 100 Interview Questions on LeetCode + System Design fundamentals.", "priority": "High"},
        {"day": "Month 5-6", "title": "Summer Internship Preparation", "details": "Resume ATS optimization, mock interviews, and applying for 3rd year summer internships.", "priority": "High"}
    ],
    4: [
        {"day": "Phase 1 (Week 1)", "title": "Target Company Skill Gap Intensive", "details": "Rapidly bridge missing skills flagged by the AI agent before the campus drive date.", "priority": "Critical"},
        {"day": "Phase 2 (Week 2)", "title": "Aptitude & Technical MCQ Speed Drill", "details": "Practice Quantitative Aptitude, Logical Reasoning, and Core Subject MCQs for online test.", "priority": "High"},
        {"day": "Phase 3 (Week 3-4)", "title": "Mock Technical & HR Interviews", "details": "Project deep-dive defense, Behavioral questions (STAR methodology), and live coding mock.", "priority": "Urgent"}
    ]
}

def generate_personalized_roadmap(
    student=None, 
    job=None, 
    missing_skills=None,
    student_year=None,
    batch=None,
    job_title=None,
    company=None,
    **kwargs
):
    """
    Generates a personalized, structured skill gap remediation roadmap.
    Accepts both object-based and keyword-based parameters cleanly.
    """
    if missing_skills is None:
        missing_skills = []

    # Resolve student info
    reg_no = getattr(student, "reg_no", None) or kwargs.get("reg_no", "211FA05001")
    degree = getattr(student, "degree", None) or kwargs.get("degree", "B.Tech")
    
    year_label = student_year
    batch_str = batch
    year_num = 4

    if reg_no:
        try:
            y_info = parse_vfstr_reg_no(reg_no, degree)
            year_label = year_label or y_info["year_label"]
            batch_str = batch_str or y_info["batch"]
            year_num = min(4, max(1, y_info.get("current_year_num", 4)))
        except Exception:
            pass

    year_label = year_label or "4th Year"
    batch_str = batch_str or "2023 - 2027"

    # Resolve job info
    title = job_title or (getattr(job, "title", "Software Engineer") if job else "Software Engineer")
    comp_name = company or (job.company.name if job and hasattr(job, "company") and job.company else "Campus Drive")

    # Base chronological milestones
    base_milestones = list(ROADMAP_TEMPLATES.get(year_num, ROADMAP_TEMPLATES[4]))

    # Inject targeted skill remediation steps
    roadmap = []
    if missing_skills and len(missing_skills) > 0:
        for idx, skill in enumerate(missing_skills[:3]):
            roadmap.append({
                "day": f"Step {idx + 1} (Days {idx * 3 + 1}-{idx * 3 + 3})",
                "title": f"Master Competency: {skill}",
                "details": f"Targeted remediation for {title} at {comp_name}. Build practical code samples demonstrating {skill} and revise core interview questions.",
                "priority": "Critical"
            })
    else:
        roadmap.append({
            "day": "Step 1 (Days 1-3)",
            "title": "Skills Verified: Deepen Domain Expertise",
            "details": f"Your current profile meets all declared prerequisites for {title}. Focus on mock algorithmic speed drills and system design trade-offs.",
            "priority": "High"
        })

    # Append standard placement phase milestones
    roadmap.extend(base_milestones)

    return {
        "student_year": year_label,
        "batch": batch_str,
        "target_job": title,
        "company": comp_name,
        "missing_skills": missing_skills,
        "roadmap": roadmap
    }
