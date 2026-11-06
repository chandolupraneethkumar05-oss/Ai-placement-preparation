import React, { useState, useEffect, useRef } from 'react';
import type { UserSession } from '../types';
import { sendCopilotChat, optimizeResumeWithCopilot, updateManualResume } from '../api';
import { 
  Sparkles, 
  Send, 
  X, 
  MessageSquare, 
  FileText, 
  TrendingUp, 
  CheckCircle2, 
  Bot, 
  User, 
  ChevronRight,
  Maximize2,
  Minimize2,
  RefreshCw,
  Lightbulb
} from 'lucide-react';

interface Props {
  session: UserSession | null;
  onRefreshProfile?: () => void;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AICopilotDrawer: React.FC<Props> = ({ session, onRefreshProfile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'resume'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Resume Optimization State
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeResult, setResumeResult] = useState<any | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine respectful salutation based on user role and name
  const getSalutation = () => {
    if (!session) return "Dear Guest";
    const name = session.full_name || "User";
    if (session.role === 'admin') {
      return `Respected Dean Sir/Madam ${name}`;
    } else if (session.role === 'recruiter') {
      return `Esteemed Recruiter ${name}`;
    } else {
      return `Dear Student ${name}`;
    }
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const salutation = getSalutation();
      setMessages([
        {
          sender: 'assistant',
          text: `Welcome! **${salutation}**, I am your **VFSTR AutoPlace AI Campus Intelligence Copilot**.\n\n` +
                `How can I assist you with campus recruitment, MOU governance, eligibility verification, or resume enhancement today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [isOpen, session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isTyping) return;

    const userMsg: Message = {
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const res = await sendCopilotChat({
        message: text,
        user_name: session?.full_name || "User",
        user_role: session?.role || "student",
        student_id: session?.profile_id || undefined,
        target_role: session?.role === 'student' ? 'Software Engineer' : undefined
      });

      const aiMsg: Message = {
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: "I encountered a network delay communicating with the placement knowledge base. Please try asking again.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleOptimizeResume = async () => {
    if (!session || session.role !== 'student' || !session.profile_id) return;
    setResumeLoading(true);
    setResumeResult(null);
    setAppliedSuccess(false);

    try {
      const res = await optimizeResumeWithCopilot({
        student_id: session.profile_id,
        target_role: "Software Engineer",
        target_company: "Amazon / Tier-1 Tech"
      });
      setResumeResult(res);
    } catch (err: any) {
      alert("Failed to optimize resume: " + (err.message || "Unknown error"));
    } finally {
      setResumeLoading(false);
    }
  };

  const handleApplyResumeImprovements = async () => {
    if (!session || !session.profile_id || !resumeResult) return;
    try {
      await updateManualResume(
        session.profile_id,
        resumeResult.recommended_keywords || [],
        resumeResult.full_enhanced_resume_text || "",
        resumeResult.target_role || "Software Engineer"
      );
      setAppliedSuccess(true);
      if (onRefreshProfile) onRefreshProfile();
    } catch (e: any) {
      alert("Failed to apply improvements to resume profile.");
    }
  };

  return (
    <>
      {/* Floating Trigger Bubble at Bottom-Right */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-tr from-blue-700 via-indigo-600 to-purple-600 hover:from-blue-600 hover:to-indigo-500 text-white font-extrabold text-xs px-4 py-3 rounded-full shadow-2xl flex items-center space-x-2.5 transition transform hover:scale-105 active:scale-95 border-2 border-white/30"
          title="Open AI Placement Copilot"
        >
          <div className="relative">
            <Sparkles size={18} className="animate-spin-slow text-yellow-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-slate-900 animate-pulse"></span>
          </div>
          <span className="tracking-tight text-white font-black">AutoPlace Copilot</span>
        </button>
      </div>

      {/* Slide-out Glassmorphic Chat Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white z-50 shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-indigo-900/60">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md border border-white/20">
                <Bot size={22} />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-black text-sm tracking-tight text-white">AutoPlace Intelligence Copilot</h3>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-medium">
                  {getSalutation()}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close Copilot"
            >
              <X size={18} />
            </button>
          </div>

          {/* Sub-Tabs (Chat vs AI Resume Optimizer for Students) */}
          {session?.role === 'student' && (
            <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2.5 flex items-center justify-center space-x-1.5 transition border-b-2 ${
                  activeTab === 'chat'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare size={14} />
                <span>Placement Assistant</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('resume');
                  if (!resumeResult && !resumeLoading) {
                    handleOptimizeResume();
                  }
                }}
                className={`flex-1 py-2.5 flex items-center justify-center space-x-1.5 transition border-b-2 ${
                  activeTab === 'resume'
                    ? 'border-indigo-600 text-indigo-600 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles size={14} className="text-amber-500" />
                <span>Resume ATS Copilot</span>
              </button>
            </div>
          )}

          {/* BODY 1: CHAT ASSISTANT */}
          {activeTab === 'chat' && (
            <>
              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        m.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                      }`}
                    >
                      <div className="whitespace-pre-line font-sans">{m.text}</div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {m.timestamp}
                    </span>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center space-x-2 text-xs text-slate-500 bg-white p-3 rounded-2xl border border-slate-200 w-fit shadow-sm">
                    <Sparkles size={14} className="text-blue-600 animate-spin" />
                    <span>Copilot is formulating advice...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Suggestion Chips */}
              <div className="p-3 bg-white border-t border-slate-100 flex flex-wrap gap-1.5">
                {[
                  "How does the MOU Dean Approval gate work?",
                  "Explain the stage attendance system.",
                  "How is my authentic ATS score calculated?",
                  "Why am I ineligible for certain drives?"
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip)}
                    disabled={isTyping}
                    className="text-[10px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 transition text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input Bar */}
              <div className="p-3.5 bg-white border-t border-slate-200 flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Ask anything about VFSTR placements, MOUs, interviews..."
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isTyping}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition shadow-md shadow-blue-600/20"
                >
                  <Send size={15} />
                </button>
              </div>
            </>
          )}

          {/* BODY 2: RESUME ATS COPILOT */}
          {activeTab === 'resume' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100 space-y-1">
                <div className="font-extrabold text-indigo-950 text-sm flex items-center space-x-1.5">
                  <Sparkles size={16} className="text-indigo-600" />
                  <span>AI Resume ATS Optimizer</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Analyzes your profile, transforms weak bullet points into STAR-format achievements, and injects critical keywords.
                </p>
              </div>

              {resumeLoading ? (
                <div className="text-center py-16 space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-3 border-indigo-600 border-t-transparent mx-auto"></div>
                  <div className="text-xs text-slate-500 font-bold">
                    Analyzing profile with Gemini AI...
                  </div>
                </div>
              ) : resumeResult ? (
                <div className="space-y-4">
                  
                  {/* Score Boost Gauge */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Current ATS Score</span>
                      <span className="text-xl font-black text-slate-800">{resumeResult.current_ats_score}/100</span>
                    </div>
                    <div className="text-center">
                      <ChevronRight size={20} className="text-indigo-500" />
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-600 font-bold uppercase block">Optimized Score</span>
                      <span className="text-xl font-black text-emerald-600">
                        {resumeResult.optimized_ats_score}/100
                        <span className="text-xs ml-1 text-emerald-700 font-bold">
                          (+{resumeResult.ats_improvement} pts)
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Recommended Keywords */}
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-700 uppercase text-[10px]">Recommended Role Keywords:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {resumeResult.recommended_keywords?.map((kw: string, i: number) => (
                        <span key={i} className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md font-bold text-[10px]">
                          + {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Enhanced STAR Bullets */}
                  <div className="space-y-2">
                    <span className="font-bold text-slate-700 uppercase text-[10px]">Engineered STAR Bullets:</span>
                    <div className="space-y-1.5">
                      {resumeResult.enhanced_projects?.map((bullet: string, i: number) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed text-[11px]">
                          {bullet}
                        </div>
                      ))}
                    </div>
                  </div>

                  {appliedSuccess ? (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl font-bold flex items-center space-x-2">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Resume updated and ATS score dynamically boosted!</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleApplyResumeImprovements}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl shadow-md transition flex items-center justify-center space-x-2"
                    >
                      <CheckCircle2 size={16} />
                      <span>Apply AI Enhancements to Live Resume</span>
                    </button>
                  )}

                  <button
                    onClick={handleOptimizeResume}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1.5"
                  >
                    <RefreshCw size={13} />
                    <span>Regenerate with New Focus</span>
                  </button>

                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Lightbulb size={28} className="mx-auto opacity-50" />
                  <p>Click optimize to generate role-tailored bullet points.</p>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </>
  );
};
