import React, { useState, useEffect } from 'react';
import type { UserSession, StudentDossier } from '../types';
import { 
  fetchRecruiterDashboard, 
  fetchRecruiterJobs, 
  postNewJob, 
  fetchJobApplicants, 
  shortlistApplicant, 
  fetchVenueSuggestions,
  allocateSlotWithCheck,
  autoScheduleBatch,
  downloadApplicantsCsv,
  fetchStudentDossier
} from '../api';
import { 
  Building2, 
  PlusCircle, 
  Users, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  AlertTriangle,
  Download,
  Zap,
  GraduationCap,
  Award,
  BookOpen,
  X,
  FileSpreadsheet
} from 'lucide-react';

interface Props {
  session: UserSession;
}

export const RecruiterDashboard: React.FC<Props> = ({ session }) => {
  const [stats, setStats] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  
  // Post Drive Form
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [jobType, setJobType] = useState<'Full-Time' | 'Internship' | 'Internship + PPO'>('Full-Time');
  const [ctcLpa, setCtcLpa] = useState(8.5);
  const [minCgpa, setMinCgpa] = useState(7.0);
  const [skills, setSkills] = useState('Python, SQL, React');
  const [description, setDescription] = useState('Developing high-performance software modules and microservices.');
  const [selectedYears, setSelectedYears] = useState<number[]>([4]);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);

  // Allocate Slot Modal
  const [slotModalApp, setSlotModalApp] = useState<any | null>(null);
  const [venueData, setVenueData] = useState<any | null>(null);
  const [chosenBlock, setChosenBlock] = useState('A Block');
  const [chosenChamber, setChosenChamber] = useState('Chamber A-204 (Interview Panel 1)');
  const [chosenDate, setChosenDate] = useState('2026-11-15');
  const [chosenTime, setChosenTime] = useState('10:30 AM - 11:00 AM');
  const [collisionError, setCollisionError] = useState<string | null>(null);
  const [allocating, setAllocating] = useState(false);
  const [allocSuccess, setAllocSuccess] = useState<string | null>(null);

  // Auto-Scheduling & Academic Dossier State
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [autoScheduleResult, setAutoScheduleResult] = useState<string | null>(null);
  const [selectedDossier, setSelectedDossier] = useState<StudentDossier | null>(null);
  const [loadingDossier, setLoadingDossier] = useState<boolean>(false);

  const recruiterId = session.profile_id || 1;

  const loadData = async () => {
    try {
      const s = await fetchRecruiterDashboard(recruiterId);
      setStats(s);

      const j = await fetchRecruiterJobs(recruiterId);
      setJobs(j);
      if (j.length > 0 && !selectedJobId) {
        setSelectedJobId(j[0].id);
      }

      const v = await fetchVenueSuggestions();
      setVenueData(v);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [recruiterId]);

  useEffect(() => {
    if (selectedJobId) {
      fetchJobApplicants(selectedJobId).then(setApplicants).catch(console.error);
    }
  }, [selectedJobId]);

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const skillsArr = skills.split(',').map(s => s.trim()).filter(Boolean);
      const res = await postNewJob(recruiterId, {
        title,
        job_type: jobType,
        ctc_lpa: parseFloat(String(ctcLpa)),
        min_cgpa: parseFloat(String(minCgpa)),
        required_skills: skillsArr,
        description,
        eligible_branches: ["CSE", "IT", "AI_DS", "ECE"],
        eligible_years: selectedYears
      });
      setNotifyResult(`Drive posted! Status: ${res.status}. Submitted to Dean for MOU verification.`);
      setTimeout(() => {
        setNotifyResult(null);
        setIsPostOpen(false);
      }, 3500);
      loadData();
    } catch (e) {
      alert("Failed to post job");
    }
  };

  // Shortlist and immediately prompt Interview Slot allocation (compulsory smart scheduling)
  const handleShortlist = async (appId: number) => {
    try {
      await shortlistApplicant(appId);
      if (selectedJobId) {
        const data = await fetchJobApplicants(selectedJobId);
        setApplicants(data);
        const app = data.find((a: any) => a.application_id === appId);
        if (app) {
          handleOpenSlotModal(app);
        }
      }
    } catch (e) {
      console.error("Shortlist error:", e);
    }
  };

  const handleOpenSlotModal = (app: any) => {
    setSlotModalApp(app);
    setCollisionError(null);
    setAllocSuccess(null);
  };

  const handleConfirmSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotModalApp) return;
    setCollisionError(null);
    setAllocating(true);

    try {
      const res = await allocateSlotWithCheck({
        application_id: slotModalApp.application_id,
        block_name: chosenBlock,
        chamber_name: chosenChamber,
        slot_date: chosenDate,
        slot_time: chosenTime,
        panel_name: "Panel 1 (Technical & Coding)"
      });
      setAllocSuccess(res.message);
      setTimeout(() => {
        setSlotModalApp(null);
        if (selectedJobId) {
          fetchJobApplicants(selectedJobId).then(setApplicants);
        }
      }, 2000);
    } catch (err: any) {
      setCollisionError(err.message || "Collision detected");
    } finally {
      setAllocating(false);
    }
  };

  const handleAutoScheduleAll = async () => {
    if (!selectedJobId) return;
    setIsAutoScheduling(true);
    setAutoScheduleResult(null);
    try {
      const res = await autoScheduleBatch({
        job_id: selectedJobId,
        slot_duration_minutes: 30,
        interview_date: "2026-11-18",
        default_venue: "Chamber A-204"
      });
      setAutoScheduleResult(res.message);
      const data = await fetchJobApplicants(selectedJobId);
      setApplicants(data);
      setTimeout(() => setAutoScheduleResult(null), 5000);
    } catch (err: any) {
      alert(err.message || "Auto-scheduling batch failed");
    } finally {
      setIsAutoScheduling(false);
    }
  };

  const handleOpenDossier = async (studentId: number) => {
    setLoadingDossier(true);
    try {
      const dossier = await fetchStudentDossier(studentId);
      setSelectedDossier(dossier);
    } catch (err) {
      alert("Could not load candidate academic dossier");
    } finally {
      setLoadingDossier(false);
    }
  };

  const handleExportCsv = async () => {
    if (!selectedJobId) return;
    try {
      await downloadApplicantsCsv(selectedJobId, `Applicants_Job_${selectedJobId}.csv`);
    } catch (e) {
      alert("Failed to download CSV");
    }
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);
  const shortlistedCount = applicants.filter(a => a.status.includes('Shortlisted') || a.scheduled_slot).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Top Banner */}
      {stats && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center space-x-1">
                <CheckCircle2 size={13} />
                <span>Verified VFSTR Recruiter</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {stats.company_name} Talent Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Authorized Recruiter: <span className="font-bold text-slate-800">{stats.recruiter_name}</span>
              {stats.employee_id && (
                <> • Corporate ID: <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{stats.employee_id}</span></>
              )}
              {" "}• Active Drives: <span className="font-bold text-blue-600">{stats.active_jobs_count}</span>
            </p>
          </div>

          <button
            onClick={() => setIsPostOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-md shadow-blue-600/20 flex items-center space-x-2 transition"
          >
            <PlusCircle size={18} />
            <span>Publish New Campus Drive</span>
          </button>
        </div>
      )}

      {/* Institutional MOU Governance Status Banner */}
      {stats && stats.mou_status && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          stats.is_mou_valid
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : 'bg-amber-50/70 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm ${
              stats.is_mou_valid ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
            }`}>
              MOU
            </div>
            <div>
              <div className="font-bold text-xs sm:text-sm">
                {stats.is_mou_valid
                  ? `Institutional Industry Partnership MOU Active (Ref: ${stats.mou_reference_no || 'NAAC-3.5'})`
                  : `Institutional Partnership MOU Expired / In Renewal (Ref: ${stats.mou_reference_no || 'Pending'})`}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {stats.is_mou_valid
                  ? `Valid till ${stats.mou_valid_till ? new Date(stats.mou_valid_till).toLocaleDateString() : 'Active'}. Drives are reviewed by Dean for final student release.`
                  : 'Notice: Posted campus drives are held in Dean Review queue. The Dean can renew the MOU and release the drive with a single click.'}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
            stats.is_mou_valid
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}>
            {stats.mou_status}
          </span>
        </div>
      )}

      {/* Drive Selector */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recruitment Drives:</h3>
        <div className="flex flex-wrap gap-2.5">
          {jobs.map(j => (
            <button
              key={j.id}
              onClick={() => setSelectedJobId(j.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-2 transition ${
                selectedJobId === j.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{j.title}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                j.job_type === 'Internship' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                j.job_type === 'Internship + PPO' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                {j.job_type || 'Full-Time'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                selectedJobId === j.id ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {j.ctc_lpa} LPA
              </span>
              {j.status === 'PENDING_DEAN_APPROVAL' && (
                <span className="bg-amber-400 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded">
                  Pending Dean
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pending Approval Notice if selected job is awaiting Dean gate */}
      {selectedJob && selectedJob.status === 'PENDING_DEAN_APPROVAL' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center space-x-3 text-xs text-amber-900 font-medium">
          <Clock size={18} className="text-amber-600 flex-shrink-0" />
          <div>
            <strong className="block text-amber-950 font-bold">Drive Awaiting Dean Approval & MOU Gate</strong>
            <span>This drive has been submitted to the Dean of Placements. Students will see this drive once approved in the Dean console.</span>
          </div>
        </div>
      )}

      {/* Candidate Pool */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center space-x-2">
              <Users className="text-blue-600" size={20} />
              <span>Candidate Applications ({applicants.length} Applicants)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by Semantic Skill Fit. Shortlist candidates, inspect academic dossiers, and schedule interview panels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAutoScheduleAll}
              disabled={isAutoScheduling || shortlistedCount === 0}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-sm"
              title="Automatically distribute all shortlisted candidates across panels and available chamber slots"
            >
              <Zap size={14} className="text-yellow-300" />
              <span>{isAutoScheduling ? 'Scheduling...' : '⚡ Smart Auto-Schedule All'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={applicants.length === 0}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 border border-slate-300"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {autoScheduleResult && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-2xl font-bold flex items-center space-x-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{autoScheduleResult}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Branch & CGPA</th>
                <th className="py-3 px-4">Skills Extracted</th>
                <th className="py-3 px-4">AI Fit Score</th>
                <th className="py-3 px-4">Recruitment Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applicants.map(app => (
                <tr key={app.application_id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{app.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{app.reg_no}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="font-bold text-slate-800">{app.branch}</div>
                    <div className="text-slate-500">CGPA: {app.cgpa.toFixed(2)}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {app.skills.map((s: string, i: number) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center space-x-1 bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200">
                      <Sparkles size={12} />
                      <span>{app.match_score}%</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {app.scheduled_slot ? (
                      <div>
                        <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 w-fit">
                          <Clock size={11} />
                          <span>{app.scheduled_slot.time}</span>
                        </span>
                        <div className="text-[10px] text-slate-600 font-medium mt-0.5">
                          {app.scheduled_slot.block} ({app.scheduled_slot.chamber})
                        </div>
                      </div>
                    ) : (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        app.status.includes('Shortlisted') ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {app.status}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleOpenDossier(app.student_id)}
                        disabled={loadingDossier}
                        className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-xl transition flex items-center space-x-1 border border-slate-300"
                        title="View semester-by-semester SGPA progression & backlog history"
                      >
                        <GraduationCap size={13} className="text-blue-600" />
                        <span>Dossier</span>
                      </button>

                      {app.status === 'Applied' && (
                        <button
                          onClick={() => handleShortlist(app.application_id)}
                          className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl transition shadow-sm"
                        >
                          Shortlist
                        </button>
                      )}

                      {app.status.includes('Shortlisted') && (
                        <button
                          onClick={() => handleOpenSlotModal(app)}
                          className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl transition shadow-sm"
                        >
                          {app.scheduled_slot ? 'Reschedule' : 'Allocate Slot'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Human-in-the-Loop Slot Allocation Dialog */}
      {slotModalApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Allocate Interview Slot for {slotModalApp.name}
            </h3>
            <p className="text-xs text-slate-500">
              Select the campus venue and time slot. Our collision detector ensures no panel or student overlap.
            </p>

            {collisionError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-2xl flex items-center space-x-2 font-medium">
                <AlertTriangle size={16} className="flex-shrink-0" />
                <span>{collisionError}</span>
              </div>
            )}

            {allocSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-2xl font-bold flex items-center space-x-1.5">
                <CheckCircle2 size={16} />
                <span>{allocSuccess}</span>
              </div>
            )}

            <form onSubmit={handleConfirmSlot} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">VFSTR Block</label>
                  <select
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={chosenBlock}
                    onChange={e => {
                      setChosenBlock(e.target.value);
                      if (venueData && venueData.all_blocks[e.target.value]) {
                        setChosenChamber(venueData.all_blocks[e.target.value][0]);
                      }
                    }}
                  >
                    {venueData && Object.keys(venueData.all_blocks).map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Chamber / Room</label>
                  <select
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={chosenChamber}
                    onChange={e => setChosenChamber(e.target.value)}
                  >
                    {venueData && venueData.all_blocks[chosenBlock]?.map((ch: string) => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Interview Date</label>
                  <input
                    type="date"
                    required
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={chosenDate}
                    onChange={e => setChosenDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Time Slot</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:30 AM - 11:00 AM"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={chosenTime}
                    onChange={e => setChosenTime(e.target.value)}
                  />
                </div>
              </div>

              {venueData && venueData.suggested_slots && (
                <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200 space-y-1.5">
                  <span className="font-bold text-blue-900 uppercase text-[10px]">AI-Suggested Free Slots in {chosenBlock}:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {venueData.suggested_slots.slice(0, 3).map((s: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setChosenBlock(s.block);
                          setChosenChamber(s.chamber);
                          setChosenTime(s.slot_time);
                        }}
                        className="bg-white border border-blue-300 text-blue-800 text-[10px] px-2 py-1 rounded-lg font-semibold hover:bg-blue-100"
                      >
                        {s.slot_time} ({s.chamber.split(' ')[0]})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSlotModalApp(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allocating}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition"
                >
                  {allocating ? 'Verifying Collision...' : 'Confirm Slot & Notify Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Academic Dossier Modal */}
      {selectedDossier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border border-blue-200">
                  Candidate Academic Dossier
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {selectedDossier.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedDossier.reg_no} • {selectedDossier.degree} ({selectedDossier.branch})
                </p>
              </div>
              <button
                onClick={() => setSelectedDossier(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Academic Summary Grid */}
            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Overall CGPA</span>
                <span className="text-lg font-black text-slate-900">{selectedDossier.overall_cgpa.toFixed(2)}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Active Backlogs</span>
                <span className={`text-lg font-black ${selectedDossier.active_backlogs === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {selectedDossier.active_backlogs}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Credits Earned</span>
                <span className="text-lg font-black text-blue-600">{selectedDossier.total_credits_earned}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">ATS Score</span>
                <span className="text-lg font-black text-indigo-600">{selectedDossier.ats_score}/100</span>
              </div>
            </div>

            {/* Semester-by-Semester Progression */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <BookOpen size={14} className="text-blue-600" />
                <span>Semester-by-Semester SGPA Progression</span>
              </h4>
              
              {selectedDossier.semester_progression.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                  No semester records ingested yet.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Semester</th>
                        <th className="py-2.5 px-3">SGPA</th>
                        <th className="py-2.5 px-3">Cumulative CGPA</th>
                        <th className="py-2.5 px-3">Credits</th>
                        <th className="py-2.5 px-3">Backlogs</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedDossier.semester_progression.map(sem => (
                        <tr key={sem.semester_num} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 font-bold text-slate-900">Semester {sem.semester_num}</td>
                          <td className="py-2 px-3 font-semibold text-blue-700">{sem.sgpa.toFixed(2)}</td>
                          <td className="py-2 px-3 font-mono text-slate-700">{sem.cgpa_at_sem.toFixed(2)}</td>
                          <td className="py-2 px-3 text-slate-600">{sem.credits_earned}</td>
                          <td className="py-2 px-3">
                            <span className={sem.backlogs_in_sem === 0 ? 'text-slate-500' : 'text-rose-600 font-bold'}>
                              {sem.backlogs_in_sem}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              sem.is_cleared ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {sem.is_cleared ? 'Cleared' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Honors & Certifications */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-700 uppercase text-[10px] flex items-center space-x-1">
                  <Award size={13} className="text-amber-500" />
                  <span>Academic Honors:</span>
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedDossier.honors.map((h, i) => (
                    <span key={i} className="bg-amber-100/70 text-amber-900 text-[10px] font-semibold px-2 py-0.5 rounded">
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-700 uppercase text-[10px] flex items-center space-x-1">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Verified Certifications:</span>
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedDossier.certifications.map((c, i) => (
                    <span key={i} className="bg-emerald-100/70 text-emerald-900 text-[10px] font-semibold px-2 py-0.5 rounded">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDossier(null)}
                className="bg-slate-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-slate-800 transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Drive Modal */}
      {isPostOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900">Publish New Campus Recruitment Drive</h3>
            
            {notifyResult && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-2xl font-bold">
                {notifyResult}
              </div>
            )}

            <form onSubmit={handlePostJob} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1.5">
                  Opportunity Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'Full-Time', label: 'Full-Time Job', desc: 'Direct Placement (FTE)' },
                    { type: 'Internship', label: 'Internship', desc: 'Stipend / Summer Intern' },
                    { type: 'Internship + PPO', label: 'Internship + PPO', desc: 'PPO Conversion' }
                  ].map(item => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setJobType(item.type as any)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        jobType === item.type
                          ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500 font-bold'
                          : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs">{item.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-normal">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Associate Cloud Engineer"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">CTC Package (LPA)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={ctcLpa}
                    onChange={e => setCtcLpa(parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Minimum CGPA</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={minCgpa}
                    onChange={e => setMinCgpa(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Allowed Academic Years to Apply:
                </label>
                <div className="flex gap-4 pt-1">
                  {[1, 2, 3, 4].map(yr => (
                    <label key={yr} className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedYears.includes(yr)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedYears([...selectedYears, yr]);
                          } else {
                            setSelectedYears(selectedYears.filter(y => y !== yr));
                          }
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-800">{yr}th Year</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Required Skills (Comma separated)</label>
                <input
                  type="text"
                  required
                  placeholder="Python, SQL, FastAPI, AWS"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={skills}
                  onChange={e => setSkills(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Job Description</label>
                <textarea
                  rows={3}
                  required
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPostOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition"
                >
                  Publish & Submit for Dean Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};