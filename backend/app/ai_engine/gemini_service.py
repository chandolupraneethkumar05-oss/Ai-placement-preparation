import os
import json
import random
import urllib.request
import urllib.error
from typing import Optional, List, Dict, Any

from app.core.config import GEMINI_API_KEY

def is_gemini_configured() -> bool:
    """Returns True if a non-empty Gemini API key is configured."""
    return bool(GEMINI_API_KEY and GEMINI_API_KEY.strip())

def call_gemini_api(prompt: str, api_key: Optional[str] = None, system_instruction: Optional[str] = None) -> Optional[str]:
    """
    Direct HTTP call to Google Gemini API (no external heavy SDK needed).
    Prioritizes api_key passed in request, then falls back to GEMINI_API_KEY environment variable.
    Redacts keys from error logs and handles quota limits gracefully.
    """
    key = (api_key or GEMINI_API_KEY or "").strip()
    if not key:
        return None

    # Modern production Gemini model fallback chain
    models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]
    
    payload: Dict[str, Any] = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 2048,
        }
    }

    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }

    data_bytes = json.dumps(payload).encode("utf-8")

    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=12) as response:
                res_body = response.read().decode("utf-8")
                res_json = json.loads(res_body)
                candidates = res_json.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "")
        except urllib.error.HTTPError as e:
            # 429: Rate limit or quota exhausted
            if e.code == 429:
                print(f"[Gemini Service Notice] Rate limit or quota reached on {model}. Falling back to internal engine.")
                break
            # Try next model if 404 or 400
            if e.code in [404, 400] and model != models[-1]:
                continue
            print(f"[Gemini Service Notice] HTTP Error ({model}): {e.code} - {e.reason}")
            break
        except (urllib.error.URLError, TimeoutError) as e:
            print(f"[Gemini Service Notice] Network timeout or connection failure for {model}: {e}")
            break
        except Exception as e:
            print(f"[Gemini Service Notice] General request error: {e}")
            break

    return None

def extract_json_from_llm_response(text: str) -> Optional[dict]:
    """Extracts and parses JSON from markdown code fence or raw string."""
    if not text:
        return None
    clean = text.strip()
    if "```json" in clean:
        clean = clean.split("```json")[1].split("```")[0].strip()
    elif "```" in clean:
        clean = clean.split("```")[1].split("```")[0].strip()
    try:
        return json.loads(clean)
    except Exception:
        return None

def generate_dynamic_interview_question(
    company: str,
    round_type: str,
    target_role: Optional[str] = "Software Engineer",
    exclude_titles: Optional[List[str]] = None,
    api_key: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Generates a brand-new, non-repeating interview question tailored to the company and round.
    Uses Gemini API if API key is provided.
    """
    exclude_str = ", ".join(exclude_titles) if exclude_titles else "None"
    
    prompt = f"""
You are an expert technical interviewer and placement panelist for {company}.
Create a FRESH, realistic interview assessment question for:
- Company: {company}
- Hiring Round Category: {round_type} (e.g. reasoning, coding, technical, behavioral)
- Role: {target_role}

STRICT ANTI-DUPLICATION RULE:
You MUST NOT repeat or resemble any of these previously asked questions:
[{exclude_str}]

Output ONLY valid JSON matching this schema:
{{
  "title": "Short descriptive title of the problem/scenario",
  "question": "Full detailed question or scenario text",
  "round_category": "{round_type}",
  "required_concepts": ["concept 1", "concept 2", "concept 3", "concept 4", "concept 5"],
  "benchmark_summary": "Comprehensive 2-3 sentence gold-standard solution outline describing what a top candidate must explain."
}}
"""
    system_inst = "You are a senior tech placement officer. Output only pure JSON with no commentary."
    response_text = call_gemini_api(prompt, api_key=api_key, system_instruction=system_inst)
    
    if response_text:
        parsed = extract_json_from_llm_response(response_text)
        if parsed and "question" in parsed and "required_concepts" in parsed:
            parsed["company"] = company
            parsed["role"] = target_role
            parsed["round_label"] = f"{company} {round_type.title()} Assessment"
            return parsed

    return None

def evaluate_dynamic_interview_answer(
    question_data: dict,
    student_answer: str,
    api_key: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Evaluates candidate's answer using Gemini API with technical depth, strengths, and actionable feedback.
    """
    prompt = f"""
You are evaluating a candidate's answer in an interview assessment for {question_data.get('company', 'Tech Company')}.

QUESTION:
{question_data.get('question', '')}

REQUIRED KEY CONCEPTS:
{json.dumps(question_data.get('required_concepts', []))}

BENCHMARK SOLUTION:
{question_data.get('benchmark_summary', '')}

CANDIDATE'S SUBMITTED ANSWER:
"{student_answer}"

Evaluate the candidate rigorously and constructively.
Return ONLY valid JSON matching this exact schema:
{{
  "score": <integer from 0 to 100>,
  "verdict": "<'Interview Ready' if score >= 75 else 'Needs Polish' if score >= 55 else 'Needs Revision'>",
  "concept_coverage_percent": <integer from 0 to 100>,
  "matched_concepts": [<list of concepts covered well in candidate answer>],
  "missing_concepts": [<list of concepts the candidate missed or explained poorly>],
  "feedback": "<2-4 sentences of constructive feedback explaining what was good and how to improve>",
  "model_tips": "<Key bullet points on how to answer this optimally in a real interview>"
}}
"""
    system_inst = "You are a university placement evaluator. Output only valid JSON."
    response_text = call_gemini_api(prompt, api_key=api_key, system_instruction=system_inst)
    
    if response_text:
        parsed = extract_json_from_llm_response(response_text)
        if parsed and "score" in parsed and "feedback" in parsed:
            return parsed

    return None

def optimize_bullet_with_gemini(
    bullet_text: str,
    target_role: Optional[str] = "Software Engineer",
    api_key: Optional[str] = None
) -> Optional[str]:
    """
    Rewrites a weak bullet point into STAR format (Situation, Task, Action, Result) with active verbs and quantifiable metrics.
    """
    prompt = f"""
Rewrite this resume bullet point into a high-impact, ATS-optimized STAR format (Situation, Task, Action, Result) for a {target_role} role:
Weak Bullet: "{bullet_text}"

Rules:
1. Start with a strong action verb (Architected, Engineered, Optimized, Spearheaded, Automated).
2. Include realistic quantifiable metrics (e.g. improved latency by 35%, scaled to 10K+ users, reduced memory footprint by 40%).
3. Keep it under 2 lines.
4. Output ONLY the rewritten bullet point text, nothing else.
"""
    result = call_gemini_api(prompt, api_key=api_key)
    if result:
        clean = result.strip().strip('"').strip('- ')
        if len(clean) > 15:
            return clean
    return None
