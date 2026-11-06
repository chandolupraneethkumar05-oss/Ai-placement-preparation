import os
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN

OUTPUT_PPTX = r"C:\Users\prane\Downloads\AI_Placement_Preparation_The_Epochs.pptx"
LOGO_PATH = r"C:\Users\prane\Downloads\extracted_idp_images\slide_1_pic_2_Picture 5.jpg"

prs = pptx.Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank_layout = prs.slide_layouts[6]

# Colors
NAVY_PRIMARY = RGBColor(15, 23, 42)      # #0f172a
BLUE_ACCENT  = RGBColor(37, 99, 235)     # #2563eb
BLUE_DARK    = RGBColor(30, 58, 138)     # #1e3a8a
BG_PAGE      = RGBColor(248, 250, 252)   # #f8fafc
CARD_BG      = RGBColor(255, 255, 255)   # #ffffff
CARD_BORDER  = RGBColor(226, 232, 240)   # #e2e8f0
TEXT_MUTED   = RGBColor(100, 116, 139)   # #64748b
TEXT_DARK    = RGBColor(15, 23, 42)      # #0f172a
GREEN_ACCENT = RGBColor(22, 163, 74)     # #16a34a
GREEN_BG     = RGBColor(240, 253, 244)   # #f0fdf4
RED_ACCENT   = RGBColor(220, 38, 38)     # #dc2626
RED_BG       = RGBColor(254, 242, 242)   # #fef2f2
PURPLE_ACC   = RGBColor(124, 58, 237)    # #7c3aed
PURPLE_BG    = RGBColor(250, 245, 255)   # #faf5ff
AMBER_ACC    = RGBColor(217, 119, 6)     # #d97706
AMBER_BG     = RGBColor(254, 252, 232)   # #fefce8
QUOTE_BG     = RGBColor(240, 247, 255)   # #f0f7ff
QUOTE_BORDER = RGBColor(186, 230, 253)   # #bae6fd
TAG_BG       = RGBColor(224, 242, 254)   # #e0f2fe
TAG_TEXT     = RGBColor(3, 105, 161)     # #0369a1

def add_header(slide, tag_text, title_text, subtitle_text, quote_text, quote_sub, slide_num_str):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG_PAGE
    bg.line.fill.background()

    tag_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.35), Inches(3.2), Inches(0.32))
    tag_box.fill.solid()
    tag_box.fill.fore_color.rgb = TAG_BG
    tag_box.line.color.rgb = TAG_TEXT
    tag_box.line.width = Pt(0.75)
    tf = tag_box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = tag_text
    p.font.name = "Segoe UI"
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = TAG_TEXT
    p.alignment = PP_ALIGN.CENTER

    tb_title = slide.shapes.add_textbox(Inches(0.78), Inches(0.7), Inches(7.6), Inches(0.65))
    tf_title = tb_title.text_frame
    tf_title.word_wrap = True
    p_title = tf_title.paragraphs[0]
    p_title.text = title_text
    p_title.font.name = "Segoe UI"
    p_title.font.size = Pt(24)
    p_title.font.bold = True
    p_title.font.color.rgb = NAVY_PRIMARY

    tb_sub = slide.shapes.add_textbox(Inches(0.8), Inches(1.35), Inches(7.6), Inches(0.4))
    tf_sub = tb_sub.text_frame
    tf_sub.word_wrap = True
    p_sub = tf_sub.paragraphs[0]
    p_sub.text = subtitle_text
    p_sub.font.name = "Segoe UI"
    p_sub.font.size = Pt(11)
    p_sub.font.color.rgb = TEXT_MUTED

    if quote_text:
        q_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.7), Inches(0.45), Inches(3.8), Inches(1.05))
        q_box.fill.solid()
        q_box.fill.fore_color.rgb = QUOTE_BG
        q_box.line.color.rgb = QUOTE_BORDER
        q_box.line.width = Pt(1)
        tf_q = q_box.text_frame
        tf_q.word_wrap = True
        
        p_q1 = tf_q.paragraphs[0]
        p_q1.text = f'“ {quote_text} ”'
        p_q1.font.name = "Segoe UI"
        p_q1.font.size = Pt(11)
        p_q1.font.bold = True
        p_q1.font.color.rgb = BLUE_DARK
        p_q1.alignment = PP_ALIGN.CENTER

        if quote_sub:
            p_q2 = tf_q.add_paragraph()
            p_q2.text = quote_sub
            p_q2.font.name = "Segoe UI"
            p_q2.font.size = Pt(9.5)
            p_q2.font.color.rgb = TEXT_MUTED
            p_q2.alignment = PP_ALIGN.CENTER

    tb_foot_l = slide.shapes.add_textbox(Inches(0.8), Inches(7.05), Inches(5.5), Inches(0.35))
    tf_fl = tb_foot_l.text_frame
    p_fl = tf_fl.paragraphs[0]
    p_fl.text = "🎓 VFSTR AutoPlace AI — Campus Placement & Recruitment Agent"
    p_fl.font.name = "Segoe UI"
    p_fl.font.size = Pt(9.5)
    p_fl.font.color.rgb = TEXT_MUTED

    tb_foot_c = slide.shapes.add_textbox(Inches(6.3), Inches(7.05), Inches(5.0), Inches(0.35))
    tf_fc = tb_foot_c.text_frame
    p_fc = tf_fc.paragraphs[0]
    p_fc.text = "Training & Placement Cell  |  Department of ACSE"
    p_fc.font.name = "Segoe UI"
    p_fc.font.size = Pt(9.5)
    p_fc.font.color.rgb = TEXT_MUTED
    p_fc.alignment = PP_ALIGN.RIGHT

    num_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(12.0), Inches(7.0), Inches(0.55), Inches(0.35))
    num_box.fill.solid()
    num_box.fill.fore_color.rgb = RGBColor(226, 232, 240)
    num_box.line.fill.background()
    tf_num = num_box.text_frame
    p_num = tf_num.paragraphs[0]
    p_num.text = slide_num_str
    p_num.font.name = "Segoe UI"
    p_num.font.size = Pt(10)
    p_num.font.bold = True
    p_num.font.color.rgb = NAVY_PRIMARY
    p_num.alignment = PP_ALIGN.CENTER

def create_card(slide, left, top, width, height, bg_col=CARD_BG, border_col=CARD_BORDER):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
    card.fill.solid()
    card.fill.fore_color.rgb = bg_col
    card.line.color.rgb = border_col
    card.line.width = Pt(1.25)
    return card

# ==============================================================================
# SLIDE 1: Title Slide with College Logo
# ==============================================================================
s1 = prs.slides.add_slide(blank_layout)
bg1 = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
bg1.fill.solid()
bg1.fill.fore_color.rgb = RGBColor(255, 255, 255)
bg1.line.fill.background()

# Top & bottom aesthetic accent bars
bar_top = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(0.15))
bar_top.fill.solid()
bar_top.fill.fore_color.rgb = BLUE_ACCENT
bar_top.line.fill.background()

bar_bot = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(7.35), Inches(13.333), Inches(0.15))
bar_bot.fill.solid()
bar_bot.fill.fore_color.rgb = BLUE_DARK
bar_bot.line.fill.background()

# College Logo
if os.path.exists(LOGO_PATH):
    s1.shapes.add_picture(LOGO_PATH, Inches(4.5), Inches(0.65), Inches(4.33), Inches(1.2))

# Title Card Container
c1 = create_card(s1, 1.2, 2.1, 10.933, 4.8, bg_col=RGBColor(248, 250, 252), border_col=RGBColor(226, 232, 240))

# Inner Content Box
tb1 = s1.shapes.add_textbox(Inches(1.5), Inches(2.3), Inches(10.33), Inches(4.4))
tf1 = tb1.text_frame
tf1.word_wrap = True

p = tf1.paragraphs[0]
p.text = "INTERDISCIPLINARY PROJECT (IDP) — 2026"
p.font.name = "Segoe UI"
p.font.size = Pt(11)
p.font.bold = True
p.font.color.rgb = BLUE_ACCENT
p.alignment = PP_ALIGN.CENTER

p = tf1.add_paragraph()
p.text = "VFSTR AutoPlace AI"
p.font.name = "Segoe UI"
p.font.size = Pt(36)
p.font.bold = True
p.font.color.rgb = NAVY_PRIMARY
p.alignment = PP_ALIGN.CENTER

p = tf1.add_paragraph()
p.text = "Agentic Campus Placement & Recruitment Management System"
p.font.name = "Segoe UI"
p.font.size = Pt(18)
p.font.bold = True
p.font.color.rgb = BLUE_DARK
p.alignment = PP_ALIGN.CENTER

p = tf1.add_paragraph()
p.text = "An intelligent, unified platform bridging Students, Corporate Recruiters, and College Administration with ATS Analysis, Conflict-Free Scheduling, and Company-Specific AI Mock Preparation."
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.color.rgb = TEXT_MUTED
p.alignment = PP_ALIGN.CENTER

# Department & University Info
p = tf1.add_paragraph()
p.text = "\nDepartment of Advanced Computer Science and Engineering"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = NAVY_PRIMARY
p.alignment = PP_ALIGN.CENTER

p = tf1.add_paragraph()
p.text = "School of Computing and Informatics"
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.color.rgb = TEXT_MUTED
p.alignment = PP_ALIGN.CENTER

p = tf1.add_paragraph()
p.text = "Vignan's Foundation for Science, Technology & Research (Deemed to be University)"
p.font.name = "Segoe UI"
p.font.size = Pt(13)
p.font.bold = True
p.font.color.rgb = BLUE_DARK
p.alignment = PP_ALIGN.CENTER

# ==============================================================================
# SLIDE 2: Batch Details (The Epochs)
# ==============================================================================
s2 = prs.slides.add_slide(blank_layout)
add_header(s2, "01 | PROJECT TEAM", "Project Batch Details — The Epochs", "Students of Department of Advanced Computer Science & Engineering, VFSTR", "Unified Vision. Agile Engineering.", "Batch: The Epochs | Academic Year 2025–26", "02")

# 4 Student Cards (2x2 Grid)
members = [
    {"name": "M. Uday Kiran", "reg": "241FA18275", "role": "Frontend Architecture & UI/UX Design", "focus": "React 18 SPA, Talent Shine Builder & Responsive Views", "badge_col": BLUE_ACCENT, "badge_bg": TAG_BG},
    {"name": "G. Jashwanth", "reg": "241FA18304", "role": "Backend Engineering & API Gateway", "focus": "FastAPI REST API, Security Guardrails & Session Auth", "badge_col": GREEN_ACCENT, "badge_bg": GREEN_BG},
    {"name": "D. Vamsi Krishna", "reg": "241FA18287", "role": "Database Architecture & Optimization", "focus": "PostgreSQL Lifetime Persistence, ORM & Analytics", "badge_col": PURPLE_ACC, "badge_bg": PURPLE_BG},
    {"name": "CH. Pranith Kumar", "reg": "241FA18483", "role": "AI/ML Integration & DevOps Engineering", "focus": "RAG Engine, Gemini AI, Resend Email API & Cloud Deploy", "badge_col": AMBER_ACC, "badge_bg": AMBER_BG}
]

positions = [
    (0.8, 1.85, 5.7, 2.3),
    (6.8, 1.85, 5.7, 2.3),
    (0.8, 4.45, 5.7, 2.3),
    (6.8, 4.45, 5.7, 2.3)
]

for idx, m in enumerate(members):
    x, y, w, h = positions[idx]
    create_card(s2, x, y, w, h, bg_col=CARD_BG, border_col=CARD_BORDER)
    
    # Header tag for student card
    tag_card = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x + 0.3), Inches(y + 0.25), Inches(1.8), Inches(0.3))
    tag_card.fill.solid()
    tag_card.fill.fore_color.rgb = m["badge_bg"]
    tag_card.line.color.rgb = m["badge_col"]
    tag_card.line.width = Pt(0.75)
    tf_tag = tag_card.text_frame
    p_tag = tf_tag.paragraphs[0]
    p_tag.text = f"TEAM MEMBER 0{idx+1}"
    p_tag.font.name = "Segoe UI"
    p_tag.font.size = Pt(8.5)
    p_tag.font.bold = True
    p_tag.font.color.rgb = m["badge_col"]
    p_tag.alignment = PP_ALIGN.CENTER

    tb = s2.shapes.add_textbox(Inches(x + 0.3), Inches(y + 0.65), Inches(w - 0.6), Inches(1.5))
    tf = tb.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = m["name"]
    p.font.name = "Segoe UI"
    p.font.size = Pt(17)
    p.font.bold = True
    p.font.color.rgb = NAVY_PRIMARY

    p = tf.add_paragraph()
    p.text = f"Registration Number: {m['reg']}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = BLUE_DARK

    p = tf.add_paragraph()
    p.text = f"Role: {m['role']}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(10.5)
    p.font.bold = True
    p.font.color.rgb = m["badge_col"]

    p = tf.add_paragraph()
    p.text = f"Core Modules: {m['focus']}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(9.5)
    p.font.color.rgb = TEXT_MUTED

# ==============================================================================
# SLIDE 3: The Problem (Challenges in Placements Without Our Project)
# ==============================================================================
s3 = prs.slides.add_slide(blank_layout)
add_header(s3, "02 | THE PROBLEM", "The Problem — Campus Placements Without AutoPlace AI", "Critical pain points, coordination bottlenecks, and manual inefficiencies in traditional drives", "Disconnected tools. Endless manual stress.", "Without an integrated system, placements fail.", "03")

# Left Column: The Context Summary Card (Red-accented)
c_left = create_card(s3, 0.8, 1.85, 3.8, 4.9, bg_col=RED_BG, border_col=RGBColor(254, 202, 202))
tb_ctx = s3.shapes.add_textbox(Inches(1.0), Inches(2.05), Inches(3.4), Inches(4.5))
tf_ctx = tb_ctx.text_frame
tf_ctx.word_wrap = True

p = tf_ctx.paragraphs[0]
p.text = "🚨 Reality of Traditional Placements"
p.font.name = "Segoe UI"
p.font.size = Pt(15)
p.font.bold = True
p.font.color.rgb = RED_ACCENT

p = tf_ctx.add_paragraph()
p.text = "\nWithout an agentic unified solution, campus recruitment across colleges suffers from complete fragmentation:"
p.font.name = "Segoe UI"
p.font.size = Pt(10.5)
p.font.color.rgb = TEXT_DARK

p = tf_ctx.add_paragraph()
p.text = "\n• Training & Placement Cell juggles hundreds of static Excel sheets and WhatsApp groups.\n• Students have no visibility into how ATS algorithms score their resumes.\n• Recruiters struggle to coordinate interview panels, resulting in room and candidate collisions.\n• Zero automated notifications: students miss interview slots and fail to receive hall tickets."
p.font.name = "Segoe UI"
p.font.size = Pt(9.5)
p.font.color.rgb = TEXT_DARK

p = tf_ctx.add_paragraph()
p.text = "\nResult: Frustrated students, lost job opportunities, chaotic drive days, and inaccurate college placement records."
p.font.name = "Segoe UI"
p.font.size = Pt(10)
p.font.bold = True
p.font.color.rgb = RED_ACCENT

# Right Column: 6 Key Problem Cards
problems = [
    ("1. Manual & Biased Screening", "T&P officers spend hundreds of hours manually reading varied resume formats with no standardized ATS compatibility scores.", RED_ACCENT, RED_BG),
    ("2. Hallucinated / Fake Resume Metrics", "Students copy generic templates inventing false statistics ('boosted performance 40%'), leading to rejection in technical rounds.", AMBER_ACC, AMBER_BG),
    ("3. Interview Venue & Panel Collisions", "Chambers and rooms double-booked; candidates scheduled for two company panels simultaneously on the same date and time.", RED_ACCENT, RED_BG),
    ("4. Generic, Disconnected Mock Preparation", "Students practice generic coding questions completely divorced from target company previous-year hiring questions (PYQs).", BLUE_DARK, TAG_BG),
    ("5. Delayed Communication & Missing Passes", "Shortlist notices scattered over messaging apps; no formal admit cards, hall tickets, or verified email alerts are dispatched.", PURPLE_ACC, PURPLE_BG),
    ("6. Ephemeral / Disappearing Placement Data", "Database wiped across container reboots; Dean and HOD lack genuine statistical placement percentages and verified partner ratios.", RED_ACCENT, RED_BG)
]

for idx, (title, desc, col, bg_col) in enumerate(problems):
    row = idx // 2
    col_idx = idx % 2
    px = 4.8 + col_idx * 3.85
    py = 1.85 + row * 1.62
    create_card(s3, px, py, 3.7, 1.48, bg_col=CARD_BG, border_col=CARD_BORDER)

    tb = s3.shapes.add_textbox(Inches(px + 0.15), Inches(py + 0.1), Inches(3.4), Inches(1.3))
    tf = tb.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = title
    p.font.name = "Segoe UI"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = col

    p = tf.add_paragraph()
    p.text = desc
    p.font.name = "Segoe UI"
    p.font.size = Pt(9)
    p.font.color.rgb = TEXT_DARK

# ==============================================================================
# SLIDE 4: Our Project Solution (How Slide 3 is Rectified)
# ==============================================================================
s4 = prs.slides.add_slide(blank_layout)
add_header(s4, "03 | OUR PROJECT SOLUTION", "Our Project Solution — How We Rectify Every Problem", "Direct algorithmic & architectural solutions engineered to solve each traditional bottleneck", "Same goals. A much smarter way.", "One integrated platform. Zero conflicts.", "04")

solutions = [
    ("1. Automated ATS Engine & Skill Match", "Replaces manual reading with instantaneous 0–100 ATS scoring against target job roles, identifying exact missing skills & criteria.", GREEN_ACCENT, GREEN_BG),
    ("2. Zero-Hallucination STAR Rewriter", "Replaces fake percentages by rewriting weak student bullets using active STAR verbs without fabricating numbers or achievements.", BLUE_ACCENT, TAG_BG),
    ("3. Multi-Dimensional Collision Detector", "Evaluates Date + Time + Block + Chamber + Student ID to guarantee 100% clash-free room and candidate allocation across all campus blocks.", GREEN_ACCENT, GREEN_BG),
    ("4. Company-Specific AI Mock Simulator", "Unlocks real previous-year questions (PYQs) via RAG with non-repeating generation and instant Gemini AI rubric evaluation.", PURPLE_ACC, PURPLE_BG),
    ("5. Automated Shortlist & Admit Email Dispatch", "Dispatches verified branded emails via Resend REST API and generates tamper-proof Digital QR Hall Tickets for seamless check-in.", BLUE_DARK, TAG_BG),
    ("6. Lifetime PostgreSQL Storage & Live Analytics", "Permanent database retention across reboots; Dean/HOD dashboard with live verified partner ratios (3/4) and 1-click NIRF CSV export.", GREEN_ACCENT, GREEN_BG)
]

for idx, (title, desc, col, bg_col) in enumerate(solutions):
    row = idx // 2
    col_idx = idx % 2
    px = 0.8 + col_idx * 5.9
    py = 1.85 + row * 1.62
    create_card(s4, px, py, 5.7, 1.48, bg_col=CARD_BG, border_col=CARD_BORDER)

    # Accent pill on left
    pill = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(px + 0.2), Inches(py + 0.2), Inches(0.28), Inches(1.08))
    pill.fill.solid()
    pill.fill.fore_color.rgb = col
    pill.line.fill.background()

    tb = s4.shapes.add_textbox(Inches(px + 0.6), Inches(py + 0.12), Inches(4.9), Inches(1.3))
    tf = tb.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = f"✔ {title}"
    p.font.name = "Segoe UI"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = col

    p = tf.add_paragraph()
    p.text = desc
    p.font.name = "Segoe UI"
    p.font.size = Pt(9.5)
    p.font.color.rgb = TEXT_DARK

# ==============================================================================
# SLIDE 5: Key Features in Project
# ==============================================================================
s5 = prs.slides.add_slide(blank_layout)
add_header(s5, "04 | KEY FEATURES", "Key Features of VFSTR AutoPlace AI", "Comprehensive ecosystem supporting Students, Corporate Recruiters, and College Administration", "One platform. Smarter preparation. Better placements.", "Engineered for excellence at VFSTR", "05")

features = [
    ("Talent Shine Resume Builder", "Real-time interactive resume builder with LaTeX/modern templates, live export, and keyword matching against target job profiles.", BLUE_ACCENT),
    ("AI Mock Interview Simulator", "Dynamic technical interview practice with non-repeating questions, company PYQ retrieval, and AI grading across coding & concepts.", PURPLE_ACC),
    ("Smart Venue Collision Engine", "Autonomous multi-date scheduling across A-Block, H-Block, NTR Library, and U-Block with strict chamber & candidate isolation.", GREEN_ACCENT),
    ("Digital QR Hall Ticket & Passes", "Generates official digital admit cards with panel chambers, reporting instructions, verified timings, and instant QR verification.", BLUE_DARK),
    ("Automated Registered Email Alerts", "Live transactional HTML emails sent to students upon recruiter shortlisting and final interview venue confirmation via Resend API.", AMBER_ACC),
    ("Recruiter Drive Portal", "Allows corporate recruiters to publish drives with customized eligibility (CGPA, active backlogs, branches, 4th Year) and view ranked talent.", BLUE_ACCENT),
    ("Dean / HOD Governance Portal", "Real-time institutional oversight: authentic placement percentage, branch distributions, and live corporate accreditation toggling.", PURPLE_ACC),
    ("Authentic NIRF / NAAC Reporting", "Computes genuine median and highest package metrics directly from database records and exports clean CSV summaries for statutory audits.", GREEN_ACCENT)
]

for idx, (title, desc, col) in enumerate(features):
    row = idx // 2
    col_idx = idx % 2
    px = 0.8 + col_idx * 5.9
    py = 1.85 + row * 1.25
    create_card(s5, px, py, 5.7, 1.15, bg_col=CARD_BG, border_col=CARD_BORDER)

    # Number badge
    badge = s5.shapes.add_shape(MSO_SHAPE.OVAL, Inches(px + 0.2), Inches(py + 0.25), Inches(0.65), Inches(0.65))
    badge.fill.solid()
    badge.fill.fore_color.rgb = col
    badge.line.fill.background()
    tf_b = badge.text_frame
    p_b = tf_b.paragraphs[0]
    p_b.text = f"0{idx+1}"
    p_b.font.name = "Segoe UI"
    p_b.font.size = Pt(11)
    p_b.font.bold = True
    p_b.font.color.rgb = RGBColor(255, 255, 255)
    p_b.alignment = PP_ALIGN.CENTER

    tb = s5.shapes.add_textbox(Inches(px + 0.95), Inches(py + 0.1), Inches(4.6), Inches(0.95))
    tf = tb.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = title
    p.font.name = "Segoe UI"
    p.font.size = Pt(11.5)
    p.font.bold = True
    p.font.color.rgb = NAVY_PRIMARY

    p = tf.add_paragraph()
    p.text = desc
    p.font.name = "Segoe UI"
    p.font.size = Pt(9)
    p.font.color.rgb = TEXT_MUTED

# ==============================================================================
# SLIDE 6: Technology Stack
# ==============================================================================
s6 = prs.slides.add_slide(blank_layout)
add_header(s6, "05 | TECHNOLOGY STACK", "Technology Stack & Technical Architecture", "Robust, scalable, type-safe full-stack engineering with generative AI integration", "Modern tools. Enterprise reliability.", "Full-Stack Python + React + Generative AI", "06")

# Left Column: Structured Table of Technologies
create_card(s6, 0.8, 1.85, 7.2, 4.9, bg_col=CARD_BG, border_col=CARD_BORDER)

tech_data = [
    ("Component", "Technology Used", "Role in VFSTR AutoPlace AI"),
    ("Frontend UI", "React 18 + Vite + TypeScript", "Fast, responsive single-page portal with Lucide icons"),
    ("Styling", "Tailwind CSS", "Modern glassmorphism, responsive cards, and clean typography"),
    ("Backend API", "FastAPI (Python 3.11)", "High-performance async REST API with Pydantic v2 schemas"),
    ("Database", "PostgreSQL / SQLite", "Managed persistent PostgreSQL with SQLAlchemy connection pooling"),
    ("AI / LLM Engine", "Google Gemini API", "Multimodal question generation, resume summary & grading"),
    ("RAG Pipeline", "Custom Vector / PYQ RAG", "Retrieves past hiring interview questions for target employers"),
    ("Document Parsing", "PyMuPDF + python-docx", "Selectable PDF & Word table text extraction with magic byte guards"),
    ("Authentication", "JWT + bcrypt Hashing", "Role-based access control (Student, Recruiter, Admin/Dean)"),
    ("Email Service", "Resend REST API", "Branded HTML shortlist emails & hall ticket dispatch"),
    ("Cloud Hosting", "Render Cloud Platform", "Unified single-service web architecture (zero CORS, $0 free tier)")
]

# Table Shape
x_tbl, y_tbl, w_tbl, h_tbl = Inches(0.95), Inches(1.95), Inches(6.9), Inches(4.7)
table_shape = s6.shapes.add_table(len(tech_data), 3, x_tbl, y_tbl, w_tbl, h_tbl)
tbl = table_shape.table
tbl.columns[0].width = Inches(1.5)
tbl.columns[1].width = Inches(2.2)
tbl.columns[2].width = Inches(3.2)

for r_idx, row in enumerate(tech_data):
    for c_idx, val in enumerate(row):
        cell = tbl.cell(r_idx, c_idx)
        cell.text = val
        p = cell.text_frame.paragraphs[0]
        p.font.name = "Segoe UI"
        if r_idx == 0:
            p.font.size = Pt(9.5)
            p.font.bold = True
            p.font.color.rgb = RGBColor(255, 255, 255)
            cell.fill.solid()
            cell.fill.fore_color.rgb = BLUE_DARK
        else:
            p.font.size = Pt(8.5)
            if c_idx == 0:
                p.font.bold = True
                p.font.color.rgb = BLUE_ACCENT
            elif c_idx == 1:
                p.font.bold = True
                p.font.color.rgb = NAVY_PRIMARY
            else:
                p.font.color.rgb = TEXT_DARK
            cell.fill.solid()
            cell.fill.fore_color.rgb = RGBColor(248, 250, 252) if r_idx % 2 == 0 else RGBColor(255, 255, 255)

# Right Column: Architectural Highlights Card
create_card(s6, 8.2, 1.85, 4.3, 4.9, bg_col=QUOTE_BG, border_col=QUOTE_BORDER)
tb_arc = s6.shapes.add_textbox(Inches(8.4), Inches(2.05), Inches(3.9), Inches(4.5))
tf_arc = tb_arc.text_frame
tf_arc.word_wrap = True

p = tf_arc.paragraphs[0]
p.text = "⚡ Architecture Highlights"
p.font.name = "Segoe UI"
p.font.size = Pt(14)
p.font.bold = True
p.font.color.rgb = BLUE_DARK

p = tf_arc.add_paragraph()
p.text = "\n• Unified Full-Stack Architecture:\nThe FastAPI backend serves the React SPA directly from root (/), eliminating cross-origin CORS latency and 'Failed to Fetch' network dropouts.\n\n• Zero-Leak Security & RBAC:\nStudent IDOR guardrails ensure candidates cannot mutate or view another candidate's profile, applications, or QR passes.\n\n• Scalable Connection Pooling:\nSQLAlchemy pool with recycle=300 and max_overflow=20 supports thousands of concurrent student drive applications.\n\n• Safe AI Fallbacks:\nIf Gemini API limits or offline modes occur, the system falls back to rule-based STAR rewriting without halting drives."
p.font.name = "Segoe UI"
p.font.size = Pt(9.5)
p.font.color.rgb = TEXT_DARK

# ==============================================================================
# SLIDE 7: System Workflow
# ==============================================================================
s7 = prs.slides.add_slide(blank_layout)
add_header(s7, "06 | SYSTEM WORKFLOW", "System Workflow — End-to-End Placement Lifecycle", "Unified sequential pipeline connecting students, recruiters, and placement administration", "Seamless coordination from application to offer.", "Automated Placement Pipeline", "07")

workflow_steps = [
    ("Step 1: Student Onboarding", "Student registers with 10-char VFSTR Reg No. Uploads PDF/Word resume. ATS engine parses skills, validates authenticity, and benchmarks against target roles.", BLUE_ACCENT),
    ("Step 2: Recruiter Drive Publishing", "Corporate partner posts campus recruitment drive specifying min CGPA, eligible branches, passing years (4th Year), and CTC package.", BLUE_DARK),
    ("Step 3: Application & Smart Matching", "Eligible candidates apply with a single click. Engine evaluates qualification match and displays candidates ranked by suitability.", GREEN_ACCENT),
    ("Step 4: Shortlist & Real-Time Email", "Recruiter reviews and shortlists candidate. AutoPlace AI immediately dispatches an official branded email alert to student's inbox.", PURPLE_ACC),
    ("Step 5: Conflict-Free Venue Allocation", "Recruiter selects block and chamber. Multi-dimensional collision engine verifies Date + Time + Room + Student, confirming slot.", AMBER_ACC),
    ("Step 6: Digital QR Pass & Institutional Report", "Student receives Digital Hall Ticket with QR verification and directions. Dean/HOD monitors live statistics and exports NIRF data.", GREEN_ACCENT)
]

for idx, (step_title, step_desc, col) in enumerate(workflow_steps):
    row = idx // 2
    col_idx = idx % 2
    px = 0.8 + col_idx * 5.9
    py = 1.85 + row * 1.62
    create_card(s7, px, py, 5.7, 1.48, bg_col=CARD_BG, border_col=CARD_BORDER)

    # Number Tag
    tag = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(px + 0.25), Inches(py + 0.2), Inches(1.1), Inches(0.3))
    tag.fill.solid()
    tag.fill.fore_color.rgb = col
    tag.line.fill.background()
    tf_t = tag.text_frame
    p_t = tf_t.paragraphs[0]
    p_t.text = f"STAGE 0{idx+1}"
    p_t.font.name = "Segoe UI"
    p_t.font.size = Pt(8.5)
    p_t.font.bold = True
    p_t.font.color.rgb = RGBColor(255, 255, 255)
    p_t.alignment = PP_ALIGN.CENTER

    tb = s7.shapes.add_textbox(Inches(px + 1.45), Inches(py + 0.15), Inches(4.0), Inches(0.35))
    tf = tb.text_frame
    p = tf.paragraphs[0]
    p.text = step_title.split(": ")[-1]
    p.font.name = "Segoe UI"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = NAVY_PRIMARY

    tb_desc = s7.shapes.add_textbox(Inches(px + 0.25), Inches(py + 0.58), Inches(5.2), Inches(0.85))
    tf_desc = tb_desc.text_frame
    tf_desc.word_wrap = True
    p_d = tf_desc.paragraphs[0]
    p_d.text = step_desc
    p_d.font.name = "Segoe UI"
    p_d.font.size = Pt(9.5)
    p_d.font.color.rgb = TEXT_DARK

# ==============================================================================
# SLIDE 8: Conclusion & Impact
# ==============================================================================
s8 = prs.slides.add_slide(blank_layout)
add_header(s8, "07 | CONCLUSION & IMPACT", "Conclusion & Measurable Institutional Impact", "Quantifiable outcomes delivered across students, corporate recruiters, and college governance", "Technology making campus recruitment simple, transparent, and fair.", "Our project is a quantum leap for VFSTR placements.", "08")

impact_pillars = [
    ("100% Conflict-Free Scheduling", "Zero venue double-bookings or student panel overlaps across multi-day drives, eliminating campus coordination failures entirely.", GREEN_ACCENT, GREEN_BG),
    ("Zero Resume Hallucination", "Authentic STAR-based rewrites guarantee 0% fake percentages, restoring recruiter trust in student technical qualifications.", BLUE_ACCENT, TAG_BG),
    ("Instant Communication Speed", "Real-time automated email alerts and digital QR hall tickets ensure 100% of shortlisted candidates report on time.", PURPLE_ACC, PURPLE_BG),
    ("Permanent Lifetime Persistence", "PostgreSQL database storage ensures accounts, test progress, and application records remain permanently saved.", AMBER_ACC, AMBER_BG)
]

for idx, (title, desc, col, bg_col) in enumerate(impact_pillars):
    row = idx // 2
    col_idx = idx % 2
    px = 0.8 + col_idx * 5.9
    py = 1.85 + row * 1.85
    create_card(s8, px, py, 5.7, 1.7, bg_col=CARD_BG, border_col=CARD_BORDER)

    pill = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(px + 0.25), Inches(py + 0.25), Inches(0.28), Inches(1.2))
    pill.fill.solid()
    pill.fill.fore_color.rgb = col
    pill.line.fill.background()

    tb = s8.shapes.add_textbox(Inches(px + 0.65), Inches(py + 0.18), Inches(4.8), Inches(1.4))
    tf = tb.text_frame
    tf.word_wrap = True

    p = tf.paragraphs[0]
    p.text = title
    p.font.name = "Segoe UI"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = col

    p = tf.add_paragraph()
    p.text = desc
    p.font.name = "Segoe UI"
    p.font.size = Pt(10)
    p.font.color.rgb = TEXT_DARK

# Summary Banner at bottom of Slide 8
c_banner = create_card(s8, 0.8, 5.7, 11.6, 1.05, bg_col=QUOTE_BG, border_col=QUOTE_BORDER)
tb_ban = s8.shapes.add_textbox(Inches(1.0), Inches(5.8), Inches(11.2), Inches(0.85))
tf_ban = tb_ban.text_frame
tf_ban.word_wrap = True

p = tf_ban.paragraphs[0]
p.text = "🎯 Final Takeaway: A Scalable, Future-Ready Campus Placement Ecosystem"
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = BLUE_DARK

p = tf_ban.add_paragraph()
p.text = "VFSTR AutoPlace AI replaces manual, fragmented campus hiring with an intelligent, conflict-free, and transparent platform that empowers students to succeed and helps institutions achieve record-breaking placement conversions."
p.font.name = "Segoe UI"
p.font.size = Pt(9.5)
p.font.color.rgb = TEXT_DARK

# ==============================================================================
# SLIDE 9: Thank You
# ==============================================================================
s9 = prs.slides.add_slide(blank_layout)

bg9 = s9.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
bg9.fill.solid()
bg9.fill.fore_color.rgb = RGBColor(255, 255, 255)
bg9.line.fill.background()

bar_top9 = s9.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(0.15))
bar_top9.fill.solid()
bar_top9.fill.fore_color.rgb = BLUE_ACCENT
bar_top9.line.fill.background()

bar_bot9 = s9.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, Inches(7.35), Inches(13.333), Inches(0.15))
bar_bot9.fill.solid()
bar_bot9.fill.fore_color.rgb = BLUE_DARK
bar_bot9.line.fill.background()

# Central Thank You Card
create_card(s9, 1.8, 0.65, 9.733, 6.2, bg_col=RGBColor(248, 250, 252), border_col=RGBColor(226, 232, 240))

# College Logo in Center
if os.path.exists(LOGO_PATH):
    s9.shapes.add_picture(LOGO_PATH, Inches(4.7), Inches(0.95), Inches(3.93), Inches(1.1))

tb9 = s9.shapes.add_textbox(Inches(2.0), Inches(2.2), Inches(9.33), Inches(4.4))
tf9 = tb9.text_frame
tf9.word_wrap = True

p = tf9.paragraphs[0]
p.text = "Thank You!"
p.font.name = "Segoe UI"
p.font.size = Pt(38)
p.font.bold = True
p.font.color.rgb = NAVY_PRIMARY
p.alignment = PP_ALIGN.CENTER

p = tf9.add_paragraph()
p.text = "Open for Questions, Evaluation & Feedback"
p.font.name = "Segoe UI"
p.font.size = Pt(16)
p.font.bold = True
p.font.color.rgb = BLUE_ACCENT
p.alignment = PP_ALIGN.CENTER

p = tf9.add_paragraph()
p.text = "\nProject: VFSTR AutoPlace AI — Agentic Campus Placement Management System"
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = BLUE_DARK
p.alignment = PP_ALIGN.CENTER

p = tf9.add_paragraph()
p.text = "Batch: The Epochs  |  Academic Year 2025–2026"
p.font.name = "Segoe UI"
p.font.size = Pt(11)
p.font.bold = True
p.font.color.rgb = TEXT_DARK
p.alignment = PP_ALIGN.CENTER

p = tf9.add_paragraph()
p.text = "Team Members: M. Uday Kiran (241FA18275)  •  G. Jashwanth (241FA18304)  •  D. Vamsi Krishna (241FA18287)  •  CH. Pranith Kumar (241FA18483)"
p.font.name = "Segoe UI"
p.font.size = Pt(10.5)
p.font.color.rgb = TEXT_DARK
p.alignment = PP_ALIGN.CENTER

p = tf9.add_paragraph()
p.text = "\nDepartment of Advanced Computer Science and Engineering"
p.font.name = "Segoe UI"
p.font.size = Pt(12)
p.font.bold = True
p.font.color.rgb = NAVY_PRIMARY
p.alignment = PP_ALIGN.CENTER

p = tf9.add_paragraph()
p.text = "School of Computing and Informatics\nVignan's Foundation for Science, Technology & Research (Deemed to be University)"
p.font.name = "Segoe UI"
p.font.size = Pt(11)
p.font.color.rgb = TEXT_MUTED
p.alignment = PP_ALIGN.CENTER

prs.save(OUTPUT_PPTX)
print(f"Presentation successfully generated and saved to {OUTPUT_PPTX}")
