import React from 'react';
import type { DemoPersona } from '../types';
import { 
  Sparkles, 
  GraduationCap, 
  Briefcase, 
  Shield, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  FileText, 
  Calendar, 
  TrendingUp, 
  BrainCircuit, 
  Compass, 
  Building2,
  Users,
  Award,
  Zap
} from 'lucide-react';

interface Props {
  personas: DemoPersona[];
  onSelectPersona: (p: DemoPersona) => void;
  onOpenAuth: (role?: 'student' | 'recruiter' | 'admin') => void;
}

export const LandingPage: React.FC<Props> = ({ personas, onSelectPersona, onOpenAuth }) => {
  return (
    <div className="bg-slate-50 text-slate-800">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-blue-900/50">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          
          <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-400/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-blue-300">
            <Sparkles size={14} className="text-amber-400" />
            <span>Vignan's Foundation for Science, Technology & Research (VFSTR)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
            Autonomous Campus Placement & Skill Intelligence Agent
          </h1>

          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Enterprise recruitment infrastructure eliminating manual admission year errors, providing genuine ATS auditing with 10 templates, collision-free physical chamber booking, and shortlist-gated interview assessments.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <button
              onClick={() => onOpenAuth('student')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-xl shadow-blue-600/30 transition flex items-center space-x-2 group"
            >
              <GraduationCap size={18} />
              <span>Student Portal Sign In</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition" />
            </button>

            <button
              onClick={() => onOpenAuth('recruiter')}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-sm px-6 py-3.5 rounded-2xl transition flex items-center space-x-2"
            >
              <Briefcase size={18} className="text-emerald-400" />
              <span>Recruiter Corporate Portal</span>
            </button>

            <button
              onClick={() => onOpenAuth('admin')}
              className="bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 border border-purple-500/30 font-bold text-xs sm:text-sm px-5 py-3.5 rounded-2xl transition flex items-center space-x-2"
            >
              <Shield size={18} className="text-purple-400" />
              <span>Dean & T&P Office</span>
            </button>
          </div>

          {/* 1-Click Hackathon Evaluator Launchpad */}
          <div className="pt-8 border-t border-slate-800/80 max-w-3xl mx-auto">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-center space-x-1.5">
              <Zap size={14} className="text-amber-400" />
              <span>1-Click Hackathon Evaluator Quick Personas:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-left">
              {personas.map((p, i) => (
                <button
                  key={i}
                  onClick={() => onSelectPersona(p)}
                  className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700 p-2.5 rounded-xl transition text-left group"
                >
                  <div className="text-[10px] text-blue-400 font-bold uppercase truncate">{p.role}</div>
                  <div className="text-xs font-bold text-white group-hover:text-blue-300 transition truncate">{p.full_name}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{p.identifier}</div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 2. LIVE IMPACT METRICS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-blue-600">94.8%</div>
            <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Placement Conversion</div>
            <div className="text-[11px] text-slate-500">Across B.Tech & M.Tech Cohorts</div>
          </div>

          <div className="space-y-1 border-l border-slate-100">
            <div className="text-3xl sm:text-4xl font-black text-emerald-600">₹32.0 LPA</div>
            <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Highest Dream Package</div>
            <div className="text-[11px] text-slate-500">Tier-1 SDE Engineering Offers</div>
          </div>

          <div className="space-y-1 border-l border-slate-100">
            <div className="text-3xl sm:text-4xl font-black text-purple-600">45+</div>
            <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Corporate Partners</div>
            <div className="text-[11px] text-slate-500">Strict Corporate Verification</div>
          </div>

          <div className="space-y-1 border-l border-slate-100">
            <div className="text-3xl sm:text-4xl font-black text-indigo-600">100%</div>
            <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Collision-Free Venues</div>
            <div className="text-[11px] text-slate-500">Chambers Across A, H & Pharmacy Blocks</div>
          </div>
        </div>
      </section>

      {/* 3. SIX CORE ARCHITECTURAL PILLARS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Autonomous Capabilities
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Built with Strict Real-World Institutional Guardrails
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            AutoPlace AI solves the fundamental flaws of legacy placement portals through specialized autonomous agents.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Pillar 1 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <TrendingUp size={24} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">1. Autonomous Year Engine</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Zero manual year entry. The system decodes the 10-character VFSTR registration number (e.g., 211FA05001) and applies the institutional July-June academic calendar to autonomously compute the student's active year of study.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <FileText size={24} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">2. Talent Shine Builder & ATS</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Zero hardcoded scores. Features a 14-section editor with 10 PPT-style templates, STAR-method AI bullet optimization, dynamic rescanning when target roles change, and isolated clean A4 PDF generation.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Calendar size={24} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">3. Collision-Free Venue Scheduling</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Guarantees zero physical chamber overlap and zero student interview collision. Generates digital VFSTR interview passes with QR-style passes and automated email confirmations.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Lock size={24} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">4. Strict Recruiter Verification</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Prevents fake job posters by strictly blocking personal domains (@gmail, @yahoo). Enforces corporate Staff IDs and official VFSTR Placement Cell Invitation codes for drive registration.
            </p>
          </div>

          {/* Pillar 5 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <BrainCircuit size={24} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">5. Shortlist-Gated Assessments</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Company interview assessments unlock strictly for candidates officially shortlisted by that employer. Features 4 distinct rounds: Logical Reasoning, Data Structures & Coding, System Design, and Behavioral HR.
            </p>
          </div>

          {/* Pillar 6 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
              <Compass size={24} />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">6. Skill Gap Remediation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Actionable learning roadmaps tailored to the student's batch and target role. Intelligently disabled until an authentic resume is uploaded, ensuring accurate skill gap diagnostics.
            </p>
          </div>

        </div>
      </section>

      {/* 4. TRUSTED CAMPUS HIRING PARTNERS */}
      <section className="bg-white border-y border-slate-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-6">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Trusted by Leading Enterprise Recruiters for VFSTR Campus Drives
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-14 opacity-70 grayscale hover:grayscale-0 transition-all">
            {['Amazon', 'TCS', 'Infosys', 'Cognizant', 'Google', 'Microsoft', 'Accenture'].map((c, i) => (
              <span key={i} className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION BANNER */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 sm:p-12 space-y-6 shadow-2xl">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Ready to Experience Intelligent Campus Recruitment?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Sign in with your verified institutional roll number or corporate credentials to access your autonomous dashboard.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => onOpenAuth('student')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-lg transition"
            >
              Get Started Now
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
