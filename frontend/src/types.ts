export interface UserSession {
  token: string;
  role: 'student' | 'recruiter' | 'admin';
  full_name: string;
  user_id: number;
  profile_id?: number | null;
  reg_no?: string | null;
  email?: string | null;
  degree?: string | null;
  branch?: string | null;
  year?: string | null;
  batch?: string | null;
  company_name?: string | null;
  year_info?: any;
}

export interface DemoPersona {
  label: string;
  role: 'student' | 'recruiter' | 'admin';
  identifier: string;
  token: string;
  full_name: string;
  user_id: number;
  profile_id: number | null;
  reg_no: string | null;
  email: string;
}

export interface StudentProfile {
  id: number;
  name: string;
  email: string;
  reg_no: string;
  degree: string;
  branch: string;
  cgpa: number;
  active_backlogs: number;
  skills: string[];
  target_role: string;
  target_company: string;
  resume_text: string;
  ats_score: number;
  ats_feedback: string[];
  placement_status: string;
  year_info: {
    reg_no: string;
    degree: string;
    duration_years: number;
    start_year: number;
    end_year: number;
    batch: string;
    current_year_num: number;
    year_label: string;
    is_final_year: boolean;
    status: string;
  };
  readiness_index: number;
  has_resume?: boolean;
  selected_template?: string;
  accent_color?: string;
}

export interface RecruitmentRound {
  round_no: number;
  name: string;
  type: string;
  details: string;
}

export interface JobCard {
  job_id: number;
  title: string;
  company: string;
  mou_status?: string;
  company_mou_ref?: string;
  company_mou_status?: string;
  ctc_lpa: number;
  job_type: string;
  min_cgpa: number;
  eligible_branches: string[];
  required_skills: string[];
  deadline: string;
  is_eligible: boolean;
  eligibility_reasons: string[];
  eligibility_diagnostics?: {
    cgpa?: { met: boolean; actual: number; required: number; gap: number };
    backlogs?: { met: boolean; actual: number; allowed: number };
    branch?: { met: boolean; student_branch: string; allowed_branches: string[] };
    year?: { met: boolean; student_year_label: string; student_year_num: number; allowed_years: number[] };
  };
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  target_role_match: boolean;
  recruitment_rounds: RecruitmentRound[];
  has_applied: boolean;
  application_status?: string | null;
}

export interface ApplicationItem {
  id: number;
  job_id: number;
  job_title: string;
  company: string;
  ctc_lpa: number;
  status: string;
  match_score: number;
  applied_at: string;
  recruitment_rounds: RecruitmentRound[];
  interview_slot?: {
    block: string;
    chamber: string;
    date: string;
    time: string;
    panel: string;
    status: string;
  } | null;
}

export interface PYQMockQuestion {
  company: string;
  role: string;
  title: string;
  question: string;
  required_concepts: string[];
  benchmark_summary: string;
}

export interface RoadmapData {
  student_year: string;
  batch: string;
  target_job: string;
  company: string;
  missing_skills: string[];
  roadmap: Array<{
    day: string;
    title: string;
    details: string;
    priority: string;
  }>;
}

// Talent Shine 14-Section Resume Builder Data
export interface ResumeBasics {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  picture: string;
  customFields?: Array<{ title: string; value: string }>;
}

export interface ResumeProfileItem {
  network: string;
  username: string;
  url: string;
}

export interface ResumeExperienceItem {
  company: string;
  position: string;
  location: string;
  dateRange: string;
  summary: string;
}

export interface ResumeEducationItem {
  institution: string;
  degree: string;
  field: string;
  score: string;
  dateRange: string;
}

export interface ResumeSkillItem {
  name: string;
  keywords: string;
}

export interface ResumeLanguageItem {
  name: string;
  fluency: string;
}

export interface ResumeAwardItem {
  title: string;
  awarder: string;
  date: string;
  summary: string;
}

export interface ResumeCertificationItem {
  title: string;
  issuer: string;
  date: string;
  url: string;
}

export interface ResumeInterestItem {
  name: string;
  keywords?: string;
}

export interface ResumeProjectItem {
  name: string;
  techStack: string;
  link: string;
  github?: string;
  description: string;
}

export interface ResumePublicationItem {
  name: string;
  publisher: string;
  date: string;
  link?: string;
  summary: string;
}

export interface ResumeVolunteeringItem {
  organization: string;
  role: string;
  dateRange: string;
  summary: string;
}

export interface ResumeReferenceItem {
  name: string;
  company: string;
  contact: string;
}

export interface TalentShineResumeData {
  basics: ResumeBasics;
  summary: string;
  profiles: ResumeProfileItem[];
  experience: ResumeExperienceItem[];
  education: ResumeEducationItem[];
  skills: ResumeSkillItem[];
  languages: ResumeLanguageItem[];
  awards: ResumeAwardItem[];
  certifications: ResumeCertificationItem[];
  interests: ResumeInterestItem[];
  projects: ResumeProjectItem[];
  publications: ResumePublicationItem[];
  volunteering: ResumeVolunteeringItem[];
  references: ResumeReferenceItem[];
}

export type ResumeTemplateId = 
  | 'gengar'
  | 'azurill'
  | 'bronzor'
  | 'chikorita'
  | 'ditto'
  | 'glalie'
  | 'kakuna'
  | 'leafish'
  | 'onix'
  | 'pikachu';

export interface ATSScoreBreakdown {
  ats_score: number;
  verdict: string;
  breakdown: {
    contact: number;
    sections: number;
    skills: number;
    metrics: number;
    formatting: number;
  };
  strengths: string[];
  recommendations: string[];
  skills_extracted?: string[];
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AcademicSemesterItem {
  semester_num: number;
  sgpa: number;
  cgpa_at_sem: number;
  credits_earned: number;
  backlogs_in_sem: number;
  is_cleared: boolean;
  cleared_date?: string | null;
}

export interface StudentDossier {
  student_id: number;
  name: string;
  reg_no: string;
  degree: string;
  branch: string;
  overall_cgpa: number;
  active_backlogs: number;
  historical_backlogs_count: number;
  total_credits_earned: number;
  placement_status: string;
  target_role: string;
  ats_score: number;
  skills: string[];
  honors: string[];
  certifications: string[];
  semester_progression: AcademicSemesterItem[];
  resume_text_available: boolean;
}

export interface DriveAttendanceItem {
  id: number;
  job_id: number;
  job_title: string;
  company_name: string;
  event_type: string;
  status: string;
  check_in_time: string;
  verified_by: string;
  scan_hash?: string;
}

export interface PendingDriveItem {
  id: number;
  title: string;
  company_id: number;
  company_name: string;
  domain: string;
  mou_status: string;
  mou_reference_no: string;
  mou_valid_from: string;
  mou_valid_till: string;
  mou_category: string;
  job_type: string;
  ctc_lpa: number;
  min_cgpa: number;
  max_backlogs: number;
  eligible_branches: string[];
  eligible_years: number[];
  deadline: string;
  created_at: string;
}

export interface MOURegistryItem {
  company_id: number;
  company_name: string;
  domain: string;
  website: string;
  is_verified: boolean;
  mou_reference_no: string;
  mou_category: string;
  mou_valid_from: string;
  mou_valid_till: string;
  mou_status: string;
  active_drives_count: number;
  total_hired_students: number;
}

