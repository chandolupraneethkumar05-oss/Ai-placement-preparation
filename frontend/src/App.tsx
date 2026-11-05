import React, { useState, useEffect } from 'react';
import type { UserSession, DemoPersona } from './types';
import { fetchDemoPersonas } from './api';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './pages/AuthModal';
import { StudentDashboard } from './pages/StudentDashboard';
import { RecruiterDashboard } from './pages/RecruiterDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { LandingPage } from './pages/LandingPage';
import { Sparkles, Bell, Shield, LogIn, Menu, X, CheckCircle2 } from 'lucide-react';

export function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [personas, setPersonas] = useState<DemoPersona[]>([]);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authDefaultRole, setAuthDefaultRole] = useState<'student' | 'recruiter' | 'admin'>('student');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Student Navigation state controlled from Sidebar
  const [activeStudentTab, setActiveStudentTab] = useState<'jobs' | 'applications' | 'resume'>('jobs');
  const [triggerPracticeAssessment, setTriggerPracticeAssessment] = useState(false);

  useEffect(() => {
    fetchDemoPersonas().then(data => {
      setPersonas(data);
    }).catch(console.error);
  }, []);

  const handleSelectPersona = (p: DemoPersona) => {
    setSession({
      token: p.token,
      role: p.role,
      full_name: p.full_name,
      user_id: p.user_id,
      profile_id: p.profile_id,
      reg_no: p.reg_no,
      email: p.email
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("autoplace_token");
    setSession(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      
      {/* 1. FIXED LEFT SIDEBAR (Pinned on the page) */}
      {session && (
        <>
          {/* Desktop Fixed Sidebar */}
          <div className="hidden lg:block">
            <Sidebar
              session={session}
              personas={personas}
              onSelectPersona={handleSelectPersona}
              onLogout={handleLogout}
              activeNav={activeStudentTab}
              onNavigate={navId => {
                if (navId === 'jobs' || navId === 'applications' || navId === 'resume') {
                  setActiveStudentTab(navId);
                }
              }}
              onOpenAssessment={() => setTriggerPracticeAssessment(true)}
            />
          </div>

          {/* Mobile Drawer Sidebar */}
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden flex">
              <div className="w-64 h-full relative">
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="absolute top-4 right-4 text-white p-1 rounded-lg bg-slate-800 hover:bg-slate-700"
                >
                  <X size={18} />
                </button>
                <Sidebar
                  session={session}
                  personas={personas}
                  onSelectPersona={p => {
                    handleSelectPersona(p);
                    setMobileSidebarOpen(false);
                  }}
                  onLogout={handleLogout}
                  activeNav={activeStudentTab}
                  onNavigate={navId => {
                    if (navId === 'jobs' || navId === 'applications' || navId === 'resume') {
                      setActiveStudentTab(navId);
                    }
                    setMobileSidebarOpen(false);
                  }}
                  onOpenAssessment={() => {
                    setTriggerPracticeAssessment(true);
                    setMobileSidebarOpen(false);
                  }}
                />
              </div>
              <div className="flex-1" onClick={() => setMobileSidebarOpen(false)} />
            </div>
          )}
        </>
      )}

      {/* 2. MAIN SCROLLABLE CONTENT AREA (Offset by Fixed Sidebar) */}
      <div className={`flex-1 flex flex-col min-h-screen ${session ? 'lg:pl-64' : ''}`}>
        
        {/* Streamlined Clean Top Header (Search Bar Removed As Requested) */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {session && (
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                title="Toggle Menu"
              >
                <Menu size={20} />
              </button>
            )}

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
                  {session?.role === 'student' && 'Student Placement Hub'}
                  {session?.role === 'recruiter' && 'Corporate Recruiter Portal'}
                  {session?.role === 'admin' && 'Central T&P Administration'}
                  {!session && 'VFSTR AutoPlace AI Portal'}
                </span>
                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 hidden sm:inline-block">
                  VFSTR Vignan
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Training & Placement Cell • Agentic AI Campus Recruitment Infrastructure
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {session ? (
              <>
                <div className="hidden sm:flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 font-bold">
                  <CheckCircle2 size={13} />
                  <span>Agent Online</span>
                </div>

                <button
                  onClick={() => setIsNotifOpen(true)}
                  className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition"
                  title="Notifications"
                >
                  <Bell size={18} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-md shadow-blue-600/20"
              >
                <LogIn size={14} />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Role Dashboard View */}
        <main className="flex-1">
          {session ? (
            <div className="pb-12">
              {session.role === 'student' && (
                <StudentDashboard 
                  session={session} 
                  activeNavTab={activeStudentTab}
                  onNavTabChange={t => setActiveStudentTab(t)}
                  triggerAssessment={triggerPracticeAssessment}
                  onCloseAssessmentTrigger={() => setTriggerPracticeAssessment(false)}
                />
              )}
              {session.role === 'recruiter' && <RecruiterDashboard session={session} />}
              {session.role === 'admin' && <AdminDashboard session={session} />}
            </div>
          ) : (
            <LandingPage 
              personas={personas}
              onSelectPersona={handleSelectPersona}
              onOpenAuth={(r) => {
                setAuthDefaultRole(r || 'student');
                setIsAuthOpen(true);
              }}
            />
          )}
        </main>

        {/* Clean Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
          © 2026 Vignan's Foundation for Science, Technology and Research (VFSTR) • Placement Management Agent
        </footer>

      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        defaultRole={authDefaultRole}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={s => setSession(s)}
      />

      {/* Notification Drawer */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-sm h-full p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900">Placement Notifications</h3>
                <button onClick={() => setIsNotifOpen(false)} className="text-slate-400 text-xs">Close</button>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                  <div className="font-bold text-blue-900">🎯 New Campus Drive: Amazon</div>
                  <p className="text-slate-600">Amazon posted SDE-1 opening. Your profile meets the criteria!</p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="font-bold text-emerald-900">🎟️ Digital Interview Pass Ready</div>
                  <p className="text-slate-600">Your slot is confirmed for Chamber A-204 at 10:30 AM.</p>
                </div>
              </div>
            </div>
            <button onClick={() => setIsNotifOpen(false)} className="w-full bg-slate-900 text-white font-bold py-2 rounded-xl text-xs">
              Dismiss All
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
