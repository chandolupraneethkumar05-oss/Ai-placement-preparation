from app.ai_engine.year_calculator import parse_vfstr_reg_no

def check_student_eligibility(student, job):
    """
    Evaluates hard institutional & company criteria:
    - Minimum CGPA
    - Maximum allowed active backlogs
    - Branch eligibility
    - Academic Year eligibility (with degree duration awareness)
    Returns transparent criteria breakdown for student diagnostics.
    """
    reasons = []
    eligible = True

    # 1. CGPA Check
    cgpa_val = round(float(student.cgpa), 2)
    min_cgpa_val = round(float(job.min_cgpa), 2)
    cgpa_met = (cgpa_val >= min_cgpa_val)
    cgpa_gap = round(max(0.0, min_cgpa_val - cgpa_val), 2)
    if not cgpa_met:
        eligible = False
        reasons.append(f"CGPA ({cgpa_val:.2f}) is below company cutoff of {min_cgpa_val:.2f} (Shortfall: -{cgpa_gap:.2f})")

    # 2. Backlogs Check
    active_b = int(student.active_backlogs or 0)
    max_b = int(job.max_backlogs if job.max_backlogs is not None else 0)
    backlogs_met = (active_b <= max_b)
    if not backlogs_met:
        eligible = False
        reasons.append(f"Active backlogs ({active_b}) exceed strict company limit of {max_b}")

    # 3. Branch Check
    clean_branch = (student.branch or "").replace("&", "_").upper().strip()
    allowed = [(b or "").replace("&", "_").upper().strip() for b in (job.eligible_branches or [])]
    branch_met = bool(not allowed or clean_branch in allowed)
    if not branch_met:
        eligible = False
        reasons.append(f"Department '{student.branch}' is not in eligible branches: {job.eligible_branches}")

    # 4. Academic Year Check (Degree-Aware)
    degree = getattr(student, "degree", "B.Tech") or "B.Tech"
    year_info = parse_vfstr_reg_no(student.reg_no, degree=degree)
    student_study_year = year_info["current_year_num"]
    allowed_years = job.eligible_years or [4]
    year_met = bool(not allowed_years or student_study_year in allowed_years)
    if not year_met:
        eligible = False
        reasons.append(f"Currently in {year_info['year_label']}, but drive strictly requires: {allowed_years} Year")

    diagnostics = {
        "cgpa": {
            "met": cgpa_met,
            "actual": cgpa_val,
            "required": min_cgpa_val,
            "gap": cgpa_gap
        },
        "backlogs": {
            "met": backlogs_met,
            "actual": active_b,
            "allowed": max_b
        },
        "branch": {
            "met": branch_met,
            "student_branch": student.branch,
            "allowed_branches": job.eligible_branches
        },
        "year": {
            "met": year_met,
            "student_year_label": year_info["year_label"],
            "student_year_num": student_study_year,
            "allowed_years": allowed_years
        }
    }

    return {
        "is_eligible": eligible,
        "reasons": reasons if reasons else ["Meets all academic & institutional criteria"],
        "diagnostics": diagnostics,
        "summary": "Eligible" if eligible else "Ineligible: " + "; ".join(reasons)
    }
