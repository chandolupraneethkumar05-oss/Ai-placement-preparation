# VFSTR AutoPlace AI: Autonomous Placement & Recruitment Management Agent
**Built for Agentic AI Hackathon 2.0 at Vignan's Foundation for Science, Technology and Research (VFSTR)**  
**Problem Statement 16 (Campus Placement Management Agent) + Problem Statement 15 (Skill Gap Remediation)**

---

## 🌟 Executive Summary & System Highlights

AutoPlace AI is an end-to-end, multi-role campus recruitment platform designed for university training & placement divisions. Unlike traditional static portals, AutoPlace AI features:

1. **Clean Institutional Fresh Slate**:
   - Zero hardcoded mock students, scores, or fake records.
   - All student accounts register fresh with their exact **10-character VFSTR Roll Numbers** (e.g. `231FA05001`).
   - Starting profiles begin with a real **0 ATS score** and empty skill lists until a resume is built or uploaded.

2. **14-Section Talent Shine Resume Builder & 10 Templates**:
   - Comprehensive editor covering: Basics (with custom fields), Summary (with rich formatting & AI auto-generate), Profiles, Experience, Education, Skills, Languages, Awards, Certifications, Interests, Projects, Publications, Volunteering, and References.
   - 10 distinct resume templates (Gengar, Azurill, Bronzor, Chikorita, Ditto, Glalie, Kakuna, Leafish, Onix, Pikachu) with dynamic zoom, accent colors, and **clean A4 PDF download** (no website headers or clutter).

3. **Dynamic Role-Aware ATS Scoring & Rescanning Engine**:
   - Analyzes resumes against 6 major industry engineering profiles (Software Development Engineer, AI & Machine Learning, Full-Stack Web Developer, Cloud & DevOps, Data Scientist, Embedded/IoT).
   - Dynamically rescans and updates ATS diagnostics whenever the candidate updates their target career role.

4. **Strict Recruiter Authentication & Guardrails**:
   - Blocks personal domains (gmail, yahoo, hotmail, etc.).
   - Mandates corporate email, Corporate Employee ID, and T&P Invitation Code (`VFSTR-RECRUIT-2026`).

5. **Shortlist-Gated Mock Interview Assessments**:
   - Assessments are securely locked until a student is officially shortlisted by a company.
   - Supports 4 isolated domain rounds per shortlisted company:
     - **Round 1 (Reasoning / Aptitude)**: Logical Deductions, Sequences & Quantitative Reasoning.
     - **Round 2 (Coding)**: Data Structures, Algorithms, Two Pointers, Trees, Dynamic Programming.
     - **Round 3 (Technical)**: System Design, Microservices, Caching, Database Indexing.
     - **Round 4 (HR / Behavioral)**: STAR Framework, Conflict Resolution, Culture Fit.

6. **Automated Conflict-Free Interview Scheduling**:
   - Allocates panel chambers (e.g. A-Block Chamber 204) with zero timing overlaps.
   - Generates digital interview passes with panel numbers, dates, and times.

7. **Dean & HOD Placement Control Tower**:
   - Real-time active drive monitoring with drive titles, company names, LPA packages, CGPA cutoffs, and applicant counters.
   - Instant export of NAAC Criterion 5.2 and NIRF placement compliance reports.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2, PyMuPDF |
| **AI & NLP** | Scikit-learn (TF-IDF, Cosine Similarity, Skill Taxonomy Extractor, STAR Prompt Refiner) |
| **Database** | SQLite (development) / PostgreSQL (production via SQLAlchemy ORM) |
| **Testing** | Vitest (Frontend), Pytest (Backend) |

---

## 🚀 Running Locally

### Option A: One-Click Startup (Windows)
Double-click:
```cmd
start_all.bat
```
This automatically launches:
* **Frontend Web Application**: `http://localhost:5173`
* **FastAPI Swagger Docs**: `http://127.0.0.1:8000/docs`

---

### Option B: Manual Terminal Execution

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python -c "from seed_data import seed_database; seed_database(force_recreate=True)"
uvicorn main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 Complete Deployment Guide

### Deployment Architecture
```
                  ┌───────────────────────┐
                  │     Frontend App      │
                  │   (Vercel / Netlify)  │
                  └───────────┬───────────┘
                              │ HTTPS / REST
                              ▼
                  ┌───────────────────────┐
                  │   FastAPI Backend     │
                  │ (Render / Railway/GCP)│
                  └───────────┬───────────┘
                              │ SQLAlchemy ORM
                              ▼
                  ┌───────────────────────┐
                  │ PostgreSQL / SQLite   │
                  │  (Supabase / Neon)    │
                  └───────────────────────┘
```

---

### Method 1: Deploy Backend on Render & Frontend on Vercel (Recommended)

#### Step 1: Deploy Backend to Render (Free Web Service)
1. Fork or push this repository to GitHub.
2. Sign in to [Render](https://render.com) and click **New > Web Service**.
3. Select your repository: `Ai-placement-preparation`.
4. Configure service settings:
   - **Name**: `autoplace-ai-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, set:
   - `DATABASE_URL`: `sqlite:///./placement.db` (or your managed PostgreSQL connection string)
   - `SECRET_KEY`: `<generate-a-strong-secret-key>`
6. Click **Deploy**. Note down your backend URL (e.g. `https://autoplace-ai-backend.onrender.com`).

---

#### Step 2: Deploy Frontend to Vercel
1. Sign in to [Vercel](https://vercel.com) and click **Add New > Project**.
2. Select your repository: `Ai-placement-preparation`.
3. Configure settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_BASE`: `https://autoplace-ai-backend.onrender.com`
5. Click **Deploy**. Your placement portal is now live with an SSL HTTPS domain!

---

### Method 2: Docker Containerization Deployment

#### Backend Dockerfile (`backend/Dockerfile`):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Frontend Dockerfile (`frontend/Dockerfile`):
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose (`docker-compose.yml`):
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///./placement.db
      - SECRET_KEY=vfstr-super-secure-key-2026

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```
Run both with:
```bash
docker-compose up --build
```

---

## 🔑 Default Roles & Verification Credentials

| Persona | Identifier / Email | Password | Access Highlights |
|---|---|---|---|
| **Dean Placements (Admin)** | `dean_placements@vignan.ac.in` | `vignan123` | Institutional Overview, Active Drives, NAAC/NIRF Export |
| **Corporate Recruiter** | `recruiter@amazon.com` | `vignan123` | Create Drives (Internship/Full-Time), Shortlist, Schedule Panels |
| **New Recruiter Registration** | Company Email + Employee ID | User-defined | Requires T&P Invitation Code: **`VFSTR-RECRUIT-2026`** |
| **Student Registration** | 10-char Roll No (e.g. `231FA05001`) | User-defined | 14-Section Resume Builder, PDF Upload, Shortlisted Assessments |

---

## 🧪 Automated Testing

### Backend Unit & Integration Tests:
```bash
cd backend
python -m pytest -v
```
*Validates VFSTR 10-char roll number parser, AI fit scoring, recruiter guardrails, and conflict-free interview scheduling.*

### Frontend Production Build Test:
```bash
cd frontend
npm run build
```
*Validates TypeScript interfaces, component rendering, and Tailwind CSS tree-shaking.*

---

## 📄 License & Attribution
Developed for the **VFSTR Agentic AI Hackathon 2.0 (2026)**.  
*Vignan's Foundation for Science, Technology and Research (Deemed to be University), Vadlamudi, Andhra Pradesh.*
