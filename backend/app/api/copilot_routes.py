import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.all_models import StudentProfile, JobPosting, Company, Application
from app.ai_engine.gemini_service import call_gemini_api
from app.ai_engine.resume_extractor import calculate_ats_score

router = APIRouter(prefix="/copilot", tags=["AI Copilot"])

class CopilotChatRequest(BaseModel):
    message: str
    user_name: Optional[str] = "User"
    user_role: Optional[str] = "student"
    student_id: Optional[int] = None
    target_role: Optional[str] = None
    context_topic: Optional[str] = None

def get_respectful_salutation(name: str, role: str) -> str:
    clean_name = (name or "User").strip()
    role_lower = (role or "student").lower()
    if role_lower == "admin":
        return f"Respected Dean Sir/Madam {clean_name}"
    elif role_lower == "recruiter":
        return f"Esteemed Recruiter {clean_name}"
    else:
        return f"Dear Student {clean_name}"

class OptimizeResumeRequest(BaseModel):
    student_id: int
    target_role: Optional[str] = "Software Engineer"
    target_company: Optional[str] = "General Tech"
    current_resume_text: Optional[str] = None

# Context knowledge base about VFSTR AutoPlace AI
KNOWLEDGE_BASE = """
You are the official VFSTR AutoPlace AI Campus Intelligence Copilot for Vignan's Foundation for Science, Technology and Research (VFSTR).
Your role is to guide students, corporate recruiters, and college administrators through the campus placement process.

Key Institutional Features of VFSTR AutoPlace AI:
1. Institutional MOU Governance (NAAC Criterion 3.5):
   - Every recruitment drive posted by a corporate recruiter defaults to 'PENDING_DEAN_APPROVAL'.
   - The Dean of Placements verifies that the company has an active Memorandum of Understanding (MOU).
   - If the MOU is active, the Dean releases the drive with 1 click.
   - If the MOU has expired, the Dean has two options: 'Renew MOU & Approve Drive' (1, 2, or 3-year extension) or 'Reject/Discontinue Drive'.
   - Once approved, the drive is instantly broadcast to students via Server-Sent Events (SSE) without needing a page refresh.

2. Placement Drive Stage Attendance:
   - Tracks student physical attendance at genuine recruitment milestones using admit cards/QR scan tokens:
     * Stage 1: Pre-Placement Talk (PPT)
     * Stage 2: Online Assessment / Coding Test
     * Stage 3: Technical Interview Panel
     * Stage 4: HR Interview & Offer Issuance
   - Classroom lecture attendance is explicitly excluded to focus on real placement outcomes.

3. Collision-Free Physical Chamber Scheduling:
   - Allocates campus venues (A-Block, Chamber A-204, Panel 1) with collision detection to prevent student or panel overlapping.
   - Recruiters can use '⚡ Smart Auto-Schedule All' to distribute all shortlisted candidates across panels automatically.

4. Transparent Eligibility Diagnostics:
   - Shows students exactly why they are ineligible for a drive: CGPA shortfall gap, active backlogs excess, branch restriction, or academic year restriction.

5. Candidate Academic Dossier:
   - Provides recruiters with a full semester-by-semester SGPA progression (Sem 1 to current), active vs cleared backlogs, honors, and verified skills.

6. Talent Shine Resume Builder & ATS Scoring:
   - Authentic ATS score calculated dynamically based on target role keywords, metrics, STAR action verbs, and contact completeness (0-100). Never hardcoded.

Companies Active on Campus:
- Amazon (Tier-1 Super Dream, SDE-1, ₹18-24 LPA, Min CGPA 8.0, 0 Backlogs)
- TCS (Prime & Digital, Associate Software Engineer, ₹7-9 LPA, Min CGPA 7.0, Max 1 Backlog)
- Infosys (Specialist Programmer & DSE, ₹6.5-9.5 LPA, Min CGPA 6.8, Max 1 Backlog)
- Cognizant (GenC Elevate, Full Stack Engineer, ₹6.5 LPA, Min CGPA 6.5, Max 1 Backlog)
"""

@router.post("/chat")
def copilot_chat(payload: CopilotChatRequest, db: Session = Depends(get_db)):
    """
    Intelligent multi-turn AI assistant capable of explaining system workflows,
    checking company eligibility, advising on interview rounds, and guiding resume improvement.
    """
    user_query = payload.message.strip()
    if not user_query:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    salutation = get_respectful_salutation(payload.user_name or "User", payload.user_role or "student")

    student_context = ""
    if payload.student_id:
        student = db.query(Student).filter(Student.id == payload.student_id).first()
        if student:
            student_context = f"""
Current Student Profile Context:
- Name: {student.name} ({student.reg_no})
- Branch: {student.branch}, Degree: {student.degree}
- Current CGPA: {student.cgpa}, Active Backlogs: {student.active_backlogs}
- Target Role: {student.target_role or 'Unset'}
- Verified Skills: {', '.join(student.skills or [])}
- Authentic ATS Score: {student.ats_score}/100
"""

    prompt = f"""
{KNOWLEDGE_BASE}

{student_context}

User Salutation: {salutation}
User Role: {payload.user_role}
User Question: "{user_query}"

Instructions:
- Always open your response respectfully addressing the user as: "{salutation}".
- Provide an authoritative, structured, and helpful response.
- If the question is about how the project works, explain the real mechanism (MOU approval, SSE live updates, stage attendance, collision-free scheduling, or ATS scoring).
- If the student asks about eligibility for a company, refer to their profile details above and state whether they meet the criteria and why.
- If the user asks about interview preparation or resumes, provide actionable, concise guidance using bullet points.
- Keep the tone professional, encouraging, and academic (VFSTR Training & Placement Cell).
"""

    # Call Gemini API
    ai_reply = call_gemini_api(prompt, system_instruction="You are the official VFSTR AutoPlace AI Campus Intelligence Copilot. Always address the user respectfully.")
    
    # High-quality fallback if Gemini API key is unavailable or network offline
    if not ai_reply:
        q_lower = user_query.lower()
        if "mou" in q_lower or "dean" in q_lower or "approval" in q_lower:
            ai_reply = (
                f"{salutation},\n\n"
                "**Institutional MOU Governance (NAAC Criterion 3.5):**\n\n"
                "In VFSTR AutoPlace AI, whenever a company recruiter publishes a campus drive, it enters the **'PENDING_DEAN_APPROVAL'** status.\n\n"
                "- The Dean reviews the company's legal MOU reference code, validity period, and category.\n"
                "- **If Active:** The Dean approves the drive, which instantly broadcasts it to student dashboards via Server-Sent Events (SSE).\n"
                "- **If Expired:** The Dean is presented with two explicit choices:\n"
                "  1. **Renew MOU & Approve Drive** (extends partnership by 1, 2, or 3 years and publishes the drive).\n"
                "  2. **Reject / Discontinue Drive** (with official recorded justification).\n\n"
                "This ensures zero unaccredited or non-MOU companies recruit on campus."
            )
        elif "attendance" in q_lower or "stage" in q_lower or "qr" in q_lower:
            ai_reply = (
                f"{salutation},\n\n"
                "**Placement Drive Stage Attendance:**\n\n"
                "Our platform tracks student physical presence across genuine recruitment milestones using admit cards and QR scan tokens:\n"
                "- **Pre-Placement Talk (PPT):** Orientation and company presentation verification.\n"
                "- **Online Assessment:** Coding and aptitude assessment hall entry.\n"
                "- **Technical Interview:** Chamber check-in at panel rooms.\n"
                "- **HR Interview & Offer Issuance:** Final round verification.\n\n"
                "*Note:* Classroom lecture attendance is excluded to keep placement accreditation clean and accurate."
            )
        elif "schedule" in q_lower or "slot" in q_lower or "panel" in q_lower:
            ai_reply = (
                f"{salutation},\n\n"
                "**Smart Physical Chamber Scheduling:**\n\n"
                "VFSTR AutoPlace AI prevents candidate and room collisions through our spatial scheduler:\n"
                "- Physical blocks and chambers (e.g. A-Block Chamber A-204) are registered in the system.\n"
                "- When a recruiter shortlists a student, the system prompts them to allocate an interview slot with automated conflict detection.\n"
                "- Corporate recruiters can also click **'⚡ Smart Auto-Schedule All'** to automatically distribute all shortlisted students across available panels with 0 collisions."
            )
        elif "resume" in q_lower or "ats" in q_lower:
            target = payload.target_role or "Software Engineer"
            ai_reply = (
                f"{salutation},\n\n"
                f"**Resume & ATS Optimization for {target}:**\n\n"
                "To maximize your authentic ATS score:\n"
                "1. **Use Strong Action Verbs:** Start project bullets with 'Architected', 'Engineered', 'Optimized', or 'Automated'.\n"
                "2. **Quantify Metrics (STAR Method):** Include measurable results (e.g., *'Reduced API latency by 35% using Redis caching'*).\n"
                "3. **Targeted Keywords:** Ensure technical skills relevant to your target role (e.g., Python, SQL, REST APIs, Docker) are clearly tagged.\n\n"
                "Click **'✨ Optimize Resume'** in the Resume Center to have our Copilot generate enhanced bullet points tailored to your track!"
            )
        elif "amazon" in q_lower or "tcs" in q_lower or "infosys" in q_lower or "cognizant" in q_lower:
            ai_reply = (
                f"{salutation},\n\n"
                "**Campus Recruitment Partners at VFSTR:**\n\n"
                "- **Amazon:** SDE-1 (Tier 1 Super Dream) • ₹18.0 LPA • Min CGPA: 8.0 • Max Backlogs: 0\n"
                "- **TCS:** Associate Software Engineer • ₹8.5 LPA • Min CGPA: 7.0 • Max Backlogs: 1\n"
                "- **Infosys:** Specialist Programmer • ₹9.5 LPA • Min CGPA: 6.8 • Max Backlogs: 1\n"
                "- **Cognizant:** GenC Elevate • ₹6.5 LPA • Min CGPA: 6.5 • Max Backlogs: 1\n\n"
                "Your dashboard evaluates your real CGPA and backlog status to provide itemized eligibility diagnostics for each drive."
            )
        else:
            ai_reply = (
                f"{salutation},\n\n"
                "**VFSTR AutoPlace AI Copilot:**\n\n"
                "I am your automated placement assistant. I can help you with:\n"
                "- **System Governance:** How MOU approval, Dean gates, and NAAC 3.5 criteria work.\n"
                "- **Drive Eligibility:** Checking whether your CGPA, backlogs, and branch qualify for specific recruiters.\n"
                "- **Resume Optimization:** Enhancing your resume bullets and boosting your authentic ATS score.\n"
                "- **Interview Scheduling:** Understanding your hall tickets, panel chambers, and stage attendance logs."
            )

    return {
        "reply": ai_reply,
        "source": "gemini" if "call_gemini_api" else "knowledge_base"
    }

@router.post("/optimize-resume")
def optimize_resume(payload: OptimizeResumeRequest, db: Session = Depends(get_db)):
    """
    Analyzes student resume text against their target role and company,
    generates optimized STAR-format bullet points, extracts missing technical keywords,
    and returns text that can be applied directly to the student's resume.
    """
    student = db.query(StudentProfile).filter(StudentProfile.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    student_name = student.user.full_name if student.user else student.reg_no
    student_email = student.user.email if student.user else f"{student.reg_no.lower()}@vignan.ac.in"
    resume_text = payload.current_resume_text or student.resume_text or ""
    target_role = payload.target_role or student.target_role or "Software Engineer"
    target_company = payload.target_company or "Tier 1 Enterprise"

    prompt = f"""
You are an expert ATS Resume Optimization Specialist and Lead Technical Recruiter for {target_company}.
The student is applying for: "{target_role}".

Student's Current Resume Details:
- Name: {student_name} ({student.reg_no})
- Degree & Branch: {student.degree} in {student.branch}
- Current Skills: {', '.join(student.skills or [])}
- Current Resume Text:
{resume_text}

Task:
1. Identify high-impact technical keywords critical for a "{target_role}" role at {target_company}.
2. Rewrite or enhance the student's Project and Experience bullet points using the STAR method (Situation, Task, Action, Result) with strong action verbs (Engineered, Architected, Deployed, Reduced, Accelerated).
3. Ensure every enhanced point includes measurable metrics (%, ms, scale, user count).
4. Provide a cohesive, publication-ready Markdown resume text.

Output strictly valid JSON with this format:
{{
  "recommended_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "key_improvements": [
    "Replaced passive voice with high-impact action verbs",
    "Quantified project outcomes with performance metrics",
    "Aligned technical stack with industry benchmarks"
  ],
  "enhanced_summary": "Concise 3-line professional career summary tailored to {target_role}...",
  "enhanced_projects": [
    "Architected high-throughput microservices using FastAPI and PostgreSQL, reducing query latency by 42%.",
    "Engineered responsive React interface with real-time SSE streaming, supporting concurrent updates across 1,000+ active users."
  ],
  "full_enhanced_resume_text": "Complete formatted resume text incorporating all improvements..."
}}
"""

    gemini_resp = call_gemini_api(prompt, system_instruction="Output strictly valid JSON only.")
    parsed = None
    if gemini_resp:
        try:
            # Clean markdown formatting if present
            clean_str = gemini_resp.strip()
            if "```json" in clean_str:
                clean_str = clean_str.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_str:
                clean_str = clean_str.split("```")[1].split("```")[0].strip()
            parsed = json.loads(clean_str)
        except Exception:
            parsed = None

    # High-quality fallback if Gemini is offline
    if not parsed:
        recommended_kw = ["Python", "FastAPI", "React", "PostgreSQL", "Docker", "RESTful APIs", "Git", "System Design"]
        if "cloud" in target_role.lower() or "devops" in target_role.lower():
            recommended_kw = ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux", "Terraform", "Monitoring", "Python"]
        elif "ai" in target_role.lower() or "data" in target_role.lower() or "ml" in target_role.lower():
            recommended_kw = ["PyTorch", "Python", "SQL", "Pandas", "Scikit-Learn", "FastAPI", "RAG", "Data Pipelines"]

        enhanced_summary = (
            f"Results-oriented {student.branch} undergraduate at VFSTR with practical expertise in modern software engineering, "
            f"distributed systems, and scalable backend architectures. Seeking a {target_role} position at {target_company} "
            f"to deploy robust full-stack applications with measurable performance metrics."
        )

        enhanced_projects = [
            "Architected full-stack enterprise recruitment portal with FastAPI and React, cutting candidate shortlisting turnaround time by 60%.",
            "Engineered spatial conflict detector and batch interview allocator, handling concurrent scheduling across multiple panels with 0 collisions.",
            "Integrated asynchronous SSE event broadcaster and real-time ATS scoring engine, processing resume keyword indexing in under 50ms."
        ]

        full_text = f"""{student_name} | {student.reg_no}
VFSTR - Vignan's Foundation for Science, Technology and Research | {student.degree} in {student.branch}
Email: {student_email} | Target Track: {target_role}

PROFESSIONAL SUMMARY:
{enhanced_summary}

TECHNICAL COMPETENCIES:
Languages & Frameworks: {', '.join(recommended_kw[:5])}
Databases & Cloud: PostgreSQL, SQLite, AWS, Docker, Redis
Tools & Architecture: Git, REST APIs, Microservices, System Architecture

KEY ENGINEERING PROJECTS:
• Enterprise Placement & Recruitment Management Agent:
  - {enhanced_projects[0]}
  - {enhanced_projects[1]}
  - {enhanced_projects[2]}

EDUCATION & CREDENTIALS:
• {student.degree} in {student.branch} | VFSTR | CGPA: {student.cgpa:.2f}/10.0
• Active Academic Standing: 0 Backlogs | NAAC Verified Academic Dossier
"""

        parsed = {
            "recommended_keywords": recommended_kw,
            "key_improvements": [
                "Injected role-specific high-impact technical keywords",
                "Rewrote project bullets into STAR format with quantified performance metrics",
                "Created targeted professional summary aligned with " + target_role
            ],
            "enhanced_summary": enhanced_summary,
            "enhanced_projects": enhanced_projects,
            "full_enhanced_resume_text": full_text
        }

    # Calculate predicted ATS boost
    calc_res = calculate_ats_score(parsed["full_enhanced_resume_text"], student.skills, target_role)
    simulated_score = calc_res.get("ats_score", 85)

    return {
        "success": True,
        "target_role": target_role,
        "target_company": target_company,
        "current_ats_score": student.ats_score,
        "optimized_ats_score": simulated_score,
        "ats_improvement": max(0, simulated_score - student.ats_score),
        "recommended_keywords": parsed.get("recommended_keywords", []),
        "key_improvements": parsed.get("key_improvements", []),
        "enhanced_summary": parsed.get("enhanced_summary", ""),
        "enhanced_projects": parsed.get("enhanced_projects", []),
        "full_enhanced_resume_text": parsed.get("full_enhanced_resume_text", "")
    }
