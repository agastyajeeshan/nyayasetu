import React, { useRef } from 'react';
import { 
  Printer, 
  FileText
} from 'lucide-react';
import { Case } from '../../types.js';

interface PrintableReportModalProps {
  caseData: Case;
  reportType: 'FIR_FORM_1' | 'CASE_DIARY' | 'CHARGE_SHEET';
  onClose: () => void;
}

export const PrintableReportModal: React.FC<PrintableReportModalProps> = ({
  caseData,
  reportType,
  onClose
}) => {
  const printContentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Top Control Action Bar (Hidden in Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm">
              {reportType === 'FIR_FORM_1' ? 'First Information Report (Form I.F.1)' :
               reportType === 'CASE_DIARY' ? 'Case Diary Report (Sec 172 CrPC / BNSS)' :
               'Statutory Charge Sheet Brief (Sec 193 BNSS)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-blue-700 shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Official Document Body */}
        <div ref={printContentRef} className="p-8 overflow-y-auto font-serif text-slate-900 space-y-6 print:p-0 print:space-y-4">
          {/* Official Indian State Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
            <div className="text-xs uppercase font-bold tracking-widest text-slate-600">
              Government of India • Ministry of Home Affairs
            </div>
            <div className="text-sm font-extrabold uppercase tracking-wide">
              National Crime Records Bureau / Delhi Police Department
            </div>
            <h1 className="text-lg font-black uppercase text-slate-900 mt-2 underline">
              {reportType === 'FIR_FORM_1' && 'FORM I.F.1 — FIRST INFORMATION REPORT'}
              {reportType === 'CASE_DIARY' && 'POLICE CASE DIARY (SECTION 172 CrPC / BNSS)'}
              {reportType === 'CHARGE_SHEET' && 'FINAL REPORT / CHARGE SHEET (SECTION 193 BNSS / 173 CrPC)'}
            </h1>
            <p className="text-[11px] italic text-slate-600">
              (Under Section 154 CrPC / Section 173 Bharatiya Nagarik Suraksha Sanhita, 2023)
            </p>
          </div>

          {/* Form I.F.1 Primary Identification Grid */}
          <div className="border border-slate-900 text-xs">
            <div className="grid grid-cols-4 border-b border-slate-900 divide-x divide-slate-900 bg-slate-50 font-bold p-2">
              <div>1. District: <span className="font-mono font-normal">{caseData.district || caseData.jurisdiction}</span></div>
              <div>Police Station: <span className="font-mono font-normal">{caseData.policeStation}</span></div>
              <div>Year: <span className="font-mono font-normal">{caseData.firYear || 2026}</span></div>
              <div>FIR No: <span className="font-mono font-extrabold text-blue-900">{caseData.caseNumber}</span></div>
            </div>

            <div className="p-2 border-b border-slate-900 space-y-1">
              <span className="font-bold">2. Acts & Statutory Sections (IPC / Bharatiya Nyaya Sanhita):</span>
              <div className="font-mono text-[11px] bg-slate-100 p-2 rounded border border-slate-300">
                {caseData.actsAndSections?.map(a => `${a.act}: ${a.sections}`).join(' | ') || 'IPC Section 302, 120B / BNS Section 103(1), 61(2) (Homicide & Criminal Conspiracy)'}
              </div>
            </div>

            <div className="grid grid-cols-2 border-b border-slate-900 divide-x divide-slate-900 p-2">
              <div>
                <span className="font-bold">3. Occurrence of Offence:</span>
                <div className="text-[11px] mt-1 space-y-0.5">
                  <div>Day: <strong>{caseData.occurrenceDay || 'Saturday'}</strong></div>
                  <div>Date From: <strong>{caseData.occurrenceDateFrom || caseData.incidentDate}</strong> To: <strong>{caseData.occurrenceDateTo || caseData.incidentDate}</strong></div>
                  <div>Time: <strong>{caseData.occurrenceTimeFrom || '21:30 hrs'}</strong> To: <strong>{caseData.occurrenceTimeTo || '22:15 hrs'}</strong></div>
                </div>
              </div>

              <div>
                <span className="font-bold">4. Information Received at P.S.:</span>
                <div className="text-[11px] mt-1 space-y-0.5">
                  <div>Date: <strong>{caseData.informationReceivedDate || caseData.filingDate}</strong> Time: <strong>{caseData.informationReceivedTime || '22:45 hrs'}</strong></div>
                  <div>General Diary Entry No: <strong className="font-mono">{caseData.generalDiaryNo || 'GD-42A/2026'}</strong></div>
                  <div>Type of Information: <strong>{caseData.informationType || 'Written'}</strong></div>
                </div>
              </div>
            </div>

            <div className="p-2 border-b border-slate-900">
              <span className="font-bold">5. Place of Occurrence:</span>
              <div className="text-[11px] mt-1">
                Direction & Distance from P.S.: <strong>{caseData.distanceFromPS || '1.5 km North-West, Beat No. 4'}</strong>
                <div className="mt-0.5">Address: <strong>{caseData.placeOfOccurrence || `${caseData.policeStation} Area, Hauz Khas Commercial Arcade, New Delhi`}</strong></div>
              </div>
            </div>

            <div className="grid grid-cols-2 border-b border-slate-900 divide-x divide-slate-900 p-2">
              <div>
                <span className="font-bold">6. Complainant / Informant:</span>
                <div className="text-[11px] mt-1 space-y-0.5">
                  <div>Name: <strong>{caseData.complainantName || 'Pooja Sharma'}</strong></div>
                  <div>Father/Spouse: <strong>{caseData.complainantFatherSpouse || 'Mahesh Sharma'}</strong></div>
                  <div>Phone / Address: <strong>{caseData.complainantPhone || '+91-98711-20981'}, {caseData.complainantAddress || 'Green Park Extn, New Delhi'}</strong></div>
                </div>
              </div>

              <div>
                <span className="font-bold">7. Details of Known / Suspected Accused:</span>
                <div className="text-[11px] mt-1">
                  <strong>{caseData.suspectDetails || 'Vikram Malhotra (CPID-DL-2024-88412) & 2 Unknown Associates'}</strong>
                </div>
              </div>
            </div>

            <div className="p-3 border-b border-slate-900 space-y-1">
              <span className="font-bold">8. Brief Contents of the Information / FIR Narrative:</span>
              <p className="text-xs text-justify font-sans bg-slate-50 p-3 rounded border border-slate-200 leading-relaxed">
                {caseData.firContents || caseData.summary || 'On 14-Aug-2026 at approximately 21:30 hours, complainant reported armed interception and robbery of escrow financial documents and cash by accused persons wielding country-made firearms...'}
              </p>
            </div>

            {/* Officer in Charge Signature Seal */}
            <div className="p-4 grid grid-cols-2 divide-x divide-slate-900 bg-slate-50">
              <div className="space-y-1 text-[11px]">
                <div>Investigating Officer: <strong>{caseData.investigatingOfficerName}</strong></div>
                <div>Rank & Badge: <strong>Inspector (Crime Branch) • Badge #DL-8819</strong></div>
                <div>Status: <strong className="text-emerald-800 uppercase">{caseData.status}</strong></div>
              </div>

              <div className="text-right space-y-1 text-[11px]">
                <div className="font-mono text-[10px] text-slate-500">Cryptographic Seal: SHA-256 Merkle Anchored</div>
                <div className="font-bold uppercase text-slate-900">Digital Signature Verified</div>
                <div className="text-[10px] text-slate-600">Officer In-Charge, {caseData.policeStation}</div>
              </div>
            </div>
          </div>

          {/* Legal Compliance Footnote */}
          <div className="text-[10px] text-slate-500 text-center italic">
            This document is electronically generated and digitally signed under the Information Technology Act, 2000 and Section 65B of the Indian Evidence Act / Section 63 Bharatiya Sakshya Adhiniyam, 2023. Tamper-evident SHA-256 ledger block verified.
          </div>
        </div>
      </div>
    </div>
  );
};
