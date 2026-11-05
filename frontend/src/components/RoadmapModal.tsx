import React from 'react';
import { RoadmapData } from '../types';
import { X, Target, BookOpen, Clock, AlertTriangle } from 'lucide-react';

interface Props {
  data: RoadmapData | null;
  onClose: () => void;
}

export const RoadmapModal: React.FC<Props> = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2">
              <Target className="text-amber-400" size={20} />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">PS 15 AI Skill Gap Remediation</span>
            </div>
            <h3 className="text-xl font-bold mt-1">{data.target_job}</h3>
            <p className="text-sm text-blue-200 mt-0.5">Customized for {data.student_year} ({data.batch}) &bull; {data.company}</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Missing Skills Warning */}
          {data.missing_skills.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3">
              <AlertTriangle className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
              <div>
                <h4 className="text-sm font-bold text-amber-900">Identified Competency Gaps:</h4>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {data.missing_skills.map((s: string, i: number) => (
                    <span key={i} className="bg-amber-200 text-amber-800 text-xs px-2.5 py-1 rounded-md font-semibold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Roadmap Timeline */}
          <div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <BookOpen size={16} className="text-blue-600" />
              <span>Personalized Preparation Milestones</span>
            </h4>

            <div className="relative border-l-2 border-blue-200 ml-4 space-y-6">
              {data.roadmap.map((step: any, idx: number) => (
                <div key={idx} className="relative pl-6">
                  {/* Timeline dot */}
                  <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                    step.priority === 'Critical' || step.priority === 'Urgent' ? 'bg-red-500' : 'bg-blue-600'
                  }`} />
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm hover:border-blue-300 transition">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <Clock size={12} />
                        <span>{step.day}</span>
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        step.priority === 'Critical' || step.priority === 'Urgent' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {step.priority} Priority
                      </span>
                    </div>
                    <h5 className="font-semibold text-slate-900 text-sm mt-2">{step.title}</h5>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{step.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-5 py-2 rounded-lg transition"
          >
            Got it, Start Prep
          </button>
        </div>

      </div>
    </div>
  );
};
