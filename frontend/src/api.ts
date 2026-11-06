let rawBase = (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || "").trim();
if (rawBase && !rawBase.startsWith("http://") && !rawBase.startsWith("https://")) {
  rawBase = `https://${rawBase}`;
}
rawBase = rawBase.replace(/\/+$/, "");

// In unified full-stack mode, frontend is served directly by backend -> use relative "" (same domain, no CORS, no failed to fetch)
// In local dev mode with Vite server on port 5173 / 3000, fallback to local backend on port 8000
export const API_BASE = rawBase || (typeof window !== "undefined" && (window.location.port === "5173" || window.location.port === "3000") ? "http://127.0.0.1:8000" : "");

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

export async function fetchMockQuestion(
  companyName: string, 
  roundType?: string, 
  studentId?: number,
  excludeTitles?: string[],
  apiKey?: string
) {
  const params = new URLSearchParams();
  if (roundType) params.append("round_type", roundType);
  if (studentId) params.append("student_id", String(studentId));
  if (excludeTitles && excludeTitles.length > 0) params.append("exclude", excludeTitles.join(","));
  if (apiKey) params.append("api_key", apiKey.trim());
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

export async function submitMockAnswer(payload: {
  company_name: string;
  question_title: string;
  question_text: string;
  required_concepts: string[];
  benchmark_summary: string;
  student_answer: string;
  api_key?: string;
}) {
  const res = await fetch(`${API_BASE}/student/evaluate-mock`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Evaluation failed");
  }
  return res.json();
}

export async function optimizeResumeBullet(bulletText: string, targetRole?: string, apiKey?: string) {
  const res = await fetch(`${API_BASE}/student/optimize-bullet`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ bullet_text: bulletText, target_role: targetRole, api_key: apiKey })
  });
  return res.json();
}

export async function fetchHallTicket(studentId: number, applicationId: number) {
  const res = await fetch(`${API_BASE}/student/hall-ticket/${studentId}/${applicationId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to load hall ticket");
  }
  return res.json();
}

export function getPlacementCsvDownloadUrl(): string {
  return `${API_BASE}/admin/export-placement-csv`;
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

export async function fetchAdminCompanies() {
  const res = await fetch(`${API_BASE}/admin/companies`, {
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function toggleCompanyVerification(companyId: number) {
  const res = await fetch(`${API_BASE}/admin/verify-company/${companyId}`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  return res.json();
}

// -------------------------------------------------------------
// Enterprise Features & Governance Endpoints
// -------------------------------------------------------------

export async function fetchCurrentUser() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to restore session");
  }
  return res.json();
}

export async function fetchNotifications() {
  const res = await fetch(`${API_BASE}/auth/notifications`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return { notifications: [], total: 0, unread: 0 };
  return res.json();
}

export async function dismissAllNotifications() {
  const res = await fetch(`${API_BASE}/auth/notifications/dismiss-all`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function clearAllNotifications() {
  const res = await fetch(`${API_BASE}/auth/notifications/clear`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
  return res.json();
}

export async function fetchStudentAttendance(studentId: number) {
  const res = await fetch(`${API_BASE}/student/attendance/${studentId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to load placement attendance");
  }
  return res.json();
}

export async function fetchStudentDossier(studentId: number) {
  const res = await fetch(`${API_BASE}/recruiter/student-dossier/${studentId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to load candidate dossier");
  }
  return res.json();
}

export async function autoScheduleBatch(payload: {
  job_id: number;
  slot_duration_minutes?: number;
  interview_date?: string;
  default_venue?: string;
}) {
  const res = await fetch(`${API_BASE}/recruiter/auto-schedule-batch/${payload.job_id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Auto-scheduling failed");
  }
  return res.json();
}

export async function downloadApplicantsCsv(jobId: number, filename = "applicants.csv") {
  const res = await fetch(`${API_BASE}/recruiter/export-applicants/${jobId}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to export applicants");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchPendingDrives() {
  const res = await fetch(`${API_BASE}/admin/pending-drives`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return { pending_drives: [], total: 0 };
  const data = await res.json();
  if (Array.isArray(data)) {
    return { pending_drives: data, total: data.length };
  }
  return data;
}

export async function approveDrive(jobId: number, deanRemarks?: string) {
  const res = await fetch(`${API_BASE}/admin/approve-drive/${jobId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ dean_remarks: deanRemarks || "Approved by Dean of Placements." })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to approve drive");
  }
  return res.json();
}

export async function renewMOUAndApprove(jobId: number, durationYears: number, deanRemarks?: string) {
  const res = await fetch(`${API_BASE}/admin/renew-mou-and-approve/${jobId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({
      extension_years: durationYears,
      duration_years: durationYears,
      dean_remarks: deanRemarks || `Renewed MOU for ${durationYears} year(s) and approved drive.`
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to renew MOU and approve drive");
  }
  return res.json();
}

export async function rejectDrive(jobId: number, reason: string) {
  const res = await fetch(`${API_BASE}/admin/reject-drive/${jobId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ remarks: reason, reason: reason })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to reject drive");
  }
  return res.json();
}

export async function fetchMOURegistry() {
  const res = await fetch(`${API_BASE}/admin/mou-registry`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return { registry: [], total: 0 };
  const data = await res.json();
  if (Array.isArray(data)) {
    return { registry: data, total: data.length };
  }
  return data;
}

export async function registerMOU(payload: {
  company_id: number;
  mou_reference_code?: string;
  mou_reference_no?: string;
  signed_date?: string;
  mou_valid_from?: string;
  expiry_date?: string;
  mou_valid_till?: string;
  category?: string;
  mou_category?: string;
  functional_activities?: string;
  mou_notes?: string;
}) {
  const res = await fetch(`${API_BASE}/admin/register-mou`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({
      company_id: payload.company_id,
      mou_reference_no: payload.mou_reference_no || payload.mou_reference_code,
      mou_reference_code: payload.mou_reference_code || payload.mou_reference_no,
      mou_valid_from: payload.mou_valid_from || payload.signed_date,
      signed_date: payload.signed_date || payload.mou_valid_from,
      mou_valid_till: payload.mou_valid_till || payload.expiry_date,
      expiry_date: payload.expiry_date || payload.mou_valid_till,
      mou_category: payload.mou_category || payload.category,
      category: payload.category || payload.mou_category,
      mou_notes: payload.mou_notes || payload.functional_activities,
      functional_activities: payload.functional_activities || payload.mou_notes
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to register MOU");
  }
  return res.json();
}

export async function downloadPlacementsCsv(filename = "placements_export.csv") {
  const res = await fetch(`${API_BASE}/admin/export-placement-csv`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to export placements data");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// AI Placement Copilot & Campus-Scale Ingestion Endpoints
// -------------------------------------------------------------

export async function sendCopilotChat(payload: {
  message: string;
  user_name?: string;
  user_role?: string;
  student_id?: number;
  target_role?: string;
  context_topic?: string;
}) {
  const res = await fetch(`${API_BASE}/api/copilot/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Copilot communication failed");
  }
  return res.json();
}

export async function optimizeResumeWithCopilot(payload: {
  student_id: number;
  target_role?: string;
  target_company?: string;
  current_resume_text?: string;
}) {
  const res = await fetch(`${API_BASE}/api/copilot/optimize-resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Resume optimization failed");
  }
  return res.json();
}

export async function downloadSampleRosterCsv(filename = "VFSTR_Student_Roster_Template.csv") {
  const res = await fetch(`${API_BASE}/admin/students/sample-csv`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to download template");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function importStudentsCsv(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/admin/students/import-csv`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "CSV import failed");
  }
  return res.json();
}

export async function generateDemoCohort(count = 100, batchYear = 2022) {
  const res = await fetch(`${API_BASE}/admin/students/generate-cohort`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ count, batch_year: batchYear })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to generate cohort");
  }
  return res.json();
}

export async function fetchStudentsPaginated(params: {
  page?: number;
  limit?: number;
  search?: string;
  branch?: string;
  placement_status?: string;
}) {
  const query = new URLSearchParams();
  if (params.page) query.append("page", String(params.page));
  if (params.limit) query.append("limit", String(params.limit));
  if (params.search) query.append("search", params.search);
  if (params.branch) query.append("branch", params.branch);
  if (params.placement_status) query.append("placement_status", params.placement_status);

  const res = await fetch(`${API_BASE}/admin/all-students-paginated?${query.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) return { students: [], total: 0, page: 1, limit: 20, total_pages: 1 };
  return res.json();
}

export async function draftDriveAnnouncementEmail(jobId: number, customNotes?: string) {
  const res = await fetch(`${API_BASE}/admin/drives/${jobId}/draft-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ custom_notes: customNotes || "" })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to draft announcement email");
  }
  return res.json();
}

export async function dispatchDriveAnnouncementEmail(jobId: number, subject: string, bodyHtml: string) {
  const res = await fetch(`${API_BASE}/admin/drives/${jobId}/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ subject, body_html: bodyHtml })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to dispatch email broadcast");
  }
  return res.json();
}
