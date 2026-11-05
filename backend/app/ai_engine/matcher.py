from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def calculate_match_score(student_skills: list, student_resume_text: str, job_title: str, required_skills: list, job_description: str):
    """
    Calculates semantic and weighted skill match between student profile and job.
    Weights:
    - 60% direct required skill overlap
    - 40% TF-IDF cosine similarity between resume/skills text and job description
    """
    # 1. Exact & normalized skill overlap
    student_skills_clean = set(s.strip().lower() for s in student_skills if s)
    req_skills_clean = set(s.strip().lower() for s in required_skills if s)

    if req_skills_clean:
        matched_skills = student_skills_clean.intersection(req_skills_clean)
        missing_skills = req_skills_clean.difference(student_skills_clean)
        skill_score = (len(matched_skills) / len(req_skills_clean)) * 100.0
    else:
        matched_skills = student_skills_clean
        missing_skills = set()
        skill_score = 80.0

    # 2. TF-IDF Cosine Similarity on free text
    student_corpus = " ".join(student_skills) + " " + (student_resume_text or "")
    job_corpus = job_title + " " + " ".join(required_skills) + " " + (job_description or "")

    tfidf_score = 50.0
    try:
        vectorizer = TfidfVectorizer(stop_words="english")
        tfidf_matrix = vectorizer.fit_transform([student_corpus, job_corpus])
        sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        tfidf_score = float(sim * 100.0)
    except Exception:
        tfidf_score = skill_score

    # Weighted final score (clamped between 0 and 100)
    final_score = int(round(0.65 * skill_score + 0.35 * tfidf_score))
    final_score = max(5, min(99, final_score))

    return {
        "match_score": final_score,
        "matched_skills": list(matched_skills),
        "missing_skills": list(missing_skills)
    }
