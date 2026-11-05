import React, { useState, useEffect, useRef } from 'react';
import type { 
  TalentShineResumeData, 
  ResumeTemplateId, 
  ATSScoreBreakdown 
} from '../types';
import { 
  fetchResumeBuilder, 
  saveResumeBuilder, 
  enhanceAIBullet, 
  generateAISummary, 
  previewATSScore 
} from '../api';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Download, 
  Save, 
  Share2, 
  Briefcase, 
  GraduationCap, 
  Code, 
  Languages, 
  Award, 
  FolderGit2, 
  X, 
  ChevronDown, 
  ChevronUp,
  FileText,
  BookOpen,
  HeartHandshake,
  Users,
  Gamepad2,
  BadgeCheck,
  Globe,
  Phone,
  Mail,
  MapPin,
  User,
  ExternalLink,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Minus,
  Undo2,
  Redo2,
  Menu
} from 'lucide-react';

interface Props {
  studentId: number;
  studentName: string;
  initialTargetRole?: string;
  onSaveSuccess?: (atsScore: number, skills: string[]) => void;
}

const TEMPLATE_LIST: Array<{ id: ResumeTemplateId; name: string; desc: string; badge: string }> = [
  { id: 'gengar', name: 'Gengar', desc: 'Bold colored sidebar with left profile & modern right layout', badge: 'Popular' },
  { id: 'azurill', name: 'Azurill', desc: 'Classic Harvard single-column with elegant serif typography', badge: 'Standard' },
  { id: 'bronzor', name: 'Bronzor', desc: 'Modern corporate layout with structured dividing rules', badge: 'Clean' },
  { id: 'chikorita', name: 'Chikorita', desc: 'Two-column design with right-hand highlight sidebar', badge: 'Modern' },
  { id: 'ditto', name: 'Ditto', desc: 'High-density tech layout with skill chip clusters', badge: 'Engineering' },
  { id: 'glalie', name: 'Glalie', desc: 'Minimalist executive style with sleek lines', badge: 'Executive' },
  { id: 'kakuna', name: 'Kakuna', desc: 'Academic layout highlighting research & publications', badge: 'Research' },
  { id: 'leafish', name: 'Leafish', desc: 'Dual-tone top banner header with balanced columns', badge: 'Creative' },
  { id: 'onix', name: 'Onix', desc: 'Dark slate technical aesthetic for software developers', badge: 'Dark Theme' },
  { id: 'pikachu', name: 'Pikachu', desc: 'Contemporary creative layout with warm amber highlights', badge: 'Trending' }
];

const ACCENT_COLORS = [
  { name: 'Red', hex: '#dc2626' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Amber', hex: '#d97706' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Slate', hex: '#334155' }
];

export const TalentShineResumeBuilder: React.FC<Props> = ({ 
  studentId, 
  studentName, 
  initialTargetRole = "Software Development Engineer (SDE)",
  onSaveSuccess 
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Resume Data State (All 14 Sections + Custom Fields)
  const [resumeData, setResumeData] = useState<TalentShineResumeData>({
    basics: {
      fullName: studentName,
      headline: `Aspiring ${initialTargetRole}`,
      email: '',
      phone: '',
      location: 'VFSTR Campus, Vadlamudi',
      website: '',
      picture: '',
      customFields: []
    },
    summary: '',
    profiles: [],
    experience: [],
    education: [],
    skills: [],
    languages: [],
    awards: [],
    certifications: [],
    interests: [],
    projects: [],
    publications: [],
    volunteering: [],
    references: []
  });

  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateId>('gengar');
  const [accentColor, setAccentColor] = useState<string>('#dc2626');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Collapsible accordion states
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    basics: false,
    summary: false,
    profiles: true,
    experience: false,
    education: false,
    skills: false,
    languages: true,
    awards: true,
    certifications: true,
    interests: true,
    projects: false,
    publications: true,
    volunteering: true,
    references: true
  });
  const toggleSection = (sec: string) => setCollapsed(prev => ({ ...prev, [sec]: !prev[sec] }));

  // AI & Feedback Modals
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [aiEnhancedText, setAiEnhancedText] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [atsFeedback, setAtsFeedback] = useState<ATSScoreBreakdown | null>(null);

  // Rich text summary helper
  const summaryTextareaRef = useRef<HTMLTextAreaElement>(null);
  const applySummaryFormat = (prefix: string, suffix: string = '') => {
    const el = summaryTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = resumeData.summary || '';
    const selected = current.substring(start, end);
    const updated = current.substring(0, start) + prefix + selected + suffix + current.substring(end);
    setResumeData(prev => ({ ...prev, summary: updated }));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  // Fetch initial data
  useEffect(() => {
    async function loadBuilder() {
      try {
        setLoading(true);
        const res = await fetchResumeBuilder(studentId);
        if (res.builder_data && res.builder_data.basics) {
          // Normalize all arrays to prevent undefined errors
          setResumeData({
            basics: {
              ...res.builder_data.basics,
              customFields: res.builder_data.basics.customFields || []
            },
            summary: res.builder_data.summary || '',
            profiles: res.builder_data.profiles || [],
            experience: res.builder_data.experience || [],
            education: res.builder_data.education || [],
            skills: res.builder_data.skills || [],
            languages: res.builder_data.languages || [],
            awards: res.builder_data.awards || [],
            certifications: res.builder_data.certifications || [],
            interests: res.builder_data.interests || [],
            projects: res.builder_data.projects || [],
            publications: res.builder_data.publications || [],
            volunteering: res.builder_data.volunteering || [],
            references: res.builder_data.references || []
          });
        }
        if (res.selected_template) setSelectedTemplate(res.selected_template);
        if (res.accent_color) setAccentColor(res.accent_color);
      } catch (err) {
        console.error("Error loading resume builder data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBuilder();
  }, [studentId]);

  // Handle Save & Sync ATS
  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);
      const res = await saveResumeBuilder(studentId, {
        builder_data: resumeData,
        selected_template: selectedTemplate,
        accent_color: accentColor,
        target_role: initialTargetRole
      });

      setSaveMessage(`Saved! ATS Score: ${res.ats_score}/100 (${res.skills_extracted?.length || 0} skills detected)`);
      if (onSaveSuccess) {
        onSaveSuccess(res.ats_score, res.skills_extracted || []);
      }
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to save resume");
    } finally {
      setSaving(false);
    }
  };

  // Run ATS Feedback Preview
  const handleOpenFeedback = async () => {
    try {
      setFeedbackModalOpen(true);
      const res = await previewATSScore({ 
        builder_data: resumeData, 
        target_role: initialTargetRole 
      });
      setAtsFeedback(res);
    } catch (err) {
      console.error("Failed to preview ATS score:", err);
    }
  };

  // AI Bullet Enhancement
  const handleEnhanceBullet = async () => {
    if (!aiInputText.trim()) return;
    try {
      setAiLoading(true);
      const res = await enhanceAIBullet(aiInputText, initialTargetRole);
      setAiEnhancedText(res);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  // AI Summary Generator
  const handleGenerateSummary = async () => {
    try {
      setAiLoading(true);
      const skillsList = resumeData.skills.flatMap(s => s.keywords.split(',')).map(s => s.trim()).filter(Boolean);
      const res = await generateAISummary(resumeData.basics.fullName, initialTargetRole, skillsList);
      if (res.summary) {
        setResumeData(prev => ({ ...prev, summary: res.summary }));
        setAiModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  // CLEAN PDF DOWNLOAD FUNCTION (Zero website headers, Zero hardcoded outer images!)
  const handlePrintPDF = () => {
    const sheet = document.getElementById("printable-resume-sheet");
    if (!sheet) return;

    const printWindow = window.open('', '_blank', 'width=950,height=1200');
    if (!printWindow) {
      alert("Please enable pop-ups in your browser to download the clean PDF.");
      return;
    }

    const sheetHTML = sheet.innerHTML;

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${resumeData.basics.fullName || 'Resume'} - Placement CV</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              background-color: white !important;
              font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
            }
            .a4-print-container {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 12mm 14mm;
              background: white;
            }
          </style>
        </head>
        <body>
          <div class="a4-print-container">
            ${sheetHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
        <span className="ml-3 text-slate-600 font-bold text-sm">Loading Resume Builder Canvas...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[calc(100vh-140px)] min-h-[820px]">
      
      {/* Top Action Bar (Matching Image 1: Resume Builder, Resume AI, Feedback, Save) */}
      <div className="bg-white px-6 py-3.5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3 z-10 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 rounded-xl shadow-sm">
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-xl font-black bg-gradient-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent tracking-tight flex items-center space-x-2">
              <span>Resume Builder</span>
              <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200 uppercase font-bold tracking-normal">
                14-Section Full Architecture
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">Target Role: <span className="font-bold text-blue-700">{initialTargetRole}</span></p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          {saveMessage && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
              {saveMessage}
            </span>
          )}

          <button
            onClick={() => setAiModalOpen(true)}
            className="flex items-center space-x-1.5 border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition"
          >
            <Sparkles size={14} className="text-purple-600" />
            <span>Resume AI</span>
          </button>

          <button
            onClick={handleOpenFeedback}
            className="flex items-center space-x-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition"
          >
            <CheckCircle2 size={14} className="text-blue-600" />
            <span>Feedback</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition disabled:opacity-50"
          >
            <Save size={14} />
            <span>{saving ? "Saving..." : "Save & Sync ATS"}</span>
          </button>
        </div>
      </div>

      {/* 3-Column Full-Height Workspace (Left Editor, Middle Canvas, Right Templates) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-hidden">
        
        {/* ================= COLUMN 1: LEFT FORM EDITOR (All 14 Sections - Matching Images 1-4) ================= */}
        <div className="lg:col-span-4 bg-white border-r border-slate-200 p-5 overflow-y-auto h-full space-y-4 pb-28">
          
          {/* SECTION 1: BASICS (Matching Image 1) */}
          <div className="border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 bg-white">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('basics')}>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                <User size={15} className="text-slate-700" />
                <span>Basics</span>
              </h3>
              {collapsed['basics'] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
            </div>

            {!collapsed['basics'] && (
              <div className="space-y-3 pt-1">
                {/* Picture with circle preview and input */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Picture</label>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {resumeData.basics.picture && resumeData.basics.picture.startsWith('http') ? (
                        <img src={resumeData.basics.picture} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={22} className="text-slate-400" />
                      )}
                    </div>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="https://..."
                      value={resumeData.basics.picture}
                      onChange={e => setResumeData(prev => ({
                        ...prev,
                        basics: { ...prev.basics, picture: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={resumeData.basics.fullName}
                    onChange={e => setResumeData(prev => ({
                      ...prev,
                      basics: { ...prev.basics, fullName: e.target.value }
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Headline</label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={resumeData.basics.headline}
                    onChange={e => setResumeData(prev => ({
                      ...prev,
                      basics: { ...prev.basics, headline: e.target.value }
                    }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={resumeData.basics.email}
                      onChange={e => setResumeData(prev => ({
                        ...prev,
                        basics: { ...prev.basics, email: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Website</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={resumeData.basics.website}
                      onChange={e => setResumeData(prev => ({
                        ...prev,
                        basics: { ...prev.basics, website: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone</label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={resumeData.basics.phone}
                      onChange={e => setResumeData(prev => ({
                        ...prev,
                        basics: { ...prev.basics, phone: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Location</label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      value={resumeData.basics.location}
                      onChange={e => setResumeData(prev => ({
                        ...prev,
                        basics: { ...prev.basics, location: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                {/* Custom Fields in Basics */}
                {resumeData.basics.customFields && resumeData.basics.customFields.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Custom Fields</label>
                    {resumeData.basics.customFields.map((cf, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Label (e.g. Nationality, GATE Rank)"
                          className="border border-slate-300 rounded-md px-2 py-1 text-xs w-1/2"
                          value={cf.title}
                          onChange={e => {
                            const val = e.target.value;
                            setResumeData(prev => {
                              const updated = [...(prev.basics.customFields || [])];
                              updated[idx].title = val;
                              return { ...prev, basics: { ...prev.basics, customFields: updated } };
                            });
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          className="border border-slate-300 rounded-md px-2 py-1 text-xs w-1/2"
                          value={cf.value}
                          onChange={e => {
                            const val = e.target.value;
                            setResumeData(prev => {
                              const updated = [...(prev.basics.customFields || [])];
                              updated[idx].value = val;
                              return { ...prev, basics: { ...prev.basics, customFields: updated } };
                            });
                          }}
                        />
                        <button
                          onClick={() => setResumeData(prev => ({
                            ...prev,
                            basics: {
                              ...prev.basics,
                              customFields: (prev.basics.customFields || []).filter((_, i) => i !== idx)
                            }
                          }))}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    basics: {
                      ...prev.basics,
                      customFields: [...(prev.basics.customFields || []), { title: '', value: '' }]
                    }
                  }))}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1 pt-1"
                >
                  <Plus size={14} />
                  <span>Add a custom field</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: SUMMARY (Matching Image 1 Rich Text Toolbar) */}
          <div className="border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5 bg-white">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('summary')}>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                <FileText size={15} className="text-slate-700" />
                <span>Summary</span>
              </h3>
              {collapsed['summary'] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
            </div>

            {!collapsed['summary'] && (
              <div className="space-y-2 pt-1">
                {/* Rich Text Toolbar (Image 1 style) */}
                <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs">
                  <button 
                    type="button"
                    onClick={() => applySummaryFormat('**', '**')} 
                    className="p-1 hover:bg-slate-200 rounded font-bold" 
                    title="Bold"
                  >
                    <Bold size={13} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => applySummaryFormat('*', '*')} 
                    className="p-1 hover:bg-slate-200 rounded italic" 
                    title="Italic"
                  >
                    <Italic size={13} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => applySummaryFormat('~~', '~~')} 
                    className="p-1 hover:bg-slate-200 rounded line-through" 
                    title="Strikethrough"
                  >
                    <Strikethrough size={13} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => applySummaryFormat('`', '`')} 
                    className="p-1 hover:bg-slate-200 rounded font-mono text-[10px]" 
                    title="Code"
                  >
                    &lt;/&gt;
                  </button>
                  <div className="h-3 w-px bg-slate-300 mx-0.5"></div>
                  <button 
                    type="button"
                    onClick={() => applySummaryFormat('\n### ')} 
                    className="p-1 hover:bg-slate-200 rounded font-bold text-[10px]" 
                    title="H1"
                  >
                    H1
                  </button>
                  <button 
                    type="button"
                    onClick={() => applySummaryFormat('\n#### ')} 
                    className="p-1 hover:bg-slate-200 rounded font-bold text-[10px]" 
                    title="H2"
                  >
                    H2
                  </button>
                  <button 
                    type="button"
                    onClick={() => applySummaryFormat('\n- ')} 
                    className="p-1 hover:bg-slate-200 rounded" 
                    title="Bullet List"
                  >
                    <List size={13} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => applySummaryFormat('\n1. ')} 
                    className="p-1 hover:bg-slate-200 rounded" 
                    title="Numbered List"
                  >
                    <ListOrdered size={13} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => applySummaryFormat('\n---\n')} 
                    className="p-1 hover:bg-slate-200 rounded" 
                    title="Horizontal Line"
                  >
                    <Minus size={13} />
                  </button>
                </div>

                <textarea
                  ref={summaryTextareaRef}
                  rows={4}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter a 2-3 sentence technical overview highlighting your programming skills, systems knowledge, and career objectives..."
                  value={resumeData.summary}
                  onChange={e => setResumeData(prev => ({ ...prev, summary: e.target.value }))}
                />
                
                <div className="flex justify-end">
                  <button
                    onClick={handleGenerateSummary}
                    className="text-[11px] font-bold text-purple-700 hover:text-purple-800 flex items-center space-x-1"
                  >
                    <Sparkles size={12} />
                    <span>Auto-Generate with AI</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: PROFILES (Matching Image 2) */}
          <div className="border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5 bg-white">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('profiles')}>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                <Share2 size={15} className="text-slate-700" />
                <span>Profiles ({resumeData.profiles.length})</span>
              </h3>
              {collapsed['profiles'] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
            </div>

            {!collapsed['profiles'] && (
              <div className="space-y-3 pt-1">
                {resumeData.profiles.map((p, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative space-y-2">
                    <button 
                      onClick={() => setResumeData(prev => ({
                        ...prev,
                        profiles: prev.profiles.filter((_, i) => i !== idx)
                      }))}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Network (e.g. GitHub, LinkedIn)"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={p.network}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.profiles];
                            updated[idx].network = val;
                            return { ...prev, profiles: updated };
                          });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Username"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={p.username}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.profiles];
                            updated[idx].username = val;
                            return { ...prev, profiles: updated };
                          });
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="URL (https://github.com/...)"
                      className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs"
                      value={p.url}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.profiles];
                          updated[idx].url = val;
                          return { ...prev, profiles: updated };
                        });
                      }}
                    />
                  </div>
                ))}

                {/* EXACT Match "+ Add a new item" Button Style from Image 2 */}
                <button
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    profiles: [...prev.profiles, { network: 'LinkedIn', username: '', url: '' }]
                  }))}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 rounded-2xl p-3.5 flex items-center justify-center space-x-2 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-sm"
                >
                  <Plus size={16} />
                  <span>Add a new item</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 4: EXPERIENCE (Matching Image 2) */}
          <div className="border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5 bg-white">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('experience')}>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                <Briefcase size={15} className="text-slate-700" />
                <span>Experience ({resumeData.experience.length})</span>
              </h3>
              {collapsed['experience'] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
            </div>

            {!collapsed['experience'] && (
              <div className="space-y-3 pt-1">
                {resumeData.experience.map((exp, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative space-y-2">
                    <button 
                      onClick={() => setResumeData(prev => ({
                        ...prev,
                        experience: prev.experience.filter((_, i) => i !== idx)
                      }))}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Company"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs font-bold"
                        value={exp.company}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.experience];
                            updated[idx].company = val;
                            return { ...prev, experience: updated };
                          });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Position"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={exp.position}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.experience];
                            updated[idx].position = val;
                            return { ...prev, experience: updated };
                          });
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Date Range (e.g. May - Aug 2025)"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={exp.dateRange}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.experience];
                            updated[idx].dateRange = val;
                            return { ...prev, experience: updated };
                          });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Location"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={exp.location}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.experience];
                            updated[idx].location = val;
                            return { ...prev, experience: updated };
                          });
                        }}
                      />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="STAR format achievements & impact (e.g. Built microservices in Go, reducing p99 latency by 32%)..."
                      className="w-full border border-slate-300 rounded-md p-2 text-xs focus:ring-1 focus:ring-blue-500"
                      value={exp.summary}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.experience];
                          updated[idx].summary = val;
                          return { ...prev, experience: updated };
                        });
                      }}
                    />
                  </div>
                ))}

                <button
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    experience: [...prev.experience, { company: '', position: '', location: '', dateRange: '', summary: '' }]
                  }))}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 rounded-2xl p-3.5 flex items-center justify-center space-x-2 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-sm"
                >
                  <Plus size={16} />
                  <span>Add a new item</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 5: EDUCATION (Matching Image 2) */}
          <div className="border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5 bg-white">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('education')}>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                <GraduationCap size={15} className="text-slate-700" />
                <span>Education ({resumeData.education.length})</span>
              </h3>
              {collapsed['education'] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
            </div>

            {!collapsed['education'] && (
              <div className="space-y-3 pt-1">
                {resumeData.education.map((edu, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative space-y-2">
                    <button 
                      onClick={() => setResumeData(prev => ({
                        ...prev,
                        education: prev.education.filter((_, i) => i !== idx)
                      }))}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                    <input
                      type="text"
                      placeholder="Institution (e.g. VFSTR Deemed to be University)"
                      className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs font-bold"
                      value={edu.institution}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.education];
                          updated[idx].institution = val;
                          return { ...prev, education: updated };
                        });
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Degree (e.g. B.Tech)"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={edu.degree}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.education];
                            updated[idx].degree = val;
                            return { ...prev, education: updated };
                          });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Branch / Major (e.g. Computer Science)"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={edu.field}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.education];
                            updated[idx].field = val;
                            return { ...prev, education: updated };
                          });
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="CGPA / Percentage (e.g. 8.8 CGPA)"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={edu.score}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.education];
                            updated[idx].score = val;
                            return { ...prev, education: updated };
                          });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Date Range (e.g. 2023 - 2027)"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={edu.dateRange}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.education];
                            updated[idx].dateRange = val;
                            return { ...prev, education: updated };
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    education: [...prev.education, { institution: 'VFSTR', degree: 'B.Tech', field: 'Computer Science and Engineering', score: '8.5 CGPA', dateRange: '2023 - 2027' }]
                  }))}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 rounded-2xl p-3.5 flex items-center justify-center space-x-2 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-sm"
                >
                  <Plus size={16} />
                  <span>Add a new item</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 6: SKILLS (Matching Image 2) */}
          <div className="border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5 bg-white">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('skills')}>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                <Code size={15} className="text-slate-700" />
                <span>Skills ({resumeData.skills.length})</span>
              </h3>
              {collapsed['skills'] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
            </div>

            {!collapsed['skills'] && (
              <div className="space-y-3 pt-1">
                {resumeData.skills.map((s, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative space-y-2">
                    <button 
                      onClick={() => setResumeData(prev => ({
                        ...prev,
                        skills: prev.skills.filter((_, i) => i !== idx)
                      }))}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                    <input
                      type="text"
                      placeholder="Category (e.g. Languages, Databases, Tools)"
                      className="border border-slate-300 rounded-md px-2 py-1 text-xs font-bold w-10/12"
                      value={s.name}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.skills];
                          updated[idx].name = val;
                          return { ...prev, skills: updated };
                        });
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Keywords (e.g. Python, Java, SQL, Docker, React)"
                      className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs"
                      value={s.keywords}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.skills];
                          updated[idx].keywords = val;
                          return { ...prev, skills: updated };
                        });
                      }}
                    />
                  </div>
                ))}

                <button
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    skills: [...prev.skills, { name: 'Core Stack', keywords: 'Python, SQL, React, Docker' }]
                  }))}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 rounded-2xl p-3.5 flex items-center justify-center space-x-2 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-sm"
                >
                  <Plus size={16} />
                  <span>Add a new item</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 7: LANGUAGES (Matching Image 2) */}
          <div className="border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5 bg-white">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('languages')}>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                <Languages size={15} className="text-slate-700" />
                <span>Languages ({resumeData.languages.length})</span>
              </h3>
              {collapsed['languages'] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
            </div>

            {!collapsed['languages'] && (
              <div className="space-y-3 pt-1">
                {resumeData.languages.map((l, idx) => (
                  <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <input
                      type="text"
                      placeholder="Language (e.g. English)"
                      className="border border-slate-300 rounded-md px-2 py-1 text-xs flex-1"
                      value={l.name}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.languages];
                          updated[idx].name = val;
                          return { ...prev, languages: updated };
                        });
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Fluency (e.g. Native, Fluent)"
                      className="border border-slate-300 rounded-md px-2 py-1 text-xs flex-1"
                      value={l.fluency}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.languages];
                          updated[idx].fluency = val;
                          return { ...prev, languages: updated };
                        });
                      }}
                    />
                    <button
                      onClick={() => setResumeData(prev => ({
                        ...prev,
                        languages: prev.languages.filter((_, i) => i !== idx)
                      }))}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    languages: [...prev.languages, { name: 'English', fluency: 'Professional Working' }]
                  }))}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 rounded-2xl p-3.5 flex items-center justify-center space-x-2 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-sm"
                >
                  <Plus size={16} />
                  <span>Add a new item</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 8: AWARDS (Matching Images 2 & 3) */}
          <div className="border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5 bg-white">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('awards')}>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                <Award size={15} className="text-slate-700" />
                <span>Awards ({resumeData.awards.length})</span>
              </h3>
              {collapsed['awards'] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
            </div>

            {!collapsed['awards'] && (
              <div className="space-y-3 pt-1">
                {resumeData.awards.map((aw, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative space-y-2">
                    <button 
                      onClick={() => setResumeData(prev => ({
                        ...prev,
                        awards: prev.awards.filter((_, i) => i !== idx)
                      }))}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                    <input
                      type="text"
                      placeholder="Award Title (e.g. Smart India Hackathon Finalist)"
                      className="w-10/12 border border-slate-300 rounded-md px-2 py-1 text-xs font-bold"
                      value={aw.title}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.awards];
                          updated[idx].title = val;
                          return { ...prev, awards: updated };
                        });
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Awarder / Organization"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={aw.awarder}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.awards];
                            updated[idx].awarder = val;
                            return { ...prev, awards: updated };
                          });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Date (e.g. 2025)"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={aw.date}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.awards];
                            updated[idx].date = val;
                            return { ...prev, awards: updated };
                          });
                        }}
                      />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Summary / Significance..."
                      className="w-full border border-slate-300 rounded-md p-2 text-xs"
                      value={aw.summary}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.awards];
                          updated[idx].summary = val;
                          return { ...prev, awards: updated };
                        });
                      }}
                    />
                  </div>
                ))}

                <button
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    awards: [...prev.awards, { title: 'VFSTR Academic Excellence Award', awarder: 'VFSTR', date: '2025', summary: 'Secured top 5% rank in department.' }]
                  }))}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 rounded-2xl p-3.5 flex items-center justify-center space-x-2 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-sm"
                >
                  <Plus size={16} />
                  <span>Add a new item</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 9: CERTIFICATIONS (Matching Image 3) */}
          <div className="border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5 bg-white">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('certs')}>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                <BadgeCheck size={15} className="text-slate-700" />
                <span>Certifications ({resumeData.certifications.length})</span>
              </h3>
              {collapsed['certs'] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
            </div>

            {!collapsed['certs'] && (
              <div className="space-y-3 pt-1">
                {resumeData.certifications.map((c, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative space-y-2">
                    <button 
                      onClick={() => setResumeData(prev => ({
                        ...prev,
                        certifications: prev.certifications.filter((_, i) => i !== idx)
                      }))}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                    <input
                      type="text"
                      placeholder="Certification Title (e.g. AWS Certified Developer)"
                      className="w-10/12 border border-slate-300 rounded-md px-2 py-1 text-xs font-bold"
                      value={c.title}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.certifications];
                          updated[idx].title = val;
                          return { ...prev, certifications: updated };
                        });
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Issuer (e.g. Amazon Web Services)"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={c.issuer}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.certifications];
                            updated[idx].issuer = val;
                            return { ...prev, certifications: updated };
                          });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Date"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={c.date}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.certifications];
                            updated[idx].date = val;
                            return { ...prev, certifications: updated };
                          });
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Credential URL"
                      className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs"
                      value={c.url}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.certifications];
                          updated[idx].url = val;
                          return { ...prev, certifications: updated };
                        });
                      }}
                    />
                  </div>
                ))}

                <button
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    certifications: [...prev.certifications, { title: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', date: '2025', url: '' }]
                  }))}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 rounded-2xl p-3.5 flex items-center justify-center space-x-2 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-sm"
                >
                  <Plus size={16} />
                  <span>Add a new item</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 10: INTERESTS (Matching Image 3) */}
          <div className="border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5 bg-white">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('interests')}>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                <Gamepad2 size={15} className="text-slate-700" />
                <span>Interests ({resumeData.interests.length})</span>
              </h3>
              {collapsed['interests'] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
            </div>

            {!collapsed['interests'] && (
              <div className="space-y-3 pt-1">
                {resumeData.interests.map((it, idx) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 relative flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Interest Name (e.g. Competitive Programming, Robotics)"
                      className="border border-slate-300 rounded-md px-2 py-1 text-xs flex-1 font-medium"
                      value={it.name}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.interests];
                          updated[idx].name = val;
                          return { ...prev, interests: updated };
                        });
                      }}
                    />
                    <button
                      onClick={() => setResumeData(prev => ({
                        ...prev,
                        interests: prev.interests.filter((_, i) => i !== idx)
                      }))}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    interests: [...prev.interests, { name: 'Distributed Systems' }]
                  }))}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 rounded-2xl p-3.5 flex items-center justify-center space-x-2 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-sm"
                >
                  <Plus size={16} />
                  <span>Add a new item</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 11: PROJECTS (Matching Image 3) */}
          <div className="border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5 bg-white">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('projects')}>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                <FolderGit2 size={15} className="text-slate-700" />
                <span>Projects ({resumeData.projects.length})</span>
              </h3>
              {collapsed['projects'] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
            </div>

            {!collapsed['projects'] && (
              <div className="space-y-3 pt-1">
                {resumeData.projects.map((proj, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative space-y-2">
                    <button 
                      onClick={() => setResumeData(prev => ({
                        ...prev,
                        projects: prev.projects.filter((_, i) => i !== idx)
                      }))}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                    <input
                      type="text"
                      placeholder="Project Name"
                      className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs font-bold"
                      value={proj.name}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.projects];
                          updated[idx].name = val;
                          return { ...prev, projects: updated };
                        });
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Tech Stack (e.g. React, Python, FastAPI)"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={proj.techStack}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.projects];
                            updated[idx].techStack = val;
                            return { ...prev, projects: updated };
                          });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="GitHub / Live Link"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={proj.link}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.projects];
                            updated[idx].link = val;
                            return { ...prev, projects: updated };
                          });
                        }}
                      />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Description with metrics (e.g. Engineered full-stack platform serving 1,000+ users, cutting API latency by 40%)..."
                      className="w-full border border-slate-300 rounded-md p-2 text-xs focus:ring-1 focus:ring-blue-500"
                      value={proj.description}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.projects];
                          updated[idx].description = val;
                          return { ...prev, projects: updated };
                        });
                      }}
                    />
                  </div>
                ))}

                <button
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    projects: [...prev.projects, { name: '', techStack: '', link: '', description: '' }]
                  }))}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 rounded-2xl p-3.5 flex items-center justify-center space-x-2 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-sm"
                >
                  <Plus size={16} />
                  <span>Add a new item</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 12: PUBLICATIONS (Matching Image 3) */}
          <div className="border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5 bg-white">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('publications')}>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                <BookOpen size={15} className="text-slate-700" />
                <span>Publications ({resumeData.publications.length})</span>
              </h3>
              {collapsed['publications'] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
            </div>

            {!collapsed['publications'] && (
              <div className="space-y-3 pt-1">
                {resumeData.publications.map((pub, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative space-y-2">
                    <button 
                      onClick={() => setResumeData(prev => ({
                        ...prev,
                        publications: prev.publications.filter((_, i) => i !== idx)
                      }))}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                    <input
                      type="text"
                      placeholder="Paper Title"
                      className="w-10/12 border border-slate-300 rounded-md px-2 py-1 text-xs font-bold"
                      value={pub.name}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.publications];
                          updated[idx].name = val;
                          return { ...prev, publications: updated };
                        });
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Publisher / Journal"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={pub.publisher}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.publications];
                            updated[idx].publisher = val;
                            return { ...prev, publications: updated };
                          });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Date"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={pub.date}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.publications];
                            updated[idx].date = val;
                            return { ...prev, publications: updated };
                          });
                        }}
                      />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Abstract / Summary..."
                      className="w-full border border-slate-300 rounded-md p-2 text-xs"
                      value={pub.summary}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.publications];
                          updated[idx].summary = val;
                          return { ...prev, publications: updated };
                        });
                      }}
                    />
                  </div>
                ))}

                <button
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    publications: [...prev.publications, { name: 'Optimized Routing Algorithms for Cloud Clusters', publisher: 'IEEE International Conference', date: '2025', summary: 'Published research paper on distributed heuristics.' }]
                  }))}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 rounded-2xl p-3.5 flex items-center justify-center space-x-2 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-sm"
                >
                  <Plus size={16} />
                  <span>Add a new item</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 13: VOLUNTEERING (Matching Images 3 & 4) */}
          <div className="border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5 bg-white">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('volunteering')}>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                <HeartHandshake size={15} className="text-slate-700" />
                <span>Volunteering ({resumeData.volunteering.length})</span>
              </h3>
              {collapsed['volunteering'] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
            </div>

            {!collapsed['volunteering'] && (
              <div className="space-y-3 pt-1">
                {resumeData.volunteering.map((vol, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative space-y-2">
                    <button 
                      onClick={() => setResumeData(prev => ({
                        ...prev,
                        volunteering: prev.volunteering.filter((_, i) => i !== idx)
                      }))}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Organization (e.g. NSS, IEEE Student Branch)"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs font-bold"
                        value={vol.organization}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.volunteering];
                            updated[idx].organization = val;
                            return { ...prev, volunteering: updated };
                          });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Role (e.g. Lead Volunteer)"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={vol.role}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.volunteering];
                            updated[idx].role = val;
                            return { ...prev, volunteering: updated };
                          });
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Date Range (e.g. 2024 - Present)"
                      className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs"
                      value={vol.dateRange}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.volunteering];
                          updated[idx].dateRange = val;
                          return { ...prev, volunteering: updated };
                        });
                      }}
                    />
                    <textarea
                      rows={2}
                      placeholder="Impact / Contribution summary..."
                      className="w-full border border-slate-300 rounded-md p-2 text-xs"
                      value={vol.summary}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.volunteering];
                          updated[idx].summary = val;
                          return { ...prev, volunteering: updated };
                        });
                      }}
                    />
                  </div>
                ))}

                <button
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    volunteering: [...prev.volunteering, { organization: 'VFSTR Code Club', role: 'Technical Mentor', dateRange: '2024 - 2025', summary: 'Conducted weekly DSA workshops for 120+ first-year students.' }]
                  }))}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 rounded-2xl p-3.5 flex items-center justify-center space-x-2 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-sm"
                >
                  <Plus size={16} />
                  <span>Add a new item</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 14: REFERENCES (Matching Image 4) */}
          <div className="border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2.5 bg-white">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('references')}>
              <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center space-x-2">
                <Users size={15} className="text-slate-700" />
                <span>References ({resumeData.references.length})</span>
              </h3>
              {collapsed['references'] ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
            </div>

            {!collapsed['references'] && (
              <div className="space-y-3 pt-1">
                {resumeData.references.map((r, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative space-y-2">
                    <button 
                      onClick={() => setResumeData(prev => ({
                        ...prev,
                        references: prev.references.filter((_, i) => i !== idx)
                      }))}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                    <input
                      type="text"
                      placeholder="Reference Name (e.g. Dr. K. Venkateswara Rao)"
                      className="w-10/12 border border-slate-300 rounded-md px-2 py-1 text-xs font-bold"
                      value={r.name}
                      onChange={e => {
                        const val = e.target.value;
                        setResumeData(prev => {
                          const updated = [...prev.references];
                          updated[idx].name = val;
                          return { ...prev, references: updated };
                        });
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Company / Institution"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={r.company}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.references];
                            updated[idx].company = val;
                            return { ...prev, references: updated };
                          });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Contact (Email / Phone)"
                        className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                        value={r.contact}
                        onChange={e => {
                          const val = e.target.value;
                          setResumeData(prev => {
                            const updated = [...prev.references];
                            updated[idx].contact = val;
                            return { ...prev, references: updated };
                          });
                        }}
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setResumeData(prev => ({
                    ...prev,
                    references: [...prev.references, { name: 'Prof. Ramesh Kumar', company: 'Dept of CSE, VFSTR', contact: 'ramesh.k@vignan.ac.in' }]
                  }))}
                  className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 rounded-2xl p-3.5 flex items-center justify-center space-x-2 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-sm"
                >
                  <Plus size={16} />
                  <span>Add a new item</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* ================= COLUMN 2: CENTER CANVAS & LIVE PREVIEW (Matching Image 1) ================= */}
        <div className="lg:col-span-6 bg-slate-100/90 p-6 flex flex-col items-center justify-start overflow-y-auto h-full relative pb-28">
          
          {/* Resume A4 Sheet Container */}
          <div 
            id="printable-resume-sheet"
            style={{ 
              transform: `scale(${zoomLevel / 100})`, 
              transformOrigin: 'top center',
              width: '210mm',
              minHeight: '297mm'
            }}
            className="bg-white shadow-2xl rounded-sm p-8 text-slate-800 transition-transform duration-200 print:shadow-none print:w-full print:p-0 print:m-0 mb-16"
          >
            {/* ================= TEMPLATE 1: GENGAR (Bold Colored Sidebar) ================= */}
            {selectedTemplate === 'gengar' && (
              <div className="grid grid-cols-12 gap-6 min-h-[275mm]">
                {/* Left Colored Sidebar */}
                <div 
                  className="col-span-4 rounded-xl p-5 text-white space-y-5"
                  style={{ backgroundColor: accentColor }}
                >
                  <div className="text-center space-y-2">
                    {resumeData.basics.picture && resumeData.basics.picture.startsWith('http') ? (
                      <img 
                        src={resumeData.basics.picture} 
                        alt="Profile" 
                        className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-white/60 shadow"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full mx-auto bg-white/20 border-2 border-white/40 flex items-center justify-center text-lg font-black">
                        {resumeData.basics.fullName.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                    <h2 className="text-sm font-black tracking-tight">{resumeData.basics.fullName}</h2>
                    <p className="text-[10px] text-white/80 font-medium leading-tight">{resumeData.basics.headline}</p>
                  </div>

                  {/* Contact */}
                  <div className="text-[10px] space-y-1 pt-2 border-t border-white/20">
                    {resumeData.basics.email && <div>✉ {resumeData.basics.email}</div>}
                    {resumeData.basics.phone && <div>☎ {resumeData.basics.phone}</div>}
                    {resumeData.basics.location && <div>📍 {resumeData.basics.location}</div>}
                    {resumeData.basics.website && <div className="truncate">🔗 {resumeData.basics.website}</div>}
                  </div>

                  {/* Custom Fields in Sidebar */}
                  {resumeData.basics.customFields && resumeData.basics.customFields.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-white/20 text-[9px]">
                      {resumeData.basics.customFields.map((cf, i) => (
                        <div key={i}>
                          <span className="font-bold opacity-75">{cf.title}: </span>
                          <span>{cf.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Profiles in Sidebar */}
                  {resumeData.profiles.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-white/20">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-white/90">Profiles</h4>
                      {resumeData.profiles.map((p, i) => (
                        <div key={i} className="text-[9px] truncate">
                          <span className="font-bold">{p.network}: </span>
                          <span className="opacity-80">{p.username || p.url}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Skills Block */}
                  {resumeData.skills.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-white/20">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-white/90">Skills</h4>
                      {resumeData.skills.map((s, i) => (
                        <div key={i} className="text-[9px]">
                          <span className="font-bold block">{s.name}:</span>
                          <span className="text-white/80">{s.keywords}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Languages */}
                  {resumeData.languages.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-white/20">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-white/90">Languages</h4>
                      {resumeData.languages.map((l, i) => (
                        <div key={i} className="text-[9px] flex justify-between">
                          <span>{l.name}</span>
                          <span className="text-white/70">{l.fluency}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Interests */}
                  {resumeData.interests.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-white/20">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-white/90">Interests</h4>
                      <p className="text-[9px] text-white/80">{resumeData.interests.map(it => it.name).join(', ')}</p>
                    </div>
                  )}
                </div>

                {/* Right Body */}
                <div className="col-span-8 space-y-4 p-2">
                  {/* Summary */}
                  {resumeData.summary && (
                    <div className="space-y-1">
                      <h3 className="text-xs font-black uppercase tracking-wider pb-1 border-b" style={{ borderColor: accentColor, color: accentColor }}>
                        Professional Summary
                      </h3>
                      <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line">{resumeData.summary}</p>
                    </div>
                  )}

                  {/* Experience */}
                  {resumeData.experience.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider pb-1 border-b" style={{ borderColor: accentColor, color: accentColor }}>
                        Work Experience & Internships
                      </h3>
                      {resumeData.experience.map((exp, i) => (
                        <div key={i} className="text-xs space-y-0.5">
                          <div className="flex justify-between items-baseline font-bold text-slate-900">
                            <span>{exp.position} — {exp.company}</span>
                            <span className="text-[10px] text-slate-500 font-normal">{exp.dateRange}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">{exp.location}</div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{exp.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Projects */}
                  {resumeData.projects.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider pb-1 border-b" style={{ borderColor: accentColor, color: accentColor }}>
                        Key Technical Projects
                      </h3>
                      {resumeData.projects.map((pr, i) => (
                        <div key={i} className="text-xs space-y-0.5">
                          <div className="flex justify-between items-baseline">
                            <span className="font-bold text-slate-900">{pr.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{pr.techStack}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{pr.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Education */}
                  {resumeData.education.length > 0 && (
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-black uppercase tracking-wider pb-1 border-b" style={{ borderColor: accentColor, color: accentColor }}>
                        Education
                      </h3>
                      {resumeData.education.map((e, i) => (
                        <div key={i} className="text-xs flex justify-between items-baseline">
                          <div>
                            <span className="font-bold text-slate-900">{e.degree} in {e.field}</span>
                            <div className="text-[10px] text-slate-600">{e.institution}</div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">{e.score} • {e.dateRange}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Certifications & Awards */}
                  {(resumeData.certifications.length > 0 || resumeData.awards.length > 0) && (
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-black uppercase tracking-wider pb-1 border-b" style={{ borderColor: accentColor, color: accentColor }}>
                        Honors & Certifications
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {resumeData.certifications.map((c, i) => (
                          <div key={i} className="border border-slate-200 p-2 rounded-lg">
                            <div className="font-bold text-slate-900 text-[10px]">{c.title}</div>
                            <div className="text-[9px] text-slate-500">{c.issuer} ({c.date})</div>
                          </div>
                        ))}
                        {resumeData.awards.map((a, i) => (
                          <div key={i} className="border border-slate-200 p-2 rounded-lg">
                            <div className="font-bold text-slate-900 text-[10px]">{a.title}</div>
                            <div className="text-[9px] text-slate-500">{a.awarder} ({a.date})</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Publications & Volunteering */}
                  {(resumeData.publications.length > 0 || resumeData.volunteering.length > 0) && (
                    <div className="space-y-1.5 pt-1">
                      <h3 className="text-xs font-black uppercase tracking-wider pb-1 border-b" style={{ borderColor: accentColor, color: accentColor }}>
                        Publications & Leadership
                      </h3>
                      {resumeData.publications.map((pub, i) => (
                        <div key={i} className="text-[10px] text-slate-700">
                          <span className="font-bold">{pub.name}</span> — <span>{pub.publisher} ({pub.date})</span>
                        </div>
                      ))}
                      {resumeData.volunteering.map((v, i) => (
                        <div key={i} className="text-[10px] text-slate-700">
                          <span className="font-bold">{v.role}</span> at {v.organization} ({v.dateRange}): {v.summary}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* References */}
                  {resumeData.references.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <h3 className="text-xs font-black uppercase tracking-wider pb-1 border-b" style={{ borderColor: accentColor, color: accentColor }}>
                        References
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        {resumeData.references.map((r, i) => (
                          <div key={i} className="text-slate-600">
                            <span className="font-bold text-slate-900 block">{r.name}</span>
                            <span>{r.company} • {r.contact}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================= TEMPLATE 2: AZURILL (Classic Harvard Single Column) ================= */}
            {selectedTemplate === 'azurill' && (
              <div className="space-y-4 font-serif">
                <div className="text-center border-b-2 pb-3" style={{ borderColor: accentColor }}>
                  <h1 className="text-2xl font-bold tracking-wide text-slate-900">{resumeData.basics.fullName}</h1>
                  <p className="text-xs text-slate-600 italic mt-0.5">{resumeData.basics.headline}</p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    {resumeData.basics.location} • {resumeData.basics.phone} • {resumeData.basics.email} {resumeData.basics.website ? `• ${resumeData.basics.website}` : ''}
                  </p>
                </div>

                {resumeData.summary && (
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 border-b pb-0.5">Professional Summary</h3>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{resumeData.summary}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 border-b pb-0.5">Education</h3>
                  {resumeData.education.map((e, i) => (
                    <div key={i} className="text-xs flex justify-between">
                      <div><span className="font-bold">{e.institution}</span>, {e.degree} in {e.field}</div>
                      <span className="text-slate-600">{e.score} • {e.dateRange}</span>
                    </div>
                  ))}
                </div>

                {resumeData.skills.length > 0 && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 border-b pb-0.5">Technical Competencies</h3>
                    {resumeData.skills.map((s, i) => (
                      <div key={i} className="text-xs">
                        <span className="font-bold">{s.name}: </span>
                        <span className="text-slate-700">{s.keywords}</span>
                      </div>
                    ))}
                  </div>
                )}

                {resumeData.experience.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 border-b pb-0.5">Professional Experience</h3>
                    {resumeData.experience.map((exp, i) => (
                      <div key={i} className="text-xs space-y-0.5">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{exp.position} — {exp.company}</span>
                          <span className="text-slate-500 font-normal">{exp.dateRange}</span>
                        </div>
                        <p className="text-[11px] text-slate-700 leading-relaxed">{exp.summary}</p>
                      </div>
                    ))}
                  </div>
                )}

                {resumeData.projects.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 border-b pb-0.5">Key Projects</h3>
                    {resumeData.projects.map((p, i) => (
                      <div key={i} className="text-xs space-y-0.5">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{p.name} ({p.techStack})</span>
                          <span className="text-[10px] text-slate-500 font-normal">{p.link}</span>
                        </div>
                        <p className="text-[11px] text-slate-700">{p.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {(resumeData.certifications.length > 0 || resumeData.awards.length > 0) && (
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 border-b pb-0.5">Honors & Certifications</h3>
                    <ul className="text-[11px] text-slate-700 space-y-0.5 list-disc list-inside">
                      {resumeData.certifications.map((c, i) => (
                        <li key={i}>{c.title} by {c.issuer} ({c.date})</li>
                      ))}
                      {resumeData.awards.map((a, i) => (
                        <li key={i}>{a.title} ({a.awarder}, {a.date})</li>
                      ))}
                    </ul>
                  </div>
                )}

                {resumeData.languages.length > 0 && (
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 border-b pb-0.5">Languages</h3>
                    <p className="text-xs text-slate-700">{resumeData.languages.map(l => `${l.name} (${l.fluency})`).join(' • ')}</p>
                  </div>
                )}
              </div>
            )}

            {/* ================= TEMPLATE 3: BRONZOR (Corporate Header + Split Columns) ================= */}
            {selectedTemplate === 'bronzor' && (
              <div className="space-y-5 font-sans">
                <div className="p-4 rounded-xl text-white shadow-sm" style={{ backgroundColor: accentColor }}>
                  <h1 className="text-2xl font-black">{resumeData.basics.fullName}</h1>
                  <p className="text-xs text-white/90">{resumeData.basics.headline}</p>
                  <div className="flex flex-wrap gap-3 text-[10px] text-white/80 mt-2">
                    <span>✉ {resumeData.basics.email}</span>
                    <span>☎ {resumeData.basics.phone}</span>
                    <span>📍 {resumeData.basics.location}</span>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-5">
                  <div className="col-span-8 space-y-4">
                    {resumeData.summary && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 border-b pb-0.5">About Me</h4>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{resumeData.summary}</p>
                      </div>
                    )}
                    {resumeData.experience.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b pb-0.5">Experience</h4>
                        {resumeData.experience.map((exp, i) => (
                          <div key={i} className="mb-2 text-xs">
                            <div className="font-bold text-slate-900">{exp.position} — {exp.company} <span className="text-[10px] text-slate-500 font-normal">({exp.dateRange})</span></div>
                            <p className="text-[11px] text-slate-600">{exp.summary}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {resumeData.projects.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b pb-0.5">Projects</h4>
                        {resumeData.projects.map((p, i) => (
                          <div key={i} className="mb-2 text-xs">
                            <div className="font-bold text-slate-900">{p.name} <span className="text-[10px] text-slate-500 font-normal">[{p.techStack}]</span></div>
                            <p className="text-[11px] text-slate-600">{p.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="col-span-4 space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">Education</h4>
                      {resumeData.education.map((e, i) => (
                        <div key={i} className="text-xs mb-1.5">
                          <div className="font-bold text-slate-900">{e.degree}</div>
                          <div className="text-[10px] text-slate-600">{e.institution}</div>
                          <div className="text-[10px] text-slate-500">{e.score}</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">Skills</h4>
                      {resumeData.skills.map((s, i) => (
                        <div key={i} className="text-xs mb-1">
                          <span className="font-bold block text-[11px]">{s.name}</span>
                          <span className="text-[10px] text-slate-600">{s.keywords}</span>
                        </div>
                      ))}
                    </div>
                    {resumeData.certifications.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">Certifications</h4>
                        {resumeData.certifications.map((c, i) => (
                          <div key={i} className="text-[10px] text-slate-700 mb-1">
                            <span className="font-bold block">{c.title}</span>
                            <span className="text-slate-500">{c.issuer}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ================= TEMPLATES 4-10 (Chikorita, Ditto, Glalie, Kakuna, Leafish, Onix, Pikachu) ================= */}
            {!['gengar', 'azurill', 'bronzor'].includes(selectedTemplate) && (
              <div className={`space-y-5 font-sans ${selectedTemplate === 'onix' ? 'bg-slate-900 text-slate-100 p-6 rounded-xl' : ''}`}>
                <div className="border-b-4 pb-3" style={{ borderColor: accentColor }}>
                  <div className="flex justify-between items-end">
                    <div>
                      <h1 className={`text-2xl font-black ${selectedTemplate === 'onix' ? 'text-white' : 'text-slate-900'}`}>{resumeData.basics.fullName}</h1>
                      <p className="text-xs font-semibold mt-0.5" style={{ color: accentColor }}>{resumeData.basics.headline}</p>
                    </div>
                    <div className="text-right text-[10px] opacity-75 space-y-0.5">
                      <div>{resumeData.basics.email} • {resumeData.basics.phone}</div>
                      <div>{resumeData.basics.location} {resumeData.basics.website ? `• ${resumeData.basics.website}` : ''}</div>
                    </div>
                  </div>
                </div>

                {resumeData.summary && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: accentColor }}>Profile Overview</h3>
                    <p className={`text-xs leading-relaxed whitespace-pre-line ${selectedTemplate === 'onix' ? 'text-slate-300' : 'text-slate-600'}`}>{resumeData.summary}</p>
                  </div>
                )}

                {/* Experience */}
                {resumeData.experience.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: accentColor }}>Experience & Employment</h3>
                    {resumeData.experience.map((exp, i) => (
                      <div key={i} className="text-xs space-y-0.5 border-l-2 pl-3" style={{ borderColor: accentColor }}>
                        <div className="flex justify-between font-bold">
                          <span>{exp.position} — {exp.company}</span>
                          <span className="opacity-60 text-[10px] font-normal">{exp.dateRange}</span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${selectedTemplate === 'onix' ? 'text-slate-300' : 'text-slate-600'}`}>{exp.summary}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Projects */}
                {resumeData.projects.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: accentColor }}>Technical Projects & Systems</h3>
                    {resumeData.projects.map((p, i) => (
                      <div key={i} className="text-xs space-y-0.5 border-l-2 pl-3" style={{ borderColor: accentColor }}>
                        <div className="font-bold">{p.name} <span className="opacity-60 font-normal">({p.techStack})</span></div>
                        <p className={`text-[11px] ${selectedTemplate === 'onix' ? 'text-slate-300' : 'text-slate-600'}`}>{p.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: accentColor }}>Education</h3>
                    {resumeData.education.map((e, i) => (
                      <div key={i} className="text-xs mb-1.5">
                        <div className="font-bold">{e.degree} - {e.field}</div>
                        <div className="text-[10px] opacity-75">{e.institution} ({e.score})</div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: accentColor }}>Skills & Competencies</h3>
                    {resumeData.skills.map((s, i) => (
                      <div key={i} className="text-xs mb-1">
                        <span className="font-bold text-[11px]">{s.name}: </span>
                        <span className="text-[10px] opacity-80">{s.keywords}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Sections */}
                {(resumeData.certifications.length > 0 || resumeData.awards.length > 0 || resumeData.languages.length > 0) && (
                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                    {resumeData.certifications.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: accentColor }}>Certifications</h4>
                        {resumeData.certifications.map((c, i) => (
                          <div key={i} className="text-[9px] opacity-85 leading-tight mb-1">
                            <span className="font-bold block">{c.title}</span>
                            <span>{c.issuer}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {resumeData.awards.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: accentColor }}>Awards</h4>
                        {resumeData.awards.map((a, i) => (
                          <div key={i} className="text-[9px] opacity-85 leading-tight mb-1">
                            <span className="font-bold block">{a.title}</span>
                            <span>{a.awarder}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {resumeData.languages.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: accentColor }}>Languages</h4>
                        {resumeData.languages.map((l, i) => (
                          <div key={i} className="text-[9px] opacity-85 leading-tight">
                            {l.name} ({l.fluency})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Floating Bottom Toolbar (Matching Image 1: Zoom -, 100%, Zoom +, Maximize, Accent Color Dots, Download PDF) */}
          <div className="sticky bottom-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-slate-200 flex items-center space-x-3 z-30 flex-shrink-0">
            <button 
              onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <span className="text-xs font-bold text-slate-700 min-w-[36px] text-center">{zoomLevel}%</span>
            <button 
              onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <button 
              onClick={() => setZoomLevel(100)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
              title="Fit to 100%"
            >
              <Maximize2 size={15} />
            </button>

            <div className="h-4 w-px bg-slate-300 mx-1"></div>

            {/* Accent Color Palette */}
            <div className="flex items-center space-x-1.5">
              {ACCENT_COLORS.slice(0, 5).map(c => (
                <button
                  key={c.hex}
                  onClick={() => setAccentColor(c.hex)}
                  style={{ backgroundColor: c.hex }}
                  className={`w-3.5 h-3.5 rounded-full transition-transform ${accentColor === c.hex ? 'ring-2 ring-slate-800 scale-125' : 'hover:scale-110'}`}
                  title={c.name}
                />
              ))}
            </div>

            <div className="h-4 w-px bg-slate-300 mx-1"></div>

            {/* Print / Download Clean PDF button */}
            <button
              onClick={handlePrintPDF}
              className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition shadow-md"
              title="Download clean A4 PDF resume"
            >
              <Download size={13} />
              <span>Download PDF</span>
            </button>
          </div>

        </div>

        {/* ================= COLUMN 3: RIGHT TEMPLATE SELECTOR (Matching Image 1) ================= */}
        <div className="lg:col-span-2 bg-white border-l border-slate-200 p-4 overflow-y-auto h-full space-y-3 pb-28">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">Template</h3>
            <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">10 Styles</span>
          </div>

          <div className="space-y-2.5">
            {TEMPLATE_LIST.map(tmpl => {
              const isSelected = selectedTemplate === tmpl.id;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`cursor-pointer rounded-2xl p-2.5 border-2 transition-all ${
                    isSelected 
                      ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-extrabold text-xs text-slate-900">{tmpl.name}</span>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                      {tmpl.badge}
                    </span>
                  </div>
                  
                  {/* Miniature Thumbnail */}
                  <div className="h-14 rounded-lg bg-slate-100 border border-slate-200 p-1 flex gap-1 overflow-hidden">
                    {tmpl.id === 'gengar' ? (
                      <>
                        <div className="w-1/3 rounded bg-blue-600 h-full"></div>
                        <div className="w-2/3 space-y-1 py-0.5">
                          <div className="h-1 bg-slate-300 rounded w-full"></div>
                          <div className="h-1 bg-slate-300 rounded w-4/5"></div>
                          <div className="h-1 bg-slate-300 rounded w-3/5"></div>
                        </div>
                      </>
                    ) : tmpl.id === 'azurill' ? (
                      <div className="w-full space-y-1 py-0.5 text-center">
                        <div className="h-1.5 bg-slate-400 rounded w-1/2 mx-auto"></div>
                        <div className="h-1 bg-slate-300 rounded w-full"></div>
                        <div className="h-1 bg-slate-300 rounded w-4/5 mx-auto"></div>
                      </div>
                    ) : tmpl.id === 'onix' ? (
                      <div className="w-full bg-slate-800 rounded p-1 space-y-1">
                        <div className="h-1.5 bg-emerald-500 rounded w-1/3"></div>
                        <div className="h-1 bg-slate-600 rounded w-full"></div>
                        <div className="h-1 bg-slate-600 rounded w-4/5"></div>
                      </div>
                    ) : (
                      <div className="w-full grid grid-cols-2 gap-1 py-0.5">
                        <div className="h-1.5 bg-blue-500 rounded col-span-2"></div>
                        <div className="h-1 bg-slate-300 rounded"></div>
                        <div className="h-1 bg-slate-300 rounded"></div>
                      </div>
                    )}
                  </div>

                  <p className="text-[9px] text-slate-500 mt-1 leading-snug">{tmpl.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ================= MODAL: RESUME AI TOOLS ================= */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="text-purple-600" size={20} />
                <h3 className="font-extrabold text-slate-900 text-base">Resume AI Optimization</h3>
              </div>
              <button onClick={() => setAiModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Upgrade raw bullet points into STAR-method metrics or automatically synthesize a professional summary.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase">Input Bullet Point or Project Statement:</label>
              <textarea
                rows={3}
                placeholder="e.g. Worked on an API and made the queries faster..."
                className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                value={aiInputText}
                onChange={e => setAiInputText(e.target.value)}
              />

              <div className="flex space-x-2">
                <button
                  onClick={handleEnhanceBullet}
                  disabled={aiLoading || !aiInputText.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition flex-1 disabled:opacity-50"
                >
                  {aiLoading ? "Optimizing..." : "⚡ Enhance with STAR Metrics"}
                </button>
                <button
                  onClick={handleGenerateSummary}
                  disabled={aiLoading}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
                >
                  Generate Summary
                </button>
              </div>

              {aiEnhancedText && (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 space-y-2 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-purple-700 uppercase">STAR Optimized Version:</span>
                    <span className="text-[10px] bg-purple-200 text-purple-900 font-bold px-2 py-0.5 rounded">Action Verb: {aiEnhancedText.action_verb}</span>
                  </div>
                  <p className="text-xs text-purple-900 font-medium leading-relaxed">{aiEnhancedText.enhanced}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiEnhancedText.enhanced);
                      alert("Copied enhanced bullet point to clipboard!");
                    }}
                    className="text-[11px] font-bold text-purple-700 underline pt-1 block"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REAL ATS AUDIT & FEEDBACK ================= */}
      {feedbackModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="text-blue-600" size={22} />
                <h3 className="font-extrabold text-slate-900 text-base">Authentic ATS Resume Audit</h3>
              </div>
              <button onClick={() => setFeedbackModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            {atsFeedback ? (
              <div className="space-y-5">
                {/* Score Dial */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 text-center space-y-2">
                  <div className="text-4xl font-black">{atsFeedback.ats_score} / 100</div>
                  <div className="text-xs font-bold text-blue-200 uppercase tracking-widest">{atsFeedback.verdict}</div>
                  <p className="text-[11px] text-blue-300">Target Role: <span className="font-bold text-white">{initialTargetRole}</span></p>
                </div>

                {/* Sub-Score Diagnostics */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sub-Score Diagnostics:</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-50 border p-2.5 rounded-xl text-center">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Contact Info</div>
                      <div className="text-base font-black text-slate-900">{atsFeedback.breakdown.contact} / 15</div>
                    </div>
                    <div className="bg-slate-50 border p-2.5 rounded-xl text-center">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Section Depth</div>
                      <div className="text-base font-black text-slate-900">{atsFeedback.breakdown.sections} / 25</div>
                    </div>
                    <div className="bg-slate-50 border p-2.5 rounded-xl text-center">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Role Skill Fit</div>
                      <div className="text-base font-black text-slate-900">{atsFeedback.breakdown.skills} / 25</div>
                    </div>
                    <div className="bg-slate-50 border p-2.5 rounded-xl text-center">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">STAR & Metrics</div>
                      <div className="text-base font-black text-slate-900">{atsFeedback.breakdown.metrics} / 20</div>
                    </div>
                    <div className="bg-slate-50 border p-2.5 rounded-xl text-center col-span-2 sm:col-span-2">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Formatting & Length</div>
                      <div className="text-base font-black text-slate-900">{atsFeedback.breakdown.formatting} / 15</div>
                    </div>
                  </div>
                </div>

                {/* Strengths */}
                {atsFeedback.strengths.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-1.5">
                    <span className="text-xs font-bold text-emerald-800 uppercase flex items-center space-x-1.5">
                      <CheckCircle2 size={14} />
                      <span>Verified Strengths</span>
                    </span>
                    <ul className="text-xs text-emerald-900 space-y-1 list-disc list-inside">
                      {atsFeedback.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1.5">
                  <span className="text-xs font-bold text-amber-800 uppercase flex items-center space-x-1.5">
                    <AlertCircle size={14} />
                    <span>Actionable Recommendations to Reach 95+ ATS</span>
                  </span>
                  <ul className="text-xs text-amber-900 space-y-1 list-disc list-inside">
                    {atsFeedback.recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-500 font-medium">Evaluating current resume draft against target role...</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
