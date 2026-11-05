import React, { useState, useEffect } from 'react';
import type { UserSession, StudentProfile, JobCard, ApplicationItem } from '../types';
import { 
  fetchStudentProfile, 
  uploadResumeFile, 
  fetchStudentJobs, 
  applyToJob, 
  fetchStudentApplications, 
  fetchRoadmap,
  updateTargetRole
} from '../api';
import { RoadmapModal } from '../components/RoadmapModal';
import { TargetRoleModal } from '../components/TargetRoleModal';
import { MockInterviewModal } from '../components/MockInterviewModal';
import { TalentShineResumeBuilder } from '../components/TalentShineResumeBuilder';
import { 
  Briefcase, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Calendar, 
  Sparkles, 
  Target, 
  TrendingUp, 
  Clock, 
  Award,
  Upload,
  AlertCircle,
  HelpCircle,
  Play,
  Layers,
  ArrowRight,
  ShieldAlert,
  Compass,
  Lock
} from 'lucide-react';

interface Props {
  session: UserSession;
  activeNavTab?: 'jobs' | 'applications' | 'resume';
  onNavTabChange?: (tab: 'jobs' | 'applications' | 'resume') => void;
  triggerAssessment?: boolean;
  onCloseAssessmentTrigger?: () => void;
}

export const StudentDashboard: React.FC<Props> = ({ 
  session, 
  activeNavTab, 
  onNavTabChange,
  triggerAssessment,
  onCloseAssessmentTrigger 
}) => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const shortlistedApps = applications.filter(a => a.status.includes('Shortlisted') || a.status.includes('Confirmed'));
  const shortlistedCompanies = Array.from(new Set(shortlistedApps.map(a => a.company)));
  const [activeTab, setActiveTab] = useState<'jobs' | 'applications' | 'resume'>(activeNavTab || 'jobs');

  useEffect(() => {
    if (activeNavTab) {
      setActiveTab(activeNavTab);
    }
  }, [activeNavTab]);

  useEffect(() => {
    if (triggerAssessment) {
      if (shortlistedCompanies.length > 0) {
        setMockModalCompany(shortlistedCompanies[0]);
      } else {
        setMockModalCompany("LOCKED");
      }
      if (onCloseAssessmentTrigger) onCloseAssessmentTrigger();
    }
  }, [triggerAssessment]);
  
  // Resume Center sub-mode
  const [resumeSubMode, setResumeSubMode] = useState<'builder' | 'upload'>('builder');

  // File upload state
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lastUploadBreakdown, setLastUploadBreakdown] = useState<any>(null);

  // Modals
  const [targetRoleModalOpen, setTargetRoleModalOpen] = useState(false);
  const [selectedRoadmap, setSelectedRoadmap] = useState<any>(null);
  const [mockModalCompany, setMockModalCompany] = useState<string | null>(null);

  const profileId = session.profile_id || 1;

  const loadData = async () => {
    try {
      const prof = await fetchStudentProfile(profileId);
      setProfile(prof);

      const jobsData = await fetchStudentJobs(profileId);
      setJobs(jobsData);

      const apps = await fetchStudentApplications(profileId);
      setApplications(apps);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [profileId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadSuccess(null);
    setLastUploadBreakdown(null);
    setUploading(true);

    try {
      const res = await uploadResumeFile(profileId, file);
      setUploadSuccess(`Ingested "${file.name}"! Authentic ATS Score: ${res.ats_score}/100 with ${res.skills_extracted?.length || 0} skills classified.`);
      setLastUploadBreakdown(res);
      await loadData();
      
      // Onboarding trigger: Prompt user to choose target career role if not set!
      setTimeout(() => {
        setTargetRoleModalOpen(true);
      }, 1400);
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const [loadingRoadmapId, setLoadingRoadmapId] = useState<number | null>(null);

  const handleApply = async (jobId: number) => {
    await applyToJob(profileId, jobId);
    loadData();
  };

  const handleViewRoadmap = async (jobId: number) => {
    try {
      setLoadingRoadmapId(jobId);
      const data = await fetchRoadmap(profileId, jobId);
      setSelectedRoadmap(data);
    } catch (err: any) {
      console.error("Roadmap load error:", err);
      alert("Unable to generate roadmap right now. Please try again.");
    } finally {
      setLoadingRoadmapId(null);
    }
  };

  const handleSelectTargetRole = async (newRole: string) => {
    try {
      const res = await updateTargetRole(profileId, newRole);
      await loadData();
      if (res && res.ats_score !== undefined) {
        setUploadSuccess(`Target role updated to "${newRole}". ATS Score rescanned: ${res.ats_score}/100.`);
        setTimeout(() => setUploadSuccess(null), 4000);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const hasResume = Boolean(profile && profile.has_resume && profile.ats_score > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Profile Header */}
      {profile && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {profile.degree} • {profile.branch}
              </span>
              <span className="bg-slate-100 text-slate-700 text-xs font-mono font-semibold px-2 py-0.5 rounded-md">
                {profile.reg_no}
              </span>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                {profile.year_info.year_label} ({profile.year_info.batch})
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Hello, {profile.name}
            </h1>

            {/* Target Role Pill */}
            <div className="flex items-center space-x-2 pt-1">
              <span className="text-xs text-slate-500 font-medium">Target Role:</span>
              <button 
                onClick={() => setTargetRoleModalOpen(true)}
                className="inline-flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1 rounded-full transition"
              >
                <Target size={13} />
                <span>{profile.target_role || "Select Target Role"}</span>
                <span className="text-[10px] text-blue-500 underline ml-1">Change</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics: STRICT GUARDRAIL - No hardcoded numbers for empty profiles */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between sm:justify-start">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center min-w-[120px]">
              <div className="text-[10px] text-slate-500 font-bold uppercase">CGPA Cutoff</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{profile.cgpa.toFixed(2)}</div>
              <div className="text-[10px] text-emerald-600 font-semibold">{profile.active_backlogs === 0 ? "0 Backlogs" : `${profile.active_backlogs} Backlogs`}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-center min-w-[130px]">
              <div className="text-[10px] text-slate-500 font-bold uppercase">ATS Resume Score</div>
              <div className={`text-xl font-black mt-0.5 ${hasResume ? 'text-blue-600' : 'text-slate-400'}`}>
                {hasResume ? `${profile.ats_score} / 100` : '-- / 100'}
              </div>
              <div className={`text-[10px] font-semibold ${hasResume ? 'text-emerald-600' : 'text-amber-600'}`}>
                {hasResume ? "Verified Real ATS" : "No Resume Uploaded"}
              </div>
            </div>

            <div className={`p-4 rounded-2xl text-center min-w-[140px] shadow-md ${
              hasResume 
                ? 'bg-gradient-to-tr from-blue-700 to-indigo-600 text-white shadow-blue-500/20' 
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
              <div className={`text-[10px] font-bold uppercase ${hasResume ? 'text-blue-200' : 'text-slate-400'}`}>
                Readiness Index
              </div>
              <div className="text-xl font-black mt-0.5">{hasResume ? `${profile.readiness_index}%` : '0%'}</div>
              <div className={`text-[10px] font-semibold flex items-center justify-center space-x-1 mt-0.5 ${hasResume ? 'text-emerald-300' : 'text-slate-400'}`}>
                <TrendingUp size={12} />
                <span>{hasResume ? "Placement Ready" : "Resume Needed"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW USER ONBOARDING BANNER (If no resume uploaded yet) */}
      {!hasResume && (
        <div className="bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-indigo-500/10 border-2 border-dashed border-amber-300 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-start space-x-4">
            <div className="bg-amber-500 text-white p-3 rounded-2xl shadow-md">
              <ShieldAlert size={26} />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-lg font-black text-slate-900">
                Action Required: Ingest Your Resume to Generate Your Authentic ATS Score
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                As per institutional guardrails, ATS scores are never hardcoded or pre-filled. You can either upload your existing PDF/Word document, or construct your professional resume using our interactive Talent Shine builder.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              onClick={() => {
                setActiveTab('resume');
                setResumeSubMode('upload');
              }}
              className="bg-white hover:bg-slate-50 border border-slate-300 rounded-2xl p-4 text-left shadow-sm hover:border-blue-500 transition group flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 text-blue-700 p-2.5 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition">
                  <Upload size={20} />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-slate-900">Option 1: Upload Existing Resume</div>
                  <div className="text-xs text-slate-500">Scan PDF or Word (.docx) with real ATS parser</div>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" />
            </button>

            <button
              onClick={() => {
                setActiveTab('resume');
                setResumeSubMode('builder');
              }}
              className="bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-2xl p-4 text-left shadow-md transition group flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 text-white p-2.5 rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-white">Option 2: Use Talent Shine Builder</div>
                  <div className="text-xs text-blue-200">14-section editor with 10 templates & STAR AI</div>
                </div>
              </div>
              <ArrowRight size={18} className="text-white group-hover:translate-x-1 transition" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4 sm:space-x-8 text-xs sm:text-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`pb-3 font-bold flex items-center space-x-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'jobs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase size={16} />
          <span>Explore Campus Drives ({jobs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-3 font-bold flex items-center space-x-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'applications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award size={16} />
          <span>My Applications & Passes ({applications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('resume')}
          className={`pb-3 font-bold flex items-center space-x-2 border-b-2 whitespace-nowrap transition ${
            activeTab === 'resume' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText size={16} />
          <span>Resume Center ({hasResume ? `ATS: ${profile?.ats_score}` : 'Pending'})</span>
        </button>
      </div>

      {/* TAB 1: LIVE DRIVES */}
      {activeTab === 'jobs' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Active Placement Drives at VFSTR
            </h3>
            <span className="text-xs text-slate-500 font-medium">Sorted by Target Role & AI Match</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map(job => (
              <div 
                key={job.job_id} 
                className={`bg-white rounded-3xl p-6 border transition-all flex flex-col justify-between ${
                  job.target_role_match 
                    ? 'border-blue-500 shadow-md ring-2 ring-blue-500/10' 
                    : 'border-slate-200 shadow-sm hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {job.company}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        job.job_type === 'Internship' 
                          ? 'bg-purple-50 text-purple-700 border-purple-200' 
                          : job.job_type === 'Internship + PPO'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {job.job_type || 'Full-Time'}
                      </span>
                    </div>
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs font-black px-2.5 py-0.5 rounded-full">
                      ₹{job.ctc_lpa} LPA
                    </span>
                  </div>

                  {job.target_role_match && (
                    <span className="inline-block bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-200">
                      🎯 Matches Your Target Career Track
                    </span>
                  )}

                  <h4 className="font-extrabold text-slate-900 text-base leading-snug">{job.title}</h4>
                  
                  {/* Match Gauge */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600">Skill Compatibility:</span>
                    <span className="text-xs font-black text-blue-600">{job.match_score}%</span>
                  </div>

                  {/* Skills Required */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {job.required_skills.slice(0, 4).map((s, i) => (
                      <span key={i} className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        {s}
                      </span>
                    ))}
                    {job.required_skills.length > 4 && (
                      <span className="text-[10px] text-slate-400">+{job.required_skills.length - 4} more</span>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 mt-4 flex items-center space-x-2">
                  <button
                    onClick={() => handleViewRoadmap(job.job_id)}
                    disabled={!hasResume || loadingRoadmapId === job.job_id}
                    className={`flex-1 font-bold text-xs py-2.5 rounded-xl transition text-center flex items-center justify-center space-x-1.5 border ${
                      hasResume
                        ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 shadow-sm'
                        : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    }`}
                    title={hasResume ? "Generate personalized learning roadmap" : "Upload or build your resume first to unlock the skill remediation roadmap"}
                  >
                    <Compass size={13} />
                    <span>{loadingRoadmapId === job.job_id ? "Generating..." : "Roadmap to improve the skills"}</span>
                  </button>

                  <button
                    onClick={() => handleApply(job.job_id)}
                    disabled={job.has_applied || !job.is_eligible}
                    className={`flex-1 font-bold text-xs py-2.5 rounded-xl transition ${
                      job.has_applied 
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : job.is_eligible
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {job.has_applied ? "Applied" : job.is_eligible ? "Apply Now" : "Ineligible"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: APPLICATIONS & PASSES */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Application Status & Digital Passes
          </h3>

          {applications.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-500">
              No job applications submitted yet. Explore active drives to apply!
            </div>
          ) : (
            applications.map(app => (
              <div key={app.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{app.company}</span>
                    <h4 className="text-lg font-black text-slate-900">{app.job_title}</h4>
                    <span className="text-xs font-bold text-slate-600">Package: ₹{app.ctc_lpa} LPA</span>
                  </div>

                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                    app.status.includes('Confirmed') 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : app.status.includes('Pending')
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {app.status}
                  </span>
                </div>

                {/* Digital Interview Pass */}
                {app.interview_slot && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center text-xs font-black text-emerald-900">
                      <span>🎟️ Digital VFSTR Interview Pass</span>
                      <span>{app.interview_slot.date}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                      <div>
                        <span className="text-[10px] text-emerald-700 uppercase font-bold block">Venue:</span>
                        <span className="font-extrabold text-slate-900">{app.interview_slot.block}</span>
                        <div className="text-slate-600">{app.interview_slot.chamber}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 uppercase font-bold block">Time Slot:</span>
                        <span className="font-extrabold text-blue-700">{app.interview_slot.time}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 uppercase font-bold block">Panel:</span>
                        <span className="font-bold text-slate-800">{app.interview_slot.panel}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Official Rounds List */}
                {app.recruitment_rounds && app.recruitment_rounds.length > 0 && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl text-xs space-y-2 border border-slate-100">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Official Rounds:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {app.recruitment_rounds.map((r, i) => (
                        <div key={i} className="bg-white p-2 rounded-xl border border-slate-200">
                          <div className="font-bold text-slate-900">{r.name}</div>
                          <div className="text-[10px] text-slate-500">{r.details}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Launch Shortlisted Interview */}
                {(app.status.includes('Shortlisted') || app.status.includes('Confirmed')) ? (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setMockModalCompany(app.company)}
                      className="bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center space-x-2 transition"
                    >
                      <Play size={14} />
                      <span>🎯 Launch {app.company} Interview Assessment (Unlocked)</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-end items-center space-x-1.5 pt-2 text-xs text-slate-400 font-medium">
                    <Lock size={12} className="text-slate-400" />
                    <span>Interview rounds unlock after recruiter shortlist</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: RESUME CENTER */}
      {activeTab === 'resume' && (
        <div className="space-y-6">
          {/* Sub-navigation inside Resume Center */}
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 max-w-md">
            <button
              onClick={() => setResumeSubMode('builder')}
              className={`flex-1 text-xs font-bold py-2 rounded-xl transition flex items-center justify-center space-x-2 ${
                resumeSubMode === 'builder' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText size={14} />
              <span>Talent Shine Builder</span>
            </button>
            <button
              onClick={() => setResumeSubMode('upload')}
              className={`flex-1 text-xs font-bold py-2 rounded-xl transition flex items-center justify-center space-x-2 ${
                resumeSubMode === 'upload' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload size={14} />
              <span>Upload PDF / Word</span>
            </button>
          </div>

          {/* SUBMODE 1: TALENT SHINE BUILDER */}
          {resumeSubMode === 'builder' && (
            <TalentShineResumeBuilder
              studentId={profileId}
              studentName={profile?.name || session.full_name}
              initialTargetRole={profile?.target_role || "Software Development Engineer (SDE)"}
              onSaveSuccess={(score, skills) => {
                loadData();
              }}
            />
          )}

          {/* SUBMODE 2: DOCUMENT UPLOAD & REAL-TIME ATS AUDIT */}
          {resumeSubMode === 'upload' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Upload Drag & Drop Box */}
              <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center space-x-2">
                  <Upload className="text-blue-600" size={22} />
                  <h4 className="font-extrabold text-slate-900 text-base">Upload Official Resume Document</h4>
                </div>
                <p className="text-xs text-slate-500">
                  Upload genuine text-based PDF or Word (.docx) documents. Image screenshots are strictly rejected by the guardrail.
                </p>

                <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50 transition">
                  <Upload size={30} className="text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-blue-600">Click to Select Document (.pdf, .docx)</span>
                  <span className="text-[10px] text-slate-400 mt-1">Maximum 5MB • PyMuPDF Extracted</span>
                  <input 
                    type="file" 
                    accept=".pdf,.docx,.doc" 
                    className="hidden" 
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>

                {uploading && (
                  <div className="text-xs text-blue-600 font-semibold animate-pulse flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    <span>Extracting text layer and running ATS multi-factor scoring...</span>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="text-xs text-emerald-800 bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 font-semibold flex items-start space-x-2">
                    <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>{uploadSuccess}</span>
                  </div>
                )}

                {uploadError && (
                  <div className="text-xs text-red-800 bg-red-50 p-3.5 rounded-2xl border border-red-200 font-semibold flex items-start space-x-2">
                    <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* Real ATS Diagnostic Panel */}
              <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex justify-between items-center border-b pb-3">
                  <h4 className="font-extrabold text-slate-900 text-base">Authentic ATS Diagnostic Report</h4>
                  <span className="text-xs font-bold text-slate-500">
                    Status: {hasResume ? 'Scanned & Active' : 'No Resume Uploaded'}
                  </span>
                </div>

                {hasResume && profile ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl flex justify-between items-center">
                      <div>
                        <div className="text-3xl font-black">{profile.ats_score} / 100</div>
                        <div className="text-xs font-bold text-blue-200 uppercase tracking-widest mt-0.5">
                          {profile.ats_score >= 70 ? "ATS Compliant" : "Needs Revision"}
                        </div>
                      </div>
                      <div className="text-right text-xs text-blue-200">
                        <div>Verified Skills: {profile.skills.length}</div>
                        <div>Target Track: {profile.target_role || "Unset"}</div>
                      </div>
                    </div>

                    {/* Verified Skills Tags */}
                    <div>
                      <span className="text-xs font-bold text-slate-700 uppercase block mb-1.5">Classified Skills:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.skills.map((s, i) => (
                          <span key={i} className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md border border-blue-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actionable Feedback */}
                    {profile.ats_feedback && profile.ats_feedback.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1.5">
                        <span className="text-xs font-bold text-amber-800 uppercase flex items-center space-x-1.5">
                          <AlertCircle size={14} />
                          <span>Actionable Recommendations:</span>
                        </span>
                        <ul className="text-xs text-amber-900 space-y-1 list-disc list-inside">
                          {profile.ats_feedback.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                    <ShieldAlert size={32} className="mx-auto text-slate-300" />
                    <p className="font-bold">No resume text has been analyzed for this profile.</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Upload a PDF/Word file on the left or switch to the Talent Shine Resume Builder to calculate your real score.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* MODALS */}
      <TargetRoleModal
        isOpen={targetRoleModalOpen}
        currentRole={profile?.target_role || ""}
        onClose={() => setTargetRoleModalOpen(false)}
        onSelectRole={handleSelectTargetRole}
      />

      {selectedRoadmap && (
        <RoadmapModal
          data={selectedRoadmap}
          onClose={() => setSelectedRoadmap(null)}
        />
      )}

      {mockModalCompany && (
        <MockInterviewModal
          isOpen={Boolean(mockModalCompany)}
          studentId={profileId}
          shortlistedCompanies={shortlistedCompanies}
          initialCompany={mockModalCompany === 'LOCKED' ? null : mockModalCompany}
          onClose={() => setMockModalCompany(null)}
        />
      )}

    </div>
  );
};
