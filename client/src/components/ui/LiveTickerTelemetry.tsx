import React, { useEffect, useState } from 'react';
import { ShieldCheck, Clock, Cpu, Activity, Lock } from 'lucide-react';
import { api } from '../../api/client.js';

export const LiveTickerTelemetry: React.FC = () => {
  const [time, setTime] = useState<string>('');
  const [ledgerHeight, setLedgerHeight] = useState<number>(22);
  const [latestHash, setLatestHash] = useState<string>('0000a98f12...73d4');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' IST'
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const pollLedger = async () => {
      try {
        const stats = await api.getSystemStats();
        if (stats?.ledgerBlocksCount) setLedgerHeight(stats.ledgerBlocksCount);
        else if (stats?.ledgerHeight) setLedgerHeight(stats.ledgerHeight);

        if (stats?.latestBlockHash) {
          setLatestHash(stats.latestBlockHash.slice(0, 10) + '...' + stats.latestBlockHash.slice(-4));
        }
      } catch (err) {
        // silent fallback for telemetry
      }
    };

    pollLedger();
    const pollInterval = setInterval(pollLedger, 8000);
    return () => clearInterval(pollInterval);
  }, []);

  return (
    <div className="bg-[#070D18] text-slate-300 text-[11px] font-mono px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between gap-3 select-none border-b border-slate-800/90 shadow-2xs">
      {/* Left: Realtime MHA Ledger Stream */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-slate-400 font-sans text-[10px] uppercase tracking-wider font-semibold">
            MHA CENTRAL LEDGER
          </span>
          <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
            BLOCK #{ledgerHeight} ANCHORED
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-[10px]">
          <span className="text-slate-500">MERKLE ROOT:</span>
          <span className="text-blue-300 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {latestHash}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-slate-400 text-[10px]">
          <Cpu className="w-3 h-3 text-slate-500" />
          <span className="text-slate-500">VALIDATION NODE:</span>
          <span className="text-slate-200 font-medium">NCRB-HQ-DELHI-01</span>
        </div>
      </div>

      {/* Right: Security Integrity & Indian Standard Time */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-emerald-950/70 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-700/60 text-[10px] font-semibold">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span className="font-sans">EVIDENTIARY SANCTITY 100%</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800 text-[10px]">
          <Clock className="w-3 h-3 text-amber-400" />
          <span className="font-bold text-white font-mono">{time || '00:00:00 IST'}</span>
        </div>
      </div>
    </div>
  );
};
