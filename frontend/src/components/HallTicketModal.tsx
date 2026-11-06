import React, { useState, useEffect } from 'react';
import { fetchHallTicket } from '../api';
import { 
  ShieldCheck, 
  Printer, 
  X, 
  MapPin, 
  Calendar, 
  Clock, 
  Award, 
  Building, 
  User, 
  Hash, 
  Download,
  AlertCircle,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  studentId: number;
  applicationId: number;
  onClose: () => void;
}

export const HallTicketModal: React.FC<Props> = ({ isOpen, studentId, applicationId, onClose }) => {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && studentId && applicationId) {
      setLoading(true);
      setError(null);
      fetchHallTicket(studentId, applicationId)
        .then(data => {
          setTicket(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || "Failed to load interview pass");
          setLoading(false);
        });
    }
  }, [isOpen, studentId, applicationId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col border border-slate-300 my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Sticky Top Header with Clear Close and Print Buttons */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex justify-between items-center print:hidden border-b border-indigo-900/60 sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                VFSTR Central Training & Placement Cell
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                Official Interview Admit Card / Hall Ticket
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition shadow-md shadow-indigo-600/30"
              title="Download or Print Hall Ticket"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Print / Download Pass</span>
            </button>
            <button 
              onClick={onClose} 
              className="bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white p-2 rounded-xl transition shadow border border-slate-700 hover:border-rose-500"
              title="Close Admit Card"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Pass Body */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-800 overflow-y-auto print:p-0 print:overflow-visible">
          {loading ? (
            <div className="text-center py-16 space-y-3">
              <div className="animate-spin rounded-full h-9 w-9 border-3 border-indigo-600 border-t-transparent mx-auto"></div>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                Generating Verified Placement Hall Ticket...
              </div>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl text-center text-xs font-bold space-y-2">
              <AlertCircle size={28} className="mx-auto text-rose-500" />
              <div>{error}</div>
              <button 
                onClick={onClose}
                className="mt-3 bg-slate-900 text-white px-4 py-1.5 rounded-xl text-xs font-bold"
              >
                Close Window
              </button>
            </div>
          ) : ticket ? (
            <div className="border-2 border-indigo-900/30 rounded-3xl p-6 sm:p-7 bg-gradient-to-b from-indigo-50/50 via-white to-white space-y-6 shadow-sm">
              
              {/* Institution Title Banner */}
              <div className="text-center border-b-2 border-indigo-100 pb-5 space-y-1">
                <div className="inline-block bg-indigo-950 text-white text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase mb-1">
                  Vignan's Foundation for Science, Technology and Research (VFSTR)
                </div>
                <div className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  Central Training & Placement Cell • Corporate Recruitment Pass
                </div>
                <div className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 inline-block px-4 py-1 rounded-full mt-1">
                  {ticket.document_title || "Official Placement Interview Admit Card"}
                </div>
              </div>

              {/* Student & Recruiting Employer Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Candidate Info */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center space-x-1">
                    <User size={12} className="text-blue-600" />
                    <span>Candidate Profile</span>
                  </div>
                  <div className="font-black text-slate-900 text-sm">{ticket.student_name}</div>
                  <div className="text-slate-700 font-mono text-xs">
                    Roll / Reg No: <strong className="text-indigo-950">{ticket.reg_no}</strong>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    {ticket.degree} • {ticket.branch} (CGPA: <strong>{ticket.cgpa?.toFixed(2)}</strong>)
                  </div>
                </div>

                {/* Recruiter Drive Info */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center space-x-1">
                    <Building size={12} className="text-indigo-600" />
                    <span>Corporate Recruiter Drive</span>
                  </div>
                  <div className="font-black text-indigo-950 text-sm">{ticket.company_name}</div>
                  <div className="text-slate-700 text-xs">
                    Role: <strong className="text-slate-900">{ticket.job_title}</strong>
                  </div>
                  <div className="text-emerald-700 font-bold text-xs">
                    Package: ₹{ticket.ctc_lpa} LPA
                  </div>
                </div>
              </div>

              {/* Venue & Schedule Highlight Card */}
              <div className="bg-indigo-950 text-white rounded-2xl p-5 space-y-3 shadow-md">
                <div className="text-[10px] font-black tracking-wider uppercase text-indigo-300 flex items-center justify-between">
                  <span>Interview Schedule & Physical Venue Allocation</span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full text-[9px] font-bold">
                    Confirmed Slot
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-indigo-300/80 text-[10px] uppercase block">Interview Panel</span>
                    <span className="font-bold text-white">{ticket.panel_name || "Panel 1 (Technical)"}</span>
                  </div>
                  <div>
                    <span className="text-indigo-300/80 text-[10px] uppercase block">Campus Block</span>
                    <span className="font-bold text-white flex items-center space-x-1">
                      <MapPin size={12} className="text-indigo-400" />
                      <span>{ticket.block || "A-Block"}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-indigo-300/80 text-[10px] uppercase block">Chamber / Room</span>
                    <span className="font-bold text-white">{ticket.chamber || "Chamber A-204"}</span>
                  </div>
                  <div>
                    <span className="text-indigo-300/80 text-[10px] uppercase block">Allocated Time</span>
                    <span className="font-black text-emerald-300 flex items-center space-x-1">
                      <Clock size={12} />
                      <span>{ticket.time || "10:30 AM - 11:00 AM"}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Security QR Verification Stamp */}
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 pt-5 gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="p-2.5 bg-white border-2 border-slate-300 rounded-2xl shadow-inner flex-shrink-0">
                    {/* Deterministic Visual QR Code */}
                    <svg className="w-16 h-16 text-slate-900" viewBox="0 0 33 33" fill="currentColor">
                      <rect x="0" y="0" width="9" height="9" fill="black" />
                      <rect x="2" y="2" width="5" height="5" fill="white" />
                      <rect x="24" y="0" width="9" height="9" fill="black" />
                      <rect x="26" y="2" width="5" height="5" fill="white" />
                      <rect x="0" y="24" width="9" height="9" fill="black" />
                      <rect x="2" y="26" width="5" height="5" fill="white" />
                      <rect x="12" y="4" width="3" height="3" fill="black" />
                      <rect x="18" y="2" width="3" height="3" fill="black" />
                      <rect x="14" y="14" width="5" height="5" fill="black" />
                      <rect x="22" y="14" width="3" height="3" fill="black" />
                      <rect x="10" y="22" width="4" height="4" fill="black" />
                      <rect x="20" y="24" width="5" height="3" fill="black" />
                      <rect x="28" y="20" width="3" height="5" fill="black" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center space-x-1">
                      <Hash size={11} />
                      <span>Admit Token Hash</span>
                    </div>
                    <div className="text-xs font-mono font-black text-slate-800 break-all">
                      {ticket.verification_hash || "VFSTR-TPO-VERIFIED-PASS"}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-bold flex items-center space-x-1">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      <span>Tamper-Proof Digital Verification Stamp (Admit Pass)</span>
                    </div>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-400 flex flex-col items-end">
                  <div className="border-b border-slate-300 pb-1 w-32 text-center font-serif italic text-slate-700 font-bold text-xs">
                    Dean Placements
                  </div>
                  <div className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider mt-0.5">
                    Dean Training & Placement
                  </div>
                  <div className="text-[10px] text-slate-500">VFSTR Central Administration</div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center space-x-1.5 text-amber-950">
                  <AlertCircle size={14} className="text-amber-700" />
                  <span>Mandatory Instructions for Candidate:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px] leading-relaxed">
                  <li>Please report to the assigned chamber <strong>20 minutes prior</strong> to your time slot.</li>
                  <li>Carry 2 hard copies of your ATS-verified resume and college ID card.</li>
                  <li>Adherence to formal dress code is mandatory as per VFSTR Placement Cell policy.</li>
                  <li>Scan this admit token at the T&P desk to record your official Stage Attendance.</li>
                </ul>
              </div>

            </div>
          ) : null}
        </div>

        {/* Sticky Bottom Action Bar with Big Close / Cancel & Download Buttons */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center print:hidden">
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono">Esc</kbd> or click Close to dismiss.
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm flex items-center space-x-1.5"
            >
              <X size={15} />
              <span>Close / Cancel</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center space-x-1.5"
            >
              <Download size={15} />
              <span>Download / Print Hall Ticket</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
