from datetime import datetime

def parse_vfstr_reg_no(reg_no: str, degree: str = "B.Tech"):
    """
    VFSTR Registration Number Decoder:
    - Extracts joining year from first 2 digits (e.g. '24' -> 2024, '21' -> 2021).
    - Honors degree duration: B.Tech = 4 years, M.Tech = 2 years.
    - Autonomously calculates the student's active year of study (1st, 2nd, 3rd, 4th)
      using the institutional July-June academic calendar.
    - The student NEVER manually enters their current year.
    """
    clean_reg = reg_no.strip().upper() if reg_no else ""
    degree_clean = degree.strip().upper()
    duration = 2 if "M" in degree_clean else 4

    start_year = 2024
    if len(clean_reg) >= 2:
        try:
            start_year = 2000 + int(clean_reg[:2])
        except ValueError:
            start_year = 2024

    end_year = start_year + duration

    now = datetime.now()
    cur_year = now.year
    cur_month = now.month

    # Academic cycle baseline: session changes in July
    academic_base = cur_year if cur_month >= 7 else (cur_year - 1)
    study_year = (academic_base - start_year) + 1

    if study_year <= 0:
        year_label = "Pre-admission"
        status = "Pre-admit"
        is_final = False
    elif study_year > duration:
        year_label = f"Alumni (Graduated {end_year})"
        status = "Alumni"
        is_final = False
    else:
        labels = {1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year (Final Year)"}
        year_label = labels.get(study_year, f"{study_year}th Year")
        status = "Active"
        is_final = (study_year == duration)

    return {
        "reg_no": clean_reg,
        "degree": "M.Tech" if duration == 2 else "B.Tech",
        "duration_years": duration,
        "start_year": start_year,
        "end_year": end_year,
        "batch": f"{start_year} - {end_year}",
        "current_year_num": study_year,
        "year_label": year_label,
        "is_final_year": is_final,
        "status": status
    }
