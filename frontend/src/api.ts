const API_BASE = "http://127.0.0.1:8000";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("autoplace_token");
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchDemoPersonas() {
  const res = await fetch(`${API_BASE}/auth/demo-personas`);
  return res.json();
}

export async function loginUser(role: string, identifier: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, identifier, password })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Authentication failed");
  }
  return res.json();
}

export async function registerUser(payload: any) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Registration failed");
  }
  return res.json();
}

export async function fetchStudentProfile(studentId: number) {
  const res = await fetch(`${API_BASE}/student/profile/${studentId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to load profile");
  }
  return res.json();
}

export async function uploadResumeFile(studentId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/student/upload-resume/${studentId}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Resume upload failed");
  }
  return res.json();
}

export async function updateTargetRole(studentId: number, target_role: string) {
  const res = await fetch(`${API_BASE}/student/target-role/${studentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ target_role })
  });
  return res.json();
}

export async function updateManualResume(studentId: number, skills: string[], resume_text: string, target_role?: string) {
  const res = await fetch(`${API_BASE}/student/manual-resume/${studentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ skills, resume_text, target_role })
  });
  return res.json();
}

// Talent Shine Resume Builder APIs
export async function fetchResumeBuilder(studentId: number) {
  const res = await fetch(`${API_BASE}/student/resume-builder/${studentId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    throw new Error("Failed to load resume builder data");
  }
  return res.json();
}

export async function saveResumeBuilder(studentId: number, payload: any) {
  const res = await fetch(`${API_BASE}/student/resume-builder/${studentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error("Failed to save resume builder data");
  }
  return res.json();
}

export async function enhanceAIBullet(bullet_text: string, target_role?: string) {
  const res = await fetch(`${API_BASE}/student/resume-ai/enhance-bullet`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ bullet_text, target_role })
  });
  return res.json();
}

export async function generateAISummary(name: string, target_role: string, skills: string[]) {
  const res = await fetch(`${API_BASE}/student/resume-ai/generate-summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ name, target_role, skills })
  });
  return res.json();
}

export async function previewATSScore(payload: any) {
  const res = await fetch(`${API_BASE}/student/evaluate-ats-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function fetchStudentJobs(studentId: number) {
  const res = await fetch(`${API_BASE}/student/jobs/${studentId}`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function applyToJob(studentId: number, jobId: number) {
  const res = await fetch(`${API_BASE}/student/apply/${studentId}/${jobId}`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function fetchStudentApplications(studentId: number) {
  const res = await fetch(`${API_BASE}/student/applications/${studentId}`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function fetchShortlistedInterviews(studentId: number) {
  const res = await fetch(`${API_BASE}/student/shortlisted-interviews/${studentId}`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function fetchMockQuestion(companyName: string, roundType?: string, studentId?: number) {
  const params = new URLSearchParams();
  if (roundType) params.append("round_type", roundType);
  if (studentId) params.append("student_id", String(studentId));
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/student/mock-interview/${encodeURIComponent(companyName)}${query}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Unable to load interview questions");
  }
  return res.json();
}

export async function submitMockAnswer(payload: any) {
  const res = await fetch(`${API_BASE}/student/evaluate-mock`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function fetchRoadmap(studentId: number, jobId: number) {
  const res = await fetch(`${API_BASE}/student/roadmap/${studentId}/${jobId}`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function fetchRecruiterDashboard(recruiterId: number) {
  const res = await fetch(`${API_BASE}/recruiter/dashboard/${recruiterId}`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function fetchRecruiterJobs(recruiterId: number) {
  const res = await fetch(`${API_BASE}/recruiter/jobs/${recruiterId}`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function postNewJob(recruiterId: number, jobData: any) {
  const res = await fetch(`${API_BASE}/recruiter/jobs/${recruiterId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(jobData)
  });
  return res.json();
}

export async function fetchJobApplicants(jobId: number) {
  const res = await fetch(`${API_BASE}/recruiter/applicants/${jobId}`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function shortlistApplicant(applicationId: number) {
  const res = await fetch(`${API_BASE}/recruiter/shortlist/${applicationId}`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function fetchVenueSuggestions(block?: string) {
  const res = await fetch(`${API_BASE}/recruiter/suggest-venues?block=${encodeURIComponent(block || "A Block")}`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function allocateSlotWithCheck(payload: any) {
  const res = await fetch(`${API_BASE}/recruiter/allocate-slot`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Slot allocation failed");
  }
  return res.json();
}

export async function fetchAdminAllStudents() {
  const res = await fetch(`${API_BASE}/admin/all-students`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function fetchAdminAnalytics() {
  const res = await fetch(`${API_BASE}/admin/analytics`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function fetchNirfSummary() {
  const res = await fetch(`${API_BASE}/admin/export-nirf-summary`, {
    headers: getAuthHeaders()
  });
  return res.json();
}
