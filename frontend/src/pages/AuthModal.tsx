import React, { useState } from 'react';
import { loginUser, registerUser } from '../api';
import type { UserSession } from '../types';
import { X, GraduationCap, Briefcase, Shield, CheckCircle2, Lock, KeyRound, Building2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  defaultRole?: 'student' | 'recruiter' | 'admin';
  onClose: () => void;
  onLoginSuccess: (session: UserSession) => void;
}

const DISALLOWED_DOMAINS = [
  "gmail.com", "yahoo.com", "ymail.com", "hotmail.com", "outlook.com",
  "live.com", "icloud.com", "rediffmail.com", "zoho.com", "protonmail.com"
];

const OFFICIAL_INVITATION_CODE = "VFSTR-RECRUIT-2026";

export const AuthModal: React.FC<Props> = ({ isOpen, defaultRole, onClose, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'student' | 'recruiter' | 'admin'>(defaultRole || 'student');
  
  React.useEffect(() => {
    if (defaultRole) {
      setRole(defaultRole);
    }
  }, [defaultRole, isOpen]);
  
  // Form fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // Student specifics
  const [degree, setDegree] = useState('B.Tech');
  const [branch, setBranch] = useState('CSE');
  const [cgpa, setCgpa] = useState(8.0);
  
  // Recruiter specifics (Strict Guardrails)
  const [companyName, setCompanyName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [invitationCode, setInvitationCode] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. STUDENT VALIDATION: Exactly 10 characters
      if (role === 'student') {
        const cleanReg = identifier.trim().toUpperCase();
        if (cleanReg.length !== 10) {
          setError(`VFSTR Registration Number must be exactly 10 characters (currently ${cleanReg.length} characters). Example: 211FA05001.`);
          setLoading(false);
          return;
        }
      }

      // 2. RECRUITER VERIFICATION GUARDRAILS
      if (role === 'recruiter') {
        const emailLower = identifier.trim().toLowerCase();
        const emailDomain = emailLower.split('@')[1] || '';

        // Disallow free webmail domains
        if (DISALLOWED_DOMAINS.includes(emailDomain)) {
          setError("Personal email providers (@gmail.com, @yahoo.com, etc.) are strictly prohibited. Recruiters must authenticate using their official corporate company email.");
          setLoading(false);
          return;
        }

        if (!isLogin) {
          if (employeeId.trim().length < 4) {
            setError("Official Corporate Employee ID / Staff ID is mandatory (minimum 4 characters, e.g. AMZ-HR-7891).");
            setLoading(false);
            return;
          }

          if (invitationCode.trim().toUpperCase() !== OFFICIAL_INVITATION_CODE) {
            setError(`Invalid VFSTR Placement Invitation Code. Official campus recruiters must enter the authorized code issued by VFSTR Placement Cell (Demo Code: ${OFFICIAL_INVITATION_CODE}).`);
            setLoading(false);
            return;
          }
        }
      }

      if (isLogin) {
        const res = await loginUser(role, identifier.trim(), password);
        localStorage.setItem("autoplace_token", res.access_token);
        onLoginSuccess({
          token: res.access_token,
          role: res.role,
          full_name: res.full_name,
          user_id: res.user_id,
          profile_id: res.profile_id,
          reg_no: res.reg_no,
          email: res.email,
          year_info: res.year_info
        });
      } else {
        const payload: any = {
          role,
          full_name: fullName.trim(),
          password
        };
        if (role === 'student') {
          payload.reg_no = identifier.trim().toUpperCase();
          payload.degree = degree;
          payload.branch = branch;
          payload.cgpa = parseFloat(String(cgpa));
        } else if (role === 'recruiter') {
          payload.email = identifier.trim().toLowerCase();
          payload.company_name = companyName.trim();
          payload.employee_id = employeeId.trim();
          payload.invitation_code = invitationCode.trim().toUpperCase();
        } else {
          payload.email = identifier.trim().toLowerCase();
        }

        const res = await registerUser(payload);
        localStorage.setItem("autoplace_token", res.access_token);
        onLoginSuccess({
          token: res.access_token,
          role: res.role,
          full_name: res.full_name,
          user_id: res.user_id,
          profile_id: res.profile_id,
          reg_no: res.reg_no,
          email: res.email,
          year_info: res.year_info
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h3 className="text-xl font-black tracking-tight">{isLogin ? 'Sign In to AutoPlace AI' : 'Create Verified Account'}</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">VFSTR Campus Recruitment & Placement Portal</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
            <X size={20} />
          </button>
        </div>

        {/* 3-Role Toggle */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => { setRole('student'); setError(''); }}
            className={`py-2 px-2 rounded-xl font-bold text-xs flex flex-col items-center justify-center space-y-1 transition ${
              role === 'student' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GraduationCap size={16} />
            <span>Student</span>
          </button>

          <button
            type="button"
            onClick={() => { setRole('recruiter'); setError(''); }}
            className={`py-2 px-2 rounded-xl font-bold text-xs flex flex-col items-center justify-center space-y-1 transition ${
              role === 'recruiter' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Briefcase size={16} />
            <span>Recruiter</span>
          </button>

          <button
            type="button"
            onClick={() => { setRole('admin'); setError(''); }}
            className={`py-2 px-2 rounded-xl font-bold text-xs flex flex-col items-center justify-center space-y-1 transition ${
              role === 'admin' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Shield size={16} />
            <span>Dean / HOD</span>
          </button>
        </div>

        {/* Recruiter Security Notice */}
        {role === 'recruiter' && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-start space-x-2 text-[11px] text-amber-900 font-medium">
            <Lock size={14} className="text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Strict Recruiter Guardrails Active: </span>
              Corporate enterprise email and VFSTR Placement invitation required. Free webmail (@gmail, @yahoo) is strictly prohibited.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl font-semibold flex items-start space-x-2">
              <span className="text-red-500 font-bold">•</span>
              <span>{error}</span>
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Full Name</label>
              <input
                type="text"
                required
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder={role === 'student' ? 'e.g. Sai Praneeth' : 'e.g. Vikram Seth'}
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>
          )}

          {/* Identifier Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-bold text-slate-700 uppercase">
                {role === 'student' ? 'VFSTR Registration Number' : 'Official Corporate Work Email'}
              </label>
              {role === 'student' && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  identifier.length === 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {identifier.length}/10 chars
                </span>
              )}
            </div>
            <input
              type={role === 'student' ? 'text' : 'email'}
              required
              maxLength={role === 'student' ? 10 : undefined}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              placeholder={role === 'student' ? 'e.g. 211FA05001' : 'recruiter@amazon.com'}
              value={identifier}
              onChange={e => setIdentifier(role === 'student' ? e.target.value.toUpperCase() : e.target.value)}
            />
            {role === 'student' && (
              <p className="text-[10px] text-slate-400 mt-1">
                Must be exactly 10 characters (e.g. 211FA05001). Year of study is calculated autonomously.
              </p>
            )}
          </div>

          {!isLogin && role === 'student' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Degree</label>
                  <select
                    className="w-full border border-slate-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={degree}
                    onChange={e => setDegree(e.target.value)}
                  >
                    <option value="B.Tech">B.Tech (4 Years)</option>
                    <option value="M.Tech">M.Tech (2 Years)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Branch</label>
                  <select
                    className="w-full border border-slate-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                  >
                    <option value="CSE">CSE</option>
                    <option value="AI_DS">AI & DS</option>
                    <option value="ECE">ECE</option>
                    <option value="IT">IT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Current CGPA</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  required
                  className="w-full border border-slate-300 rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={cgpa}
                  onChange={e => setCgpa(parseFloat(e.target.value))}
                />
              </div>
            </>
          )}

          {!isLogin && role === 'recruiter' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Company / Organization Name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm pl-9 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Amazon, TCS, Microsoft"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                  />
                  <Building2 size={16} className="absolute left-3 top-3 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Corporate Employee ID / Recruiter ID</label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="e.g. AMZ-HR-7891 or TCS-TA-4021"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-1">Proves official corporate affiliation with recruiting company.</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-slate-700 uppercase">VFSTR Placement Invitation Code</label>
                  <button
                    type="button"
                    onClick={() => setInvitationCode('VFSTR-RECRUIT-2026')}
                    className="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold px-2 py-0.5 rounded-lg border border-blue-200"
                  >
                    Use Demo Code
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm pl-9 font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="VFSTR-RECRUIT-2026"
                    value={invitationCode}
                    onChange={e => setInvitationCode(e.target.value.toUpperCase())}
                  />
                  <KeyRound size={16} className="absolute left-3 top-3 text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Provided by VFSTR T&P Cell for approved recruiting companies.</p>
              </div>
            </>
          )}

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Verifying Credentials...</span>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>{isLogin ? 'Sign In Securely' : 'Register & Verify'}</span>
              </>
            )}
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already registered? Sign in'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
