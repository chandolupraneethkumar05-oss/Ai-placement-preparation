import pytest
from fastapi.testclient import TestClient
from main import app
from app.database.session import get_db, SessionLocal, Base, engine
from app.models.all_models import StudentProfile, User, Company, JobPosting

client = TestClient(app)

def test_copilot_chat_student():
    response = client.post("/api/copilot/chat", json={
        "message": "How does the placement system work?",
        "user_name": "Praneeth",
        "user_role": "student"
    })
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "Dear Student Praneeth" in data["reply"]

def test_copilot_chat_recruiter():
    response = client.post("/api/copilot/chat", json={
        "message": "How do I shortlist candidates?",
        "user_name": "Rohan HR",
        "user_role": "recruiter"
    })
    assert response.status_code == 200
    data = response.json()
    assert "Esteemed Recruiter Rohan HR" in data["reply"]

def test_copilot_chat_admin():
    response = client.post("/api/copilot/chat", json={
        "message": "What is the status of institutional MOUs?",
        "user_name": "Dr. Vignan",
        "user_role": "admin"
    })
    assert response.status_code == 200
    data = response.json()
    assert "Respected Dean Sir/Madam Dr. Vignan" in data["reply"]

def test_sample_csv_download():
    response = client.get("/admin/students/sample-csv")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "reg_no,name,email,degree,branch,cgpa" in response.text

def test_all_students_paginated():
    response = client.get("/admin/all-students-paginated?page=1&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "students" in data
    assert "total" in data
    assert "total_pages" in data
    assert isinstance(data["students"], list)
