import React from 'react';
import { Target, CheckCircle2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  currentRole: string;
  onSelectRole: (role: string) => void;
  onClose: () => void;
}

const PRESET_ROLES = [
  { role: "Software Development Engineer (SDE)", desc: "Core algorithms, distributed systems, Java/Python, and scalable cloud services." },
  { role: "AI & Machine Learning Engineer", desc: "PyTorch/TensorFlow, deep learning pipelines, computer vision, and model deployment." },
  { role: "Full-Stack Web Developer", desc: "React, Node.js/FastAPI, modern responsive interfaces, and REST APIs." },
  { role: "Cloud & DevOps Engineer", desc: "AWS/Azure, Docker, Kubernetes, CI/CD automation, and Linux infrastructure." },
  { role: "Data Analyst / Data Scientist", desc: "SQL, Pandas, PowerBI, statistical analytics, and predictive modeling." },
  { role: "Embedded Systems & IoT Engineer", desc: "C/C++, microcontrollers, RTOS, VLSI, and hardware-software firmware." }
];

export const TargetRoleModal: React.FC<Props> = ({ isOpen, currentRole, onSelectRole, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex justify-between items-start">
          <div>
            <div className="inline-flex items-center space-x-1.5 bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full mb-2">
              <Target size={13} />
              <span>Step 2: AI Career Navigation</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Select Your Target Career Role</h3>
            <p className="text-xs text-slate-500 mt-1">Our agent will prioritize campus drives and tailor your skill-gap roadmap for this choice.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {PRESET_ROLES.map((r, i) => {
            const isSelected = currentRole.toLowerCase() === r.role.toLowerCase();
            return (
              <button
                key={i}
                onClick={() => {
                  onSelectRole(r.role);
                  onClose();
                }}
                className={`text-left p-4 rounded-2xl border transition relative flex flex-col justify-between ${
                  isSelected 
                    ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs text-slate-900">{r.role}</span>
                    {isSelected && <CheckCircle2 size={16} className="text-blue-600 flex-shrink-0 ml-1" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{r.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
