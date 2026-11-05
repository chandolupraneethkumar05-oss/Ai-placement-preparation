import React from 'react';
import type { UserSession, DemoPersona } from '../types';
import { 
  Briefcase, 
  Award, 
  FileText, 
  BrainCircuit, 
  Target, 
  Building2, 
  Users, 
  Calendar, 
  PlusCircle, 
  BarChart3, 
  FileDown, 
  Shield, 
  LogOut, 
  Sparkles,
  CheckCircle2,
  GraduationCap
} from 'lucide-react';

interface SidebarProps {
  session: UserSession | null;
  personas: DemoPersona[];
  onSelectPersona: (p: DemoPersona) => void;
  onLogout: () => void;
  activeNav?: string;
  onNavigate?: (navId: string) => void;
  onOpenTargetRole?: () => void;
  onOpenAssessment?: () => void;
  onOpenPostJob?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  session,
  personas,
  onSelectPersona,
  onLogout,
  activeNav,
  onNavigate,
  onOpenTargetRole,
  onOpenAssessment,
  onOpenPostJob
}) => {
  if (!session) return null;

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 text-slate-300 z-40 flex flex-col justify-between shadow-2xl">
      
      {/* 1. Header & Brand */}
      <div>
        <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center font-black text-white text-base shadow-md shadow-blue-500/30">
            VF
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-black text-white text-base tracking-tight">AutoPlace AI</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">VFSTR Placement Intelligence</p>
          </div>
        </div>

        {/* 2. Navigation Items Based on Active Role */}
        <div className="p-3.5 space-y-1">
          <div className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Core Features
          </div>

          {session.role === 'student' && (
            <>
              <button
                onClick={() => onNavigate && onNavigate('jobs')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                  activeNav === 'jobs' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Briefcase size={16} className={activeNav === 'jobs' ? 'text-white' : 'text-blue-400'} />
                <span>Explore Campus Drives</span>
              </button>

              <button
                onClick={() => onNavigate && onNavigate('applications')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                  activeNav === 'applications' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Award size={16} className={activeNav === 'applications' ? 'text-white' : 'text-emerald-400'} />
                <span>Applications & Passes</span>
              </button>

              <button
                onClick={() => onNavigate && onNavigate('resume')}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                  activeNav === 'resume' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FileText size={16} className={activeNav === 'resume' ? 'text-white' : 'text-indigo-400'} />
                <span>Resume Center & ATS</span>
              </button>

              <div className="pt-2 pb-1 px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Action Shortcuts
              </div>

              {onOpenAssessment && (
                <button
                  onClick={onOpenAssessment}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition text-left"
                >
                  <BrainCircuit size={16} className="text-amber-400" />
                  <span>Practice 4 Rounds (RAG)</span>
                </button>
              )}

              {onOpenTargetRole && (
                <button
                  onClick={onOpenTargetRole}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition text-left"
                >
                  <Target size={16} className="text-cyan-400" />
                  <span>Target Career Track</span>
                </button>
              )}
            </>
          )}

          {session.role === 'recruiter' && (
            <>
              <div className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md shadow-blue-600/30 text-left">
                <Building2 size={16} />
                <span>Recruiter Talent Portal</span>
              </div>

              {onOpenPostJob && (
                <button
                  onClick={onOpenPostJob}
                  className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition text-left mt-2 border border-slate-700"
                >
                  <PlusCircle size={16} className="text-emerald-400" />
                  <span>Post Drive (FTE / Intern)</span>
                </button>
              )}
            </>
          )}

          {session.role === 'admin' && (
            <>
              <div className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-md shadow-purple-600/30 text-left">
                <BarChart3 size={16} />
                <span>Institutional Placement Control</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Bottom: Persona Switcher & User Profile */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
        
        {/* Fast Persona Switcher */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 space-y-1">
          <div className="text-[10px] font-extrabold uppercase text-slate-400 flex items-center space-x-1 px-1">
            <Sparkles size={11} className="text-amber-400" />
            <span>Switch Demo Persona:</span>
          </div>
          <select 
            aria-label="Switch Demo Persona"
            className="w-full bg-slate-800 text-slate-200 text-xs rounded-lg p-1.5 focus:outline-none border border-slate-700 cursor-pointer"
            onChange={(e) => {
              const p = personas.find(item => item.identifier === e.target.value);
              if (p) onSelectPersona(p);
            }}
            value={session?.reg_no || session?.email || ""}
          >
            {personas.map((p, i) => (
              <option key={i} value={p.identifier}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Current User Pill */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
              {session.role === 'student' ? <GraduationCap size={15} /> : session.role === 'recruiter' ? <Building2 size={15} /> : <Shield size={15} />}
            </div>
            <div className="overflow-hidden">
              <div className="font-bold text-xs text-white truncate">{session.full_name}</div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {session.reg_no || session.email}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Log Out"
            className="text-slate-400 hover:text-red-400 p-1.5 hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut size={16} />
          </button>
        </div>

      </div>

    </aside>
  );
};
