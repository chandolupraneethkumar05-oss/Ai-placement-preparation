import React, { useState, useEffect } from 'react';
import type { UserSession, DemoPersona, NotificationItem } from './types';
import { 
  fetchDemoPersonas, 
  fetchCurrentUser, 
  fetchNotifications, 
  dismissAllNotifications, 
  clearAllNotifications 
} from './api';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './pages/AuthModal';
import { StudentDashboard } from './pages/StudentDashboard';
import { RecruiterDashboard } from './pages/RecruiterDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { LandingPage } from './pages/LandingPage';
import { Bell, LogIn, Menu, X, CheckCircle2 } from 'lucide-react';

export function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [personas, setPersonas] = useState<DemoPersona[]>([]);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authDefaultRole, setAuthDefaultRole] = useState<'student' | 'recruiter' | 'admin'>('student');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Student Navigation state controlled from Sidebar
  const [activeStudentTab, setActiveStudentTab] = useState<'jobs' | 'applications' | 'resume' | 'attendance'>('jobs');
  const [triggerPracticeAssessment, setTriggerPracticeAssessment] = useState(false);

  // Initial load: fetch demo personas and attempt session rehydration from localStorage
  useEffect(() => {
    fetchDemoPersonas().then(data => {
      setPersonas(data);
    }).catch(console.error);

    const savedToken = localStorage.getItem("autoplace_token");
    if (savedToken) {
      fetchCurrentUser()
        .then(user => {
          setSession({
            token: savedToken,
            role: user.role,
            full_name: user.full_name,
            user_id: user.user_id,
            profile_id: user.profile_id,
            reg_no: user.reg_no,
            email: user.email,
            degree: user.degree,
            branch: user.branch,
            year: user.year,
            batch: user.batch,
            company_name: user.company_name
          });
        })
        .catch(() => {
          localStorage.removeItem("autoplace_token");
        });
    }
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      if (data && data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unread || 0);
      }
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  };

  useEffect(() => {
    if (session) {
      loadNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [session]);

  const handleSelectPersona = (p: DemoPersona) => {
    localStorage.setItem("autoplace_token", p.token);
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

  const handleLoginSuccess = (s: UserSession) => {
    localStorage.setItem("autoplace_token", s.token);
    setSession(s);
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
                if (navId === 'jobs' || navId === 'applications' || navId === 'resume' || navId === 'attendance') {
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
                    if (navId === 'jobs' || navId === 'applications' || navId === 'resume' || navId === 'attendance') {
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
        
        {/* Streamlined Clean Top Header */}
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
                  onClick={() => {
                    setIsNotifOpen(true);
                    loadNotifications();
                  }}
                  className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition"
                  title="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-black rounded-full shadow">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
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
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Dynamic Notification Drawer */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-sm h-full p-6 shadow-2xl flex flex-col justify-between">
            <div className="flex-1 overflow-y-auto">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-sm text-slate-900">Placement Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <button onClick={() => setIsNotifOpen(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
                  Close
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  <Bell size={28} className="mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="font-medium">No notifications yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Updates regarding drives & interviews will appear here.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-2 text-xs">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border space-y-1 transition ${
                        n.is_read
                          ? 'bg-slate-50 border-slate-200 text-slate-600'
                          : 'bg-blue-50/70 border-blue-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{n.title}</span>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-600" title="Unread"></span>}
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{n.message}</p>
                      <div className="text-[10px] text-slate-400">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <button
                onClick={async () => {
                  await dismissAllNotifications();
                  await loadNotifications();
                }}
                disabled={notifications.length === 0 || unreadCount === 0}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold py-2 rounded-xl text-xs transition shadow-sm"
              >
                Mark All as Read
              </button>
              <button
                onClick={async () => {
                  await clearAllNotifications();
                  setNotifications([]);
                  setUnreadCount(0);
                }}
                disabled={notifications.length === 0}
                className="w-full bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 font-bold py-1.5 rounded-xl text-xs transition"
              >
                Clear All Notifications
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;