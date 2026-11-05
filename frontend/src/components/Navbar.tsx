import React, { useState } from 'react';
import type { UserSession, DemoPersona } from '../types';
import { 
  GraduationCap, 
  Briefcase, 
  Shield, 
  Bell, 
  LogOut, 
  Sparkles, 
  Menu, 
  X,
  Compass
} from 'lucide-react';

interface Props {
  session: UserSession | null;
  personas: DemoPersona[];
  onSelectPersona: (p: DemoPersona) => void;
  onLogout: () => void;
  onOpenAuth: () => void;
  unreadCount: number;
  onOpenNotifications: () => void;
}

export const Navbar: React.FC<Props> = ({
  session,
  personas,
  onSelectPersona,
  onLogout,
  onOpenAuth,
  unreadCount,
  onOpenNotifications
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Unstop Inspired Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-md shadow-blue-500/20">
            VF
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-slate-900">AutoPlace AI</span>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                VFSTR Unstop
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Campus Placement & Opportunity Intelligence</p>
          </div>
        </div>

        {/* Demo Persona Switcher (Desktop) */}
        <div className="hidden lg:flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <span className="text-xs text-blue-700 font-bold uppercase tracking-wider flex items-center space-x-1">
            <Sparkles size={13} className="text-amber-500" />
            <span>Demo Switcher:</span>
          </span>
          <select 
            aria-label="Demo Persona"
            className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer pr-2"
            onChange={(e) => {
              const p = personas.find(item => item.identifier === e.target.value);
              if (p) onSelectPersona(p);
            }}
            value={session?.reg_no || session?.email || ""}
          >
            <option value="" disabled>Switch Active Demo Profile...</option>
            {personas.map((p, i) => (
              <option key={i} value={p.identifier}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Right Menu */}
        <div className="hidden sm:flex items-center space-x-3">
          {session ? (
            <>
              {/* Notification Bell */}
              <button 
                onClick={onOpenNotifications}
                className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition"
                title="Notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </button>

              {/* Role Indicator Card */}
              <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-sm">
                {session.role === 'student' && <GraduationCap size={16} className="text-emerald-600" />}
                {session.role === 'recruiter' && <Briefcase size={16} className="text-blue-600" />}
                {session.role === 'admin' && <Shield size={16} className="text-purple-600" />}
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900 leading-tight">{session.full_name}</div>
                  <div className="text-[10px] text-slate-500 capitalize leading-none">
                    {session.role} {session.reg_no ? `• ${session.reg_no}` : ''}
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button 
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-md shadow-blue-600/20"
            >
              Sign In / Register
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="sm:hidden flex items-center space-x-2">
          {session && (
            <button onClick={onOpenNotifications} className="relative p-2 text-slate-600">
              <Bell size={20} />
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />}
            </button>
          )}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="p-2 text-slate-600 rounded-lg"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white p-4 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase">Quick Switch Persona:</div>
          <select 
            aria-label="Mobile Demo Persona"
            className="w-full bg-slate-50 p-2 text-xs rounded-lg border border-slate-200"
            onChange={(e) => {
              const p = personas.find(item => item.identifier === e.target.value);
              if (p) {
                onSelectPersona(p);
                setMobileMenuOpen(false);
              }
            }}
            value={session?.reg_no || session?.email || ""}
          >
            {personas.map((p, i) => (
              <option key={i} value={p.identifier}>{p.label}</option>
            ))}
          </select>

          {session ? (
            <div className="pt-2 flex justify-between items-center border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700">{session.full_name} ({session.role})</span>
              <button onClick={() => { onLogout(); setMobileMenuOpen(false); }} className="text-xs font-bold text-red-600">
                Sign Out
              </button>
            </div>
          ) : (
            <button 
              onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }} 
              className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-xs"
            >
              Sign In / Register
            </button>
          )}
        </div>
      )}
    </header>
  );
};
