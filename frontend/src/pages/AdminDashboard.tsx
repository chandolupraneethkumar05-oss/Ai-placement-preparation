import React, { useState, useEffect } from 'react';
import type { UserSession } from '../types';
import { fetchAdminAnalytics, fetchNirfSummary, fetchAdminAllStudents, getPlacementCsvDownloadUrl, fetchAdminCompanies, toggleCompanyVerification } from '../api';
import { Shield, FileDown, Award, Users, Search, Briefcase, Download, Table, Building2, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  session: UserSession;
}

export const AdminDashboard: React.FC<Props> = ({ session }) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [nirfReport, setNirfReport] = useState<any>(null);

  useEffect(() => {
    fetchAdminAnalytics().then(setAnalytics).catch(console.error);
    fetchAdminAllStudents().then(setAllStudents).catch(console.error);
    fetchAdminCompanies().then(setCompanies).catch(console.error);
  }, []);

  const handleToggleVerification = async (companyId: number) => {
    try {
      await toggleCompanyVerification(companyId);
      const updatedCompanies = await fetchAdminCompanies();
      setCompanies(updatedCompanies);
      const updatedAnalytics = await fetchAdminAnalytics();
      setAnalytics(updatedAnalytics);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportNirf = async () => {
    const data = await fetchNirfSummary();
    setNirfReport(data);
  };

  const filteredStudents = allStudents.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.reg_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.branch.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            Institutional Placement & Accreditation Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Executive Officer: <span className="font-bold text-white">{session.full_name}</span> (Dean Placements)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={getPlacementCsvDownloadUrl()}
            download="VFSTR_Institutional_Placement_Report_2026.csv"
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-lg flex items-center space-x-2 transition"
          >
            <Download size={16} />
            <span>Download CSV (Excel)</span>
          </a>
          <button
            onClick={handleExportNirf}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg flex items-center space-x-2 transition"
          >
            <FileDown size={18} />
            <span>Export NAAC / NIRF Summary</span>
          </button>
        </div>
      </div>

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
            <div className="text-2xl font-black text-slate-900 mt-1">{analytics.total_students} Students</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Across All Branches</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Placement Conversion</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{analytics.placement_percentage}%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{analytics.placed_students} Placed Candidates</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Active Campus Drives</div>
            <div className="text-2xl font-black text-blue-600 mt-1">{analytics.active_jobs} Drives</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Tier 1 & Core</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Verified Companies</div>
            <div className="text-2xl font-black text-purple-600 mt-1">{analytics.verified_companies} / {analytics.total_companies}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Screened Employers</div>
          </div>
        </div>
      )}

      {/* Active Campus Recruitment Drives Directory (Dean / HOD View) */}
      {analytics && analytics.active_drives && analytics.active_drives.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Briefcase className="text-blue-600" size={18} />
                <span>Active Campus Recruitment Drives ({analytics.active_jobs} Active Drives)</span>
              </h3>
              <p className="text-xs text-slate-500">Live recruitment opportunities open for student applications across departments.</p>
            </div>
            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full border border-blue-200">
              {analytics.active_jobs} Drives Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.active_drives.map((d: any) => (
              <div key={d.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 hover:border-blue-400 transition shadow-sm">
                <div className="flex justify-between items-start gap-2">
                  <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                    {d.company_name}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    d.job_type === 'Internship' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                    d.job_type === 'Internship + PPO' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                    'bg-blue-100 text-blue-800 border-blue-200'
                  }`}>
                    {d.job_type || 'Full-Time'}
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{d.title}</h4>
                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200 text-slate-600">
                  <span className="font-extrabold text-emerald-700">₹{d.ctc_lpa} LPA</span>
                  <span>Min CGPA: <b>{d.min_cgpa}</b></span>
                  <span className="text-blue-700 font-bold">{d.applications_count} Applicants</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Corporate Recruiting Partners Directory (Dean / HOD Verification Management) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <Building2 className="text-purple-600" size={18} />
              <span>Corporate Recruiting Partners & Verification ({analytics?.verified_companies || 0}/{analytics?.total_companies || companies.length} Verified)</span>
            </h3>
            <p className="text-xs text-slate-500">Live accreditation and partner screening management. Directly updates certified partner metrics.</p>
          </div>
          <span className="text-xs font-bold bg-purple-100 text-purple-800 px-3 py-1 rounded-full border border-purple-200">
            {analytics?.verified_companies || 0} / {analytics?.total_companies || companies.length} Certified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {companies.map((c: any) => (
            <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-purple-300 transition shadow-sm">
              <div className="space-y-1">
                <div className="flex justify-between items-start gap-1">
                  <h4 className="font-extrabold text-sm text-slate-900">{c.name}</h4>
                  {c.is_verified ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Certified
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                      <XCircle size={10} /> Pending
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">{c.domain || c.website || 'Corporate Domain'}</div>
                <div className="text-[11px] text-slate-600 pt-1">{c.jobs_count} Campus Drive(s) Posted</div>
              </div>
              <button
                onClick={() => handleToggleVerification(c.id)}
                className={`mt-3 w-full text-xs font-bold py-1.5 px-3 rounded-xl border transition ${
                  c.is_verified
                    ? 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border-slate-200 hover:border-red-200'
                    : 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-sm'
                }`}
              >
                {c.is_verified ? 'Revoke Certification' : 'Verify Partner'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* All Students Performance Directory (Dean/HOD Privilege - Change #2) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <Users className="text-purple-600" size={18} />
              <span>Institutional Student Directory ({allStudents.length} Students)</span>
            </h3>
            <p className="text-xs text-slate-500">Accessible solely to College Administration. Strict student-to-student isolation enforced.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Roll No or Name..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
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
              {filteredStudents.map(s => (
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
                      s.placement_status.includes('TIER') ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.placement_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
