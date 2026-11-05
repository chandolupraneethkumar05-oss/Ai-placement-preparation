import React, { useState, useEffect } from 'react';
import type { PYQMockQuestion } from '../types';
import { fetchMockQuestion, submitMockAnswer } from '../api';
import { Sparkles, CheckCircle2, Clock, X, Send, BrainCircuit, Code2, Server, Users, Lock, ShieldAlert, Building2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  studentId: number;
  shortlistedCompanies?: string[];
  initialCompany?: string | null;
  onClose: () => void;
}

export type AssessmentRound = 'reasoning' | 'coding' | 'technical' | 'behavioral';

const ROUNDS_CONFIG: { id: AssessmentRound; label: string; name: string; icon: React.ReactNode; desc: string }[] = [
  { 
    id: 'reasoning', 
    label: 'Round 1', 
    name: 'Logical Reasoning & Aptitude', 
    icon: <BrainCircuit size={16} />,
    desc: 'Strictly Logical Deductions, Sequences & Quantitative Reasoning'
  },
  { 
    id: 'coding', 
    label: 'Round 2', 
    name: 'Data Structures & Coding', 
    icon: <Code2 size={16} />,
    desc: 'Strictly Coding Algorithms, Pointers, Arrays, DP & Trees'
  },
  { 
    id: 'technical', 
    label: 'Round 3', 
    name: 'System Design & Core CS', 
    icon: <Server size={16} />,
    desc: 'Architecture, DB Indexing, Caching & Concurrency'
  },
  { 
    id: 'behavioral', 
    label: 'Round 4', 
    name: 'HR & Behavioral Leadership', 
    icon: <Users size={16} />,
    desc: 'STAR Framework, Situation Handling & Culture Fit'
  }
];

export const MockInterviewModal: React.FC<Props> = ({ 
  isOpen, 
  studentId, 
  shortlistedCompanies = [], 
  initialCompany, 
  onClose 
}) => {
  const [activeCompany, setActiveCompany] = useState<string>(initialCompany || (shortlistedCompanies[0] || ''));
  const [selectedRound, setSelectedRound] = useState<AssessmentRound>('reasoning');
  const [loading, setLoading] = useState(false);
  const [questionData, setQuestionData] = useState<PYQMockQuestion | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);

  useEffect(() => {
    if (initialCompany) {
      setActiveCompany(initialCompany);
    } else if (shortlistedCompanies.length > 0 && !shortlistedCompanies.includes(activeCompany)) {
      setActiveCompany(shortlistedCompanies[0]);
    }
  }, [initialCompany, shortlistedCompanies]);

  const loadQuestion = (company: string, round: AssessmentRound) => {
    if (!company) return;
    setLoading(true);
    setEvaluation(null);
    setErrorNotice(null);
    setAnswer('');
    fetchMockQuestion(company, round, studentId)
      .then(data => {
        setQuestionData(data);
        setLoading(false);
      })
      .catch(err => {
        setErrorNotice(err.message || `You must be shortlisted by ${company} to unlock this assessment.`);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen && activeCompany) {
      loadQuestion(activeCompany, selectedRound);
    }
  }, [isOpen, activeCompany, selectedRound]);

  if (!isOpen) return null;

  const isLocked = shortlistedCompanies.length === 0 && !initialCompany;
  const activeRoundMeta = ROUNDS_CONFIG.find(r => r.id === selectedRound) || ROUNDS_CONFIG[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionData || !answer.trim()) return;
    setSubmitting(true);
    try {
      const res = await submitMockAnswer({
        company_name: questionData.company,
        question_title: questionData.title,
        question_text: questionData.question,
        required_concepts: questionData.required_concepts,
        benchmark_summary: questionData.benchmark_summary,
        student_answer: answer
      });
      setEvaluation(res);
    } catch (e) {
      alert("Evaluation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[94vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex justify-between items-start border-b border-blue-900/50">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isLocked ? 'bg-amber-500 text-slate-900' : 'bg-blue-600 text-white'
              }`}>
                {isLocked ? 'Assessment Locked' : 'Shortlisted Interview Portal'}
              </span>
              {activeCompany && !isLocked && (
                <span className="text-xs text-blue-300 font-bold">• {activeCompany} Hiring Rounds</span>
              )}
            </div>
            <h3 className="text-xl font-black mt-2 tracking-tight">
              {isLocked ? "Interview Assessments Restricted" : `Official Interview Assessment for ${activeCompany}`}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Strict Placement Guardrail: Questions and practice rounds unlock solely for verified shortlisted candidates.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
            <X size={22} />
          </button>
        </div>

        {/* LOCKED SCREEN FOR NON-SHORTLISTED STUDENTS */}
        {isLocked ? (
          <div className="p-8 sm:p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl mx-auto flex items-center justify-center shadow-md">
              <Lock size={32} />
            </div>
            <h4 className="text-lg font-black text-slate-900">
              Access Restricted: Shortlist Requirement Not Met
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              As per VFSTR Training & Placement Cell policies, official company interview rounds are strictly locked. You can only appear for an interview after an employer reviews your resume and marks your application as <b>Shortlisted</b>.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-md mx-auto text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-900">How to unlock interviews:</div>
              <div>1. Build or scan your resume in Resume Center to achieve &gt;70 ATS.</div>
              <div>2. Apply to available recruitment drives matching your target role.</div>
              <div>3. Once HR shortlists your profile, company-specific rounds unlock immediately.</div>
            </div>
            <button
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition mt-2"
            >
              Return to Placement Hub
            </button>
          </div>
        ) : (
          <>
            {/* COMPANY SWITCHER (If shortlisted for multiple companies!) */}
            {shortlistedCompanies.length > 1 && (
              <div className="bg-blue-50/70 border-b border-blue-200 px-6 py-3 flex items-center space-x-3">
                <span className="text-xs font-bold text-blue-900 flex items-center space-x-1">
                  <Building2 size={14} />
                  <span>Your Shortlisted Drives:</span>
                </span>
                <div className="flex gap-2">
                  {shortlistedCompanies.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setActiveCompany(c)}
                      className={`text-xs font-bold px-3 py-1 rounded-xl transition ${
                        activeCompany === c
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      {c} Interview
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4 AVAILABLE ROUNDS SELECTOR FOR THIS SHORTLISTED COMPANY */}
            <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Available Assessment Rounds for {activeCompany}:
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {ROUNDS_CONFIG.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRound(r.id)}
                    className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                      selectedRound === r.id
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black uppercase ${selectedRound === r.id ? 'text-blue-100' : 'text-blue-600'}`}>
                        {r.label}
                      </span>
                      <div className={selectedRound === r.id ? 'text-white' : 'text-slate-500'}>
                        {r.icon}
                      </div>
                    </div>
                    <div className="mt-1.5">
                      <div className="text-xs font-bold leading-tight">{r.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {loading ? (
                <div className="text-center py-16 space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto"></div>
                  <div className="text-xs text-slate-500 font-medium">
                    Fetching authentic {activeRoundMeta.name} challenge for {activeCompany}...
                  </div>
                </div>
              ) : errorNotice ? (
                <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl text-center space-y-2">
                  <ShieldAlert size={28} className="text-red-600 mx-auto" />
                  <div className="font-bold text-sm">{errorNotice}</div>
                  <p className="text-xs text-slate-600">You must be officially shortlisted by {activeCompany} before you can attempt this assessment.</p>
                </div>
              ) : questionData ? (
                <>
                  {/* Question Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center space-x-1.5">
                        <Clock size={14} />
                        <span>Active Challenge: {activeRoundMeta.name}</span>
                      </div>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                        Strict Domain: {selectedRound.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-sm font-extrabold text-slate-900 leading-relaxed bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      {questionData.question}
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                      <Sparkles size={12} className="text-amber-500" />
                      <span><b>Evaluation Focus:</b> {activeRoundMeta.desc}</span>
                    </div>
                  </div>

                  {/* Evaluation Result View if Submitted */}
                  {evaluation ? (
                    <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-emerald-800 uppercase">AI Evaluation Score</span>
                          <div className="text-3xl font-black text-emerald-600 mt-0.5">{evaluation.score} / 100</div>
                        </div>
                        <span className="bg-emerald-200 text-emerald-900 text-xs font-bold px-3 py-1.5 rounded-full">
                          {evaluation.verdict}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="font-bold text-slate-900">Concept Coverage: {evaluation.concept_coverage_percent}%</div>
                        <p className="text-slate-700 bg-white/80 p-3 rounded-xl border border-emerald-200 leading-relaxed">
                          {evaluation.feedback}
                        </p>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => setEvaluation(null)}
                          className="text-xs font-bold text-blue-700 hover:underline"
                        >
                          Retry Question
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Submission Form */
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Your Solution / Explanation:
                        </label>
                        <textarea
                          rows={6}
                          required
                          placeholder={
                            selectedRound === 'reasoning'
                              ? 'Explain your step-by-step logical deductions, probability equations, or pattern reasoning...'
                              : selectedRound === 'coding'
                              ? 'Explain your algorithmic approach, data structure choice, time complexity O(...) and space complexity...'
                              : selectedRound === 'technical'
                              ? 'Detail the architecture, database schema, caching layers, and high-concurrency trade-offs...'
                              : 'Use the STAR format (Situation, Task, Action, Result) to describe your real experience...'
                          }
                          className="w-full border border-slate-300 rounded-xl p-3.5 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed font-sans"
                          value={answer}
                          onChange={e => setAnswer(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || !answer.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs sm:text-sm transition flex items-center justify-center space-x-2 shadow-md shadow-blue-600/20 disabled:opacity-50"
                      >
                        <Send size={15} />
                        <span>{submitting ? 'Running RAG Semantic Evaluation...' : `Submit Answer for ${activeRoundMeta.name}`}</span>
                      </button>
                    </form>
                  )}
                </>
              ) : null}
            </div>
          </>
        )}

      </div>
    </div>
  );
};
