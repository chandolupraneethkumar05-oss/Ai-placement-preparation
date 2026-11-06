import React, { useState, useEffect } from 'react';
import type { UserSession, PendingDriveItem, MOURegistryItem } from '../types';
import { 
  fetchAdminAnalytics, 
  fetchNirfSummary, 
  fetchAdminAllStudents, 
  fetchAdminCompanies, 
  toggleCompanyVerification,
  fetchPendingDrives,
  approveDrive,
  renewMOUAndApprove,
  rejectDrive,
  fetchMOURegistry,
  registerMOU,
  downloadPlacementsCsv,
  downloadSampleRosterCsv,
  importStudentsCsv,
  generateDemoCohort,
  fetchStudentsPaginated,
  draftDriveAnnouncementEmail,
  dispatchDriveAnnouncementEmail
} from '../api';
import { 
  Shield, 
  FileDown, 
  Award, 
  Users, 
  Search, 
  Briefcase, 
  Download, 
  Building2, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  PlusCircle,
  ShieldCheck,
  FileText,
  X,
  UploadCloud,
  Mail,
  Send,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Sparkles,
  Zap
} from 'lucide-react';

interface Props {
  session: UserSession;
}

export const AdminDashboard: React.FC<Props> = ({ session }) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [pendingDrives, setPendingDrives] = useState<PendingDriveItem[]>([]);
  const [mouRegistry, setMOURegistry] = useState<MOURegistryItem[]>([]);
  const [nirfReport, setNirfReport] = useState<any>(null);

  // Paginated Student Engine State (Scales to 10,000+ Students)
  const [paginatedStudents, setPaginatedStudents] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);

  // Ingestion & Generation State
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isGeneratingCohort, setIsGeneratingCohort] = useState<boolean>(false);

  // Email Campaign Modal State
  const [emailModalData, setEmailModalData] = useState<any | null>(null);
  const [customEmailNotes, setCustomEmailNotes] = useState<string>('Mandatory attendance at Pre-Placement Talk. Formal dress code strictly enforced.');
  const [isDraftingEmail, setIsDraftingEmail] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  // Expired MOU Renewal Dialog
  const [renewModalDrive, setRenewModalDrive] = useState<PendingDriveItem | null>(null);
  const [renewYears, setRenewYears] = useState<number>(2);
  const [renewRemarks, setRenewRemarks] = useState<string>('MOU renewed for 2 years. Drive approved for campus recruitment.');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Register New MOU Dialog
  const [isRegisterMOUOpen, setIsRegisterMOUOpen] = useState(false);
  const [newMouCompanyId, setNewMouCompanyId] = useState<number>(1);
  const [newMouRef, setNewMouRef] = useState<string>('VFSTR/MOU/2026/');
  const [newMouSignedDate, setNewMouSignedDate] = useState<string>('2026-01-10');
  const [newMouExpiryDate, setNewMouExpiryDate] = useState<string>('2028-01-10');
  const [newMouCategory, setNewMouCategory] = useState<string>('Tier 1 IT & Cloud');
  const [newMouActivities, setNewMouActivities] = useState<string>('Campus Placements, Hackathons, Faculty Enablement');

  const loadStudents = async (page = currentPage, search = searchTerm, branch = selectedBranch, status = selectedStatus) => {
    setLoadingStudents(true);
    try {
      const data = await fetchStudentsPaginated({
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        branch: branch !== 'ALL' ? branch : undefined,
        placement_status: status !== 'ALL' ? status : undefined
      });
      setPaginatedStudents(data.students || []);
      setTotalStudents(data.total || 0);
      setTotalPages(data.total_pages || 1);
      setCurrentPage(data.page || 1);
    } catch (e) {
      console.error("Failed to load paginated students:", e);
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadAll = async () => {
    try {
      const a = await fetchAdminAnalytics().catch(() => null);
      setAnalytics(a);

      const c = await fetchAdminCompanies().catch(() => []);
      setCompanies(c);
      if (c.length > 0 && !newMouCompanyId) {
        setNewMouCompanyId(c[0].id);
      }

      const p = await fetchPendingDrives().catch(() => ({ pending_drives: [] }));
      setPendingDrives(p.pending_drives || []);

      const m = await fetchMOURegistry().catch(() => ({ registry: [] }));
      setMOURegistry(m.registry || []);

      loadStudents(1, searchTerm, selectedBranch, selectedStatus);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadStudents(1, searchTerm, selectedBranch, selectedStatus);
    }, 250);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, selectedBranch, selectedStatus]);

  const handleToggleVerification = async (companyId: number) => {
    try {
      await toggleCompanyVerification(companyId);
      loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportNirf = async () => {
    const data = await fetchNirfSummary();
    setNirfReport(data);
  };

  const handleApproveDrive = async (jobId: number) => {
    setIsProcessing(true);
    try {
      const res = await approveDrive(jobId);
      setActionSuccess(res.message);
      loadAll();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      alert(e.message || "Approval failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRenewAndApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewModalDrive) return;
    setIsProcessing(true);
    try {
      const res = await renewMOUAndApprove(renewModalDrive.id, renewYears, renewRemarks);
      setActionSuccess(res.message);
      setRenewModalDrive(null);
      loadAll();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (e: any) {
      alert(e.message || "Renewal failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectDrive = async (jobId: number) => {
    const reason = window.prompt("Enter rejection / discontinuation reason:", "MOU expired and company declined partnership renewal terms.");
    if (!reason) return;
    setIsProcessing(true);
    try {
      const res = await rejectDrive(jobId, reason);
      setActionSuccess(res.message);
      loadAll();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      alert(e.message || "Rejection failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegisterMOUSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await registerMOU({
        company_id: newMouCompanyId,
        mou_reference_code: newMouRef,
        signed_date: newMouSignedDate,
        expiry_date: newMouExpiryDate,
        category: newMouCategory,
        functional_activities: newMouActivities
      });
      setActionSuccess(res.message);
      setIsRegisterMOUOpen(false);
      loadAll();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (e: any) {
      alert(e.message || "Failed to register MOU");
    } finally {
      setIsProcessing(false);
    }
  };

  // Bulk Ingestion Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const res = await importStudentsCsv(file);
      setActionSuccess(`Ingested ${res.total_imported} new students and updated ${res.duplicates_updated} records.`);
      loadAll();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to import student CSV roster");
    } finally {
      setIsImporting(false);
    }
  };

  const handleGenerateCohort = async () => {
    setIsGeneratingCohort(true);
    try {
      const res = await generateDemoCohort(100, 2022);
      setActionSuccess(res.message);
      loadAll();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to generate demo cohort");
    } finally {
      setIsGeneratingCohort(false);
    }
  };

  // Email Campaign Drafting & Sending
  const handleOpenEmailDraft = async (drive: PendingDriveItem) => {
    setIsDraftingEmail(true);
    try {
      const draft = await draftDriveAnnouncementEmail(drive.id, customEmailNotes);
      setEmailModalData(draft);
    } catch (err: any) {
      alert("Failed to draft email: " + (err.message || "Unknown error"));
    } finally {
      setIsDraftingEmail(false);
    }
  };

  const handleSendEmailBroadcast = async () => {
    if (!emailModalData) return;
    setIsSendingEmail(true);
    try {
      const res = await dispatchDriveAnnouncementEmail(
        emailModalData.job_id,
        emailModalData.email_subject,
        emailModalData.email_body_html
      );
      setActionSuccess(res.message);
      setEmailModalData(null);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to send email broadcast");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      await downloadPlacementsCsv("VFSTR_Institutional_Placement_Report_2026.csv");
    } catch (e) {
      alert("Failed to download CSV");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center space-x-1">
              <Shield size={13} />
              <span>VFSTR Central T&P Administration</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
            Institutional Placement, MOU Governance & Data Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Executive Officer: <span className="font-bold text-white">{session.full_name}</span> (Dean Placements • NAAC Criterion 3.5 & 5.2 Officer)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadCsv}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-lg flex items-center space-x-2 transition"
          >
            <Download size={16} />
            <span>Download CSV (Excel)</span>
          </button>
          <button
            onClick={handleExportNirf}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg flex items-center space-x-2 transition"
          >
            <FileDown size={18} />
            <span>Export NAAC / NIRF Summary</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-2xl font-bold flex items-center space-x-2 shadow-sm animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* NIRF Report Modal / Preview */}
      {nirfReport && (
        <div className="bg-purple-50 border-2 border-purple-300 rounded-3xl p-6 text-purple-950 space-y-3 shadow-md">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm sm:text-base flex items-center space-x-2">
              <Award className="text-purple-600" size={20} />
              <span>Official Institutional Placement Record for NAAC Criterion 5.2</span>
            </h3>
            <span className="text-xs font-bold bg-purple-200 text-purple-800 px-3 py-1 rounded-full">
              {nirfReport.naac_criterion_5_2_status}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
            <div>
              <span className="text-slate-500">Institution:</span>
              <div className="font-bold">{nirfReport.institution}</div>
            </div>
            <div>
              <span className="text-slate-500">Graduating Cohort:</span>
              <div className="font-bold">{nirfReport.graduating_cohort}</div>
            </div>
            <div>
              <span className="text-slate-500">Placed Students:</span>
              <div className="font-bold text-emerald-700">{nirfReport.number_of_students_placed}</div>
            </div>
            <div>
              <span className="text-slate-500">Highest Salary:</span>
              <div className="font-bold text-purple-700">{nirfReport.highest_salary_lpa} LPA</div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Total Registered Students</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalStudents || analytics.total_students} Students</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Across All Engineering Branches</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Placement Conversion</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{analytics.placement_percentage}%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{analytics.placed_students} Placed Candidates</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Pending Dean Approval</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{pendingDrives.length} Drives</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Awaiting MOU Gate Check</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Active Partnership MOUs</div>
            <div className="text-2xl font-black text-purple-600 mt-1">{mouRegistry.filter(m => m.mou_status === 'ACTIVE').length} Active</div>
            <div className="text-[10px] text-slate-400 mt-0.5">NAAC Criterion 3.5 Registered</div>
          </div>
        </div>
      )}

      {/* SECTION 1: DRIVES AWAITING DEAN APPROVAL & MOU GATE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <Clock className="text-amber-600" size={18} />
              <span>Campus Recruitment Drives Awaiting Dean Approval & MOU Gate ({pendingDrives.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Institutional governance checkpoint. Recruiter drives are held here until verified against university MOU terms.
            </p>
          </div>
          <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
            {pendingDrives.length} Pending Approval
          </span>
        </div>

        {pendingDrives.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <ShieldCheck size={28} className="mx-auto mb-2 text-emerald-500 opacity-60" />
            <p className="font-bold text-slate-700">All submitted recruitment drives have been processed.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">When corporate recruiters submit new openings, they will appear here for MOU validation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDrives.map(drive => (
              <div
                key={drive.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase">
                      {drive.company_name}
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      {drive.job_type}
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      ₹{drive.ctc_lpa} LPA
                    </span>
                    
                    {/* Company MOU Status Badge */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      drive.mou_status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {drive.mou_status === 'ACTIVE' ? '✓ MOU Active' : '⚠️ MOU Expired'}
                    </span>
                  </div>

                  <h4 className="font-black text-slate-900 text-sm">{drive.title}</h4>

                  <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Min CGPA: <strong>{drive.min_cgpa}</strong></span>
                    <span>Max Backlogs: <strong>{drive.max_backlogs}</strong></span>
                    <span>Branches: <strong>{drive.eligible_branches.join(', ')}</strong></span>
                    <span>Years: <strong>{drive.eligible_years.map(y => `${y}th`).join(', ')}</strong></span>
                  </div>

                  {drive.mou_status !== 'ACTIVE' && (
                    <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mt-1 flex items-start space-x-1.5 font-medium">
                      <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>MOU Notice:</strong> Corporate partnership agreement expired on {drive.mou_valid_till ? new Date(drive.mou_valid_till).toLocaleDateString() : 'N/A'}. 
                        As Dean, you may renew the MOU and approve the drive, or reject the posting.
                      </span>
                    </div>
                  )}
                </div>

                {/* Dean Decision Actions */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    onClick={() => handleOpenEmailDraft(drive)}
                    disabled={isDraftingEmail}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-sm"
                    title="Draft an official announcement email for eligible candidates"
                  >
                    <Mail size={14} className="text-indigo-600" />
                    <span>{isDraftingEmail ? "Drafting..." : "Draft Email"}</span>
                  </button>

                  {drive.mou_status === 'ACTIVE' ? (
                    <button
                      onClick={() => handleApproveDrive(drive.id)}
                      disabled={isProcessing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-sm"
                    >
                      <CheckCircle2 size={14} />
                      <span>Approve & Release to Students</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setRenewModalDrive(drive)}
                        disabled={isProcessing}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-sm"
                      >
                        <RefreshCw size={14} />
                        <span>Renew MOU & Approve</span>
                      </button>

                      <button
                        onClick={() => handleRejectDrive(drive.id)}
                        disabled={isProcessing}
                        className="bg-slate-200 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 font-bold text-xs px-3.5 py-2.5 rounded-xl transition"
                      >
                        <span>Reject / Discontinue</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: INSTITUTIONAL MOU REGISTRY (NAAC CRITERION 3.5) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <Building2 className="text-indigo-600" size={18} />
              <span>Institutional Industry Partnership Registry (NAAC Criterion 3.5)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Audit-ready ledger of Memorandums of Understanding (MOUs) governing campus recruitment, internships, and faculty development.
            </p>
          </div>

          <button
            onClick={() => setIsRegisterMOUOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-sm"
          >
            <PlusCircle size={15} />
            <span>Register New Institutional MOU</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Partner Company</th>
                <th className="py-3 px-4">MOU Reference Code</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Validity Horizon</th>
                <th className="py-3 px-4">MOU Status</th>
                <th className="py-3 px-4 text-right">Hired / Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mouRegistry.map((mou) => (
                <tr key={mou.company_id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{mou.company_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{mou.domain || mou.website}</div>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-700 text-xs">
                    {mou.mou_reference_no || 'NAAC-3.5-REG'}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 font-medium">
                    {mou.mou_category || 'Tier 1 Industry'}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    <div>
                      Signed: <strong>{mou.mou_valid_from ? new Date(mou.mou_valid_from).toLocaleDateString() : 'Active'}</strong>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Till: {mou.mou_valid_till ? new Date(mou.mou_valid_till).toLocaleDateString() : 'Indefinite'}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                      mou.mou_status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {mou.mou_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="text-xs font-bold text-slate-800">
                      {mou.total_hired_students} Hired
                    </div>
                    <div className="text-[10px] text-blue-600 font-medium">
                      {mou.active_drives_count} Active Drives
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: CAMPUS-SCALE STUDENT DATA ENGINE (SCALES TO 10,000+ STUDENTS) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
        
        {/* Ingestion & Tools Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-purple-100 text-purple-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-purple-200">
                Campus-Scale Data Engine
              </span>
              <span className="text-xs text-slate-400 font-medium">10,000+ Records Supported</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center space-x-2">
              <Users className="text-purple-600" size={20} />
              <span>University Student Directory ({totalStudents} Registered Students)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              High-throughput pagination and bulk ingestion console with automated academic dossier generation.
            </p>
          </div>

          {/* Bulk Ingestion Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadSampleRosterCsv()}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl border border-slate-300 transition flex items-center space-x-1.5 shadow-sm"
              title="Download clean CSV template for student roster upload"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span>Template CSV</span>
            </button>

            <label className="bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 font-bold text-xs px-3 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-sm cursor-pointer">
              <UploadCloud size={14} className="text-purple-600" />
              <span>{isImporting ? "Importing Roster..." : "Upload Student Roster"}</span>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload} 
                disabled={isImporting} 
                className="hidden" 
              />
            </label>

            <button
              onClick={handleGenerateCohort}
              disabled={isGeneratingCohort}
              className="bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-purple-600/20"
              title="Instantly generate 100 students across departments to demo university scale"
            >
              <Zap size={14} className="text-yellow-300" />
              <span>{isGeneratingCohort ? "Generating..." : "⚡ Generate 100-Student Cohort"}</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Roll No, Name, or Target Role..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="ALL">All Engineering Departments</option>
              <option value="CSE">Computer Science & Engineering (CSE)</option>
              <option value="IT">Information Technology (IT)</option>
              <option value="AI_DS">Artificial Intelligence & Data Science (AI_DS)</option>
              <option value="ECE">Electronics & Communication (ECE)</option>
              <option value="MECH">Mechanical Engineering (MECH)</option>
              <option value="CIVIL">Civil Engineering (CIVIL)</option>
            </select>
          </div>

          {/* Placement Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="ALL">All Placement Standings</option>
              <option value="TIER_1_PLACED">Tier-1 Placed Candidates</option>
              <option value="ELIGIBLE">Eligible (0 Backlogs)</option>
              <option value="REMEDIATION_REQUIRED">Academic Remediation (Active Backlogs)</option>
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Degree & Branch</th>
                <th className="py-3 px-4">CGPA & Backlogs</th>
                <th className="py-3 px-4">ATS Score</th>
                <th className="py-3 px-4">Target Role</th>
                <th className="py-3 px-4">Placement Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingStudents ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-xs text-slate-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-600 border-t-transparent mx-auto mb-2"></div>
                    Querying student records...
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-xs text-slate-400">
                    No matching student records found.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{s.reg_no}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{s.degree}</div>
                      <div className="text-xs text-slate-500">{s.branch}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">{s.cgpa.toFixed(2)}</span>
                      <span className={`text-[10px] ml-1.5 font-bold ${s.active_backlogs > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        ({s.active_backlogs} BL)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-200">
                        {s.ats_score}/100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                      {s.target_role}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        s.placement_status.includes('TIER') ? 'bg-emerald-100 text-emerald-800' : 
                        s.placement_status === 'ELIGIBLE' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {s.placement_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Controller */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{totalStudents === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to <strong className="text-slate-900">{Math.min(currentPage * pageSize, totalStudents)}</strong> of <strong className="text-slate-900">{totalStudents}</strong> students
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (currentPage > 1) {
                  loadStudents(currentPage - 1, searchTerm, selectedBranch, selectedStatus);
                }
              }}
              disabled={currentPage <= 1 || loadingStudents}
              className="p-2 border border-slate-300 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition flex items-center space-x-1"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1 font-bold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => {
                if (currentPage < totalPages) {
                  loadStudents(currentPage + 1, searchTerm, selectedBranch, selectedStatus);
                }
              }}
              disabled={currentPage >= totalPages || loadingStudents}
              className="p-2 border border-slate-300 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

      </div>

      {/* MODAL: Expired MOU Renewal & Drive Approval */}
      {renewModalDrive && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                  Institutional MOU Renewal Gate
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Renew MOU for {renewModalDrive.company_name}
                </h3>
              </div>
              <button
                onClick={() => setRenewModalDrive(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              The existing MOU with <strong>{renewModalDrive.company_name}</strong> has expired. 
              Renewing the partnership grants approval for drive <strong>"{renewModalDrive.title}"</strong> and releases it immediately to eligible VFSTR students.
            </p>

            <form onSubmit={handleRenewAndApprove} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Extension Duration (Years)
                </label>
                <select
                  value={renewYears}
                  onChange={e => setRenewYears(parseInt(e.target.value))}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value={1}>1 Year (Standard Extension)</option>
                  <option value={2}>2 Years (Institutional Strategic Partner)</option>
                  <option value={3}>3 Years (Long-Term Academic-Industry Alliance)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Dean Endorsement & Remarks
                </label>
                <textarea
                  rows={3}
                  required
                  value={renewRemarks}
                  onChange={e => setRenewRemarks(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Official renewal order remarks recorded for NAAC audit..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenewModalDrive(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center space-x-1.5"
                >
                  <CheckCircle2 size={15} />
                  <span>{isProcessing ? 'Executing Renewal...' : 'Renew MOU & Approve Drive'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Register New MOU */}
      {isRegisterMOUOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                  NAAC Criterion 3.5 Governance
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Register New Institutional MOU
                </h3>
              </div>
              <button
                onClick={() => setIsRegisterMOUOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRegisterMOUSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Corporate Partner</label>
                <select
                  value={newMouCompanyId}
                  onChange={e => setNewMouCompanyId(parseInt(e.target.value))}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">MOU Reference Code</label>
                <input
                  type="text"
                  required
                  value={newMouRef}
                  onChange={e => setNewMouRef(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. VFSTR/MOU/2026/099"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Signed Date</label>
                  <input
                    type="date"
                    required
                    value={newMouSignedDate}
                    onChange={e => setNewMouSignedDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={newMouExpiryDate}
                    onChange={e => setNewMouExpiryDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Collaboration Category</label>
                <input
                  type="text"
                  value={newMouCategory}
                  onChange={e => setNewMouCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Functional Collaboration Scope</label>
                <textarea
                  rows={2}
                  value={newMouActivities}
                  onChange={e => setNewMouActivities(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterMOUOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition"
                >
                  Register MOU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Draft Drive Announcement Email & Broadcast */}
      {emailModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    AI Announcement Campaign
                  </span>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {emailModalData.eligible_students_count} Eligible Recipients
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Draft Drive Announcement: {emailModalData.company_name}
                </h3>
              </div>
              <button
                onClick={() => setEmailModalData(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Subject Line</label>
                <input
                  type="text"
                  value={emailModalData.email_subject}
                  onChange={e => setEmailModalData({ ...emailModalData, email_subject: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">HTML Body Preview</label>
                <div 
                  className="border border-slate-200 rounded-2xl p-4 bg-slate-50 max-h-60 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: emailModalData.email_body_html }}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEmailModalData(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSendingEmail}
                  onClick={handleSendEmailBroadcast}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center space-x-1.5"
                >
                  <Send size={14} />
                  <span>{isSendingEmail ? "Dispatching..." : `Broadcast to ${emailModalData.eligible_students_count} Eligible Students`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
