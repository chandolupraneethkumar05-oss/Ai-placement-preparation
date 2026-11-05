from app.ai_engine.year_calculator import parse_vfstr_reg_no

def check_student_eligibility(student, job):
    """
    Evaluates hard institutional & company criteria:
    - Minimum CGPA
    - Maximum allowed active backlogs
    - Branch eligibility
    - Academic Year eligibility (via reg_no calculation)
    """
    reasons = []
    eligible = True

    # 1. CGPA Check
    if student.cgpa < job.min_cgpa:
        eligible = False
        reasons.append(f"CGPA ({student.cgpa:.2f}) is below cutoff of {job.min_cgpa:.2f}")

    # 2. Backlogs Check
    if student.active_backlogs > job.max_backlogs:
        eligible = False
        reasons.append(f"Active backlogs ({student.active_backlogs}) exceed limit of {job.max_backlogs}")

    # 3. Branch Check
    clean_branch = student.branch.replace("&", "_").upper()
    allowed = [b.replace("&", "_").upper() for b in job.eligible_branches]
    if allowed and clean_branch not in allowed:
        eligible = False
        reasons.append(f"Branch '{student.branch}' is not in eligible branches: {job.eligible_branches}")

    # 4. Academic Year Check
    year_info = parse_vfstr_reg_no(student.reg_no)
    student_study_year = year_info["current_year_num"]
    allowed_years = job.eligible_years or [4]
    if allowed_years and student_study_year not in allowed_years:
        eligible = False
        reasons.append(f"Currently in {year_info['year_label']}, but drive requires: {allowed_years} Year")

    return {
        "is_eligible": eligible,
        "reasons": reasons if reasons else ["Meets all academic & institutional criteria"],
        "summary": "Eligible" if eligible else "Ineligible: " + "; ".join(reasons)
    }
