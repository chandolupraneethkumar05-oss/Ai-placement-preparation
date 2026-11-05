import pytest
from app.ai_engine.year_calculator import parse_vfstr_reg_no
from app.ai_engine.resume_extractor import (
    extract_text_from_file, 
    calculate_ats_score, 
    extract_skills_from_text,
    convert_builder_json_to_text
)
from app.ai_engine.venue_manager import check_slot_collision
from app.ai_engine.pyq_rag_engine import fetch_pyq_for_company, evaluate_pyq_response

def test_vfstr_roll_number_parsing_and_degree():
    # 23 batch B.Tech -> 4 years -> in 2026 it's 4th Year
    res_btech = parse_vfstr_reg_no("231FA05001", degree="B.Tech")
    assert res_btech["duration_years"] == 4
    assert res_btech["start_year"] == 2023
    assert res_btech["end_year"] == 2027
    assert res_btech["current_year_num"] == 4
    assert "4th Year" in res_btech["year_label"]

    # 24 batch M.Tech -> 2 years -> in 2026 it graduated in 2026 (Alumni)
    res_mtech = parse_vfstr_reg_no("241FA05001", degree="M.Tech")
    assert res_mtech["duration_years"] == 2
    assert res_mtech["start_year"] == 2024
    assert res_mtech["end_year"] == 2026

def test_screenshot_rejection_guardrail():
    # Attempting to upload image file must raise ValueError
    with pytest.raises(ValueError) as excinfo:
        extract_text_from_file(b"fake image bytes", "screenshot.png")
    assert "Screenshots or image files are strictly rejected" in str(excinfo.value)

def test_slot_collision_detection():
    class DummySlot:
        def __init__(self, block, chamber, slot_time, student_id):
            self.block_name = block
            self.chamber_name = chamber
            self.slot_time = slot_time
            self.student_id = student_id

    existing = [DummySlot("A Block", "Chamber A-204", "10:30 AM - 11:00 AM", 101)]

    # Test 1: Venue Collision
    res1 = check_slot_collision(existing, "A Block", "Chamber A-204", "10:30 AM - 11:00 AM", 102)
    assert res1["collision"] is True
    assert "already booked" in res1["reason"]

    # Test 2: Student Collision
    res2 = check_slot_collision(existing, "H Block", "Seminar Hall H-2", "10:30 AM - 11:00 AM", 101)
    assert res2["collision"] is True
    assert "already has another confirmed interview" in res2["reason"]

    # Test 3: Free Slot
    res3 = check_slot_collision(existing, "A Block", "Chamber A-204", "11:00 AM - 11:30 AM", 102)
    assert res3["collision"] is False

def test_pyq_rag_evaluation():
    pyq = fetch_pyq_for_company("Amazon")
    assert "Amazon" in pyq["company"]
    assert len(pyq["required_concepts"]) > 0

    student_ans = f"In this system implementation, we thoroughly analyze {' and '.join(pyq['required_concepts'])} to guarantee optimal time complexity and meet production standards."
    eval_res = evaluate_pyq_response(pyq, student_ans)
    assert eval_res["score"] >= 60
    assert eval_res["concept_coverage_percent"] > 0

def test_real_ats_scoring_and_zero_hardcoding():
    # Strict Guardrail: Empty resume must yield ATS score = 0
    empty_res = calculate_ats_score("", [])
    assert empty_res["ats_score"] == 0
    assert "No Resume Ingested" in empty_res["verdict"]

    # Genuine resume text with contact, sections, skills, metrics
    sample_text = """
    Rahul Sharma
    rahul@vignan.ac.in | +91 9346743290 | linkedin.com/in/rahul | github.com/rahul
    
    EDUCATION
    Vignan's Foundation for Science, Technology and Research (VFSTR)
    B.Tech in Computer Science and Engineering - CGPA: 8.92 (2023 - 2027)
    
    TECHNICAL SKILLS
    Languages: Python, Java, C++, SQL
    Frameworks: FastAPI, React, Node.js
    Cloud & Tools: Docker, Git, AWS, PostgreSQL
    
    PROJECTS
    High-Throughput Microservice Engine
    - Architected distributed REST endpoints handling 2500+ requests/second.
    - Optimized database query response times by 35% through Redis caching.
    - Deployed containerized services with Docker and automated CI/CD pipeline.
    
    CERTIFICATIONS & AWARDS
    - AWS Certified Cloud Practitioner
    - Winner, National Hackathon 2025
    """
    skills = extract_skills_from_text(sample_text)
    assert "Python" in skills
    assert "FastAPI" in skills
    assert "Docker" in skills

    eval_res = calculate_ats_score(sample_text, skills)
    assert eval_res["ats_score"] >= 70
    assert eval_res["contact_score"] == 15
    assert len(eval_res["strengths"]) > 0

def test_builder_json_to_text_conversion():
    builder_json = {
        "basics": {
            "fullName": "Sai Krishna",
            "headline": "Full Stack Engineer",
            "email": "sai@vignan.ac.in",
            "phone": "+91 9876543210",
            "website": "https://github.com/saikrishna",
            "location": "Guntur"
        },
        "summary": "Motivated developer proficient in Python and React.",
        "education": [
            {
                "institution": "VFSTR",
                "degree": "B.Tech",
                "field": "CSE",
                "score": "8.5 CGPA",
                "dateRange": "2023 - 2027"
            }
        ],
        "skills": [
            {"name": "Languages", "keywords": "Python, Java, SQL"},
            {"name": "Web", "keywords": "React, FastAPI"}
        ],
        "projects": [
            {
                "name": "Placement Management Agent",
                "techStack": "FastAPI, React, SQLite",
                "link": "https://github.com",
                "description": "Architected recruitment scheduling platform improving workflow efficiency by 40%."
            }
        ]
    }
    converted = convert_builder_json_to_text(builder_json)
    assert "Sai Krishna" in converted
    assert "VFSTR" in converted
    assert "Placement Management Agent" in converted
    
    skills = extract_skills_from_text(converted)
    assert "Python" in skills
    assert "FastAPI" in skills
    
    ats_res = calculate_ats_score(converted, skills)
    assert ats_res["ats_score"] >= 50


from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_student_reg_no_10_char_limit():
    # Registration with invalid length (<10)
    resp = client.post("/auth/register", json={
        "role": "student",
        "full_name": "Test Student",
        "password": "password123",
        "reg_no": "211FA05" # only 7 chars
    })
    assert resp.status_code == 400
    assert "must be exactly 10 characters" in resp.json()["detail"]

    # Login with invalid length (>10)
    resp_login = client.post("/auth/login", json={
        "role": "student",
        "identifier": "211FA050019999",
        "password": "password123"
    })
    assert resp_login.status_code == 400
    assert "must be exactly 10 characters" in resp_login.json()["detail"]

def test_recruiter_verification_guardrails():
    # 1. Prohibited personal email
    resp1 = client.post("/auth/register", json={
        "role": "recruiter",
        "full_name": "Fake Recruiter",
        "email": "hacker@gmail.com",
        "password": "password123",
        "company_name": "Google",
        "employee_id": "GOOG-1234",
        "invitation_code": "VFSTR-RECRUIT-2026"
    })
    assert resp1.status_code == 400
    assert "Personal email providers" in resp1.json()["detail"]

    # 2. Invalid Invitation Code
    resp2 = client.post("/auth/register", json={
        "role": "recruiter",
        "full_name": "Recruiter One",
        "email": "hr@google.com",
        "password": "password123",
        "company_name": "Google",
        "employee_id": "GOOG-1234",
        "invitation_code": "WRONG-CODE"
    })
    assert resp2.status_code == 403
    assert "Invalid VFSTR Placement Invitation Code" in resp2.json()["detail"]

    # 3. Missing / too short Employee ID
    resp3 = client.post("/auth/register", json={
        "role": "recruiter",
        "full_name": "Recruiter One",
        "email": "hr@google.com",
        "password": "password123",
        "company_name": "Google",
        "employee_id": "AB",
        "invitation_code": "VFSTR-RECRUIT-2026"
    })
    assert resp3.status_code == 400
    assert "Official Corporate Employee ID" in resp3.json()["detail"]
