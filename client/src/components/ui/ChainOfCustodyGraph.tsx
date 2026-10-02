import React from 'react';
import { Shield, User, MapPin, CheckCircle2, Lock } from 'lucide-react';

interface CustodyEventNode {
  id: string;
  eventType: string;
  fromCustodian: string;
  toCustodian: string;
  fromLocation: string;
  toLocation: string;
  purpose: string;
  timestamp: string;
  merkleProof?: string;
}

interface ChainOfCustodyGraphProps {
  events: CustodyEventNode[];
  initialCustodian: string;
  initialLocation: string;
  initialDate: string;
  isLegalHold: boolean;
}

export const ChainOfCustodyGraph: React.FC<ChainOfCustodyGraphProps> = ({
  events,
  initialCustodian,
  initialLocation,
  initialDate,
  isLegalHold,
}) => {
  return (
    <div className="space-y-4 text-xs text-slate-800">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Visual Chain of Custody Transfer Nodes
          </h3>
        </div>
        {isLegalHold && (
          <span className="status-pill-amber text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Lock className="w-3 h-3" />
            EVIDENTIARY LOCK
          </span>
        )}
      </div>

      {/* Nodes Container */}
      <div className="relative pl-6 space-y-5 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-amber-400 before:via-blue-500 before:to-emerald-500">
        {/* Origin Node 0 */}
        <div className="relative group">
          <span className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-amber-50 border-2 border-amber-500 flex items-center justify-center text-[9px] font-bold text-amber-700 shadow-xs">
            0
          </span>
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700">Initial Seizure & Registration</span>
              <span className="text-[10px] font-mono text-slate-400">{new Date(initialDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Seizing Officer: <strong className="text-slate-900">{initialCustodian}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Storage: <strong className="text-slate-900">{initialLocation}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Transfer Nodes 1..N */}
        {events.map((ev, idx) => (
          <div key={ev.id} className="relative group">
            <span className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-blue-50 border-2 border-blue-600 flex items-center justify-center text-[9px] font-bold text-blue-700 shadow-xs">
              {idx + 1}
            </span>
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700">{ev.eventType}</span>
                <span className="text-[10px] font-mono text-slate-400">{new Date(ev.timestamp).toLocaleString('en-IN')}</span>
              </div>

              <p className="text-[11px] text-slate-700">{ev.purpose}</p>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                <div>
                  <span className="text-slate-400 block">From Custodian:</span>
                  <span className="text-slate-800 font-semibold">{ev.fromCustodian} ({ev.fromLocation})</span>
                </div>
                <div>
                  <span className="text-slate-400 block">To Custodian:</span>
                  <span className="text-emerald-700 font-bold">{ev.toCustodian} ({ev.toLocation})</span>
                </div>
              </div>

              {ev.merkleProof && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Merkle Proof: {ev.merkleProof.slice(0, 24)}...</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
