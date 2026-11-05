import React, { useState, useEffect } from 'react';
import { fetchHallTicket } from '../api';
import { ShieldCheck, Printer, X, MapPin, Calendar, Clock, Award, Building, User, Hash } from 'lucide-react';

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
          setError(err.message || "Failed to generate hall ticket");
          setLoading(false);
        });
    }
  }, [isOpen, studentId, applicationId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 flex justify-between items-start print:hidden">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-indigo-300">Official Admit Card</div>
              <h3 className="text-lg font-black tracking-tight">Interview Hall Ticket</h3>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition shadow"
            >
              <Printer size={14} />
              <span>Print Pass</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Pass Body */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-800 print:p-0">
          {loading ? (
            <div className="text-center py-16 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto"></div>
              <div className="text-xs text-slate-500 font-medium">Generating verified placement hall ticket...</div>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-800 p-6 rounded-2xl text-center text-xs font-bold">
              {error}
            </div>
          ) : ticket ? (
            <div className="border-2 border-indigo-950/20 rounded-2xl p-6 bg-gradient-to-b from-indigo-50/40 via-white to-white space-y-6">
              
              {/* Institution Title */}
              <div className="text-center border-b border-indigo-100 pb-4">
                <div className="text-[11px] font-black tracking-widest text-indigo-950 uppercase">
                  {ticket.institution}
                </div>
                <div className="text-xs font-bold text-slate-600 mt-0.5">Central Training & Placement Cell</div>
                <div className="text-sm font-black text-indigo-900 mt-2 bg-indigo-100/70 inline-block px-4 py-1 rounded-full uppercase tracking-wide">
                  {ticket.document_title}
                </div>
              </div>

              {/* Student & Recruitment Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center space-x-1">
                    <User size={11} />
                    <span>Candidate Name</span>
                  </div>
                  <div className="font-extrabold text-slate-900 text-sm">{ticket.student_name}</div>
                  <div className="text-slate-600 font-mono">Reg No: <b>{ticket.reg_no}</b></div>
                  <div className="text-slate-600">{ticket.degree} • {ticket.branch} (CGPA: {ticket.cgpa})</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center space-x-1">
                    <Building size={11} />
                    <span>Recruiting Employer</span>
                  </div>
                  <div className="font-extrabold text-indigo-950 text-sm">{ticket.company_name}</div>
                  <div className="text-slate-600">Role: <b>{ticket.job_title}</b></div>
                  <div className="text-emerald-700 font-bold">Package: {ticket.ctc_lpa} LPA</div>
                </div>
              </div>

              {/* Interview Slot & Venue Matrix */}
              <div className="bg-indigo-950 text-white rounded-2xl p-5 space-y-3 shadow-md">
                <div className="text-[10px] font-black tracking-wider uppercase text-indigo-300">
                  Allocated Venue & Slot Details
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-indigo-300/80 text-[10px] uppercase block">Panel</span>
                    <span className="font-bold">{ticket.panel_name}</span>
                  </div>
                  <div>
                    <span className="text-indigo-300/80 text-[10px] uppercase block">Venue / Block</span>
                    <span className="font-bold flex items-center space-x-1">
                      <MapPin size={11} className="text-indigo-400" />
                      <span>{ticket.block}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-indigo-300/80 text-[10px] uppercase block">Chamber</span>
                    <span className="font-bold">{ticket.chamber}</span>
                  </div>
                  <div>
                    <span className="text-indigo-300/80 text-[10px] uppercase block">Date & Time</span>
                    <span className="font-bold text-emerald-300 flex items-center space-x-1">
                      <Clock size={11} />
                      <span>{ticket.time}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Security QR Verification Stamp */}
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 pt-4 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white border-2 border-slate-300 rounded-xl shadow-inner">
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
                      <Hash size={10} />
                      <span>Admit Token Hash</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-800">{ticket.verification_hash}</div>
                    <div className="text-[10px] text-emerald-600 font-bold flex items-center space-x-1">
                      <ShieldCheck size={11} />
                      <span>Tamper-Proof Digital Verification Stamp</span>
                    </div>
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-400">
                  <div>Dean Training & Placement</div>
                  <div className="font-bold text-slate-700">VFSTR Administration</div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
                <div className="font-bold">Instructions for Candidate:</div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  {ticket.instructions?.map((inst: string, idx: number) => (
                    <li key={idx}>{inst}</li>
                  ))}
                </ul>
              </div>

            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
};
