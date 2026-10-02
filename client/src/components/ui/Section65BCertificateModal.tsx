import React, { useState } from 'react';
import { Modal } from '../common/Modal.js';
import { ShieldCheck, Printer, Award, QrCode } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Section65BCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentData: any;
  versionData: any;
  officerName: string;
  officerRole: string;
  officerOrg: string;
}

export const Section65BCertificateModal: React.FC<Section65BCertificateModalProps> = ({
  isOpen,
  onClose,
  documentData,
  versionData,
  officerName,
  officerRole,
  officerOrg,
}) => {
  const [certified, setCertified] = useState(false);

  const certNumber = `CERT-65B-${Date.now().toString().slice(-6)}-${versionData?.versionNumber || 1}`;
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const handleIssueCertificate = () => {
    setCertified(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ff9933', '#10b981', '#3b82f6', '#f59e0b'],
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Section 65B / Section 63 BSA Evidentiary Certificate of Admissibility"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6 text-xs text-slate-800">
        {/* Printable Certificate Frame */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 relative overflow-hidden shadow-lg space-y-5">
          {/* Top Hologram Strip */}
          <div className="h-1.5 w-full hologram-seal rounded-t-lg -mt-6 -mx-6 mb-4" />

          {/* Certificate Header */}
          <div className="text-center space-y-1.5 pb-4 border-b border-slate-100">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-bold">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>STATUTORY EVIDENTIARY CERTIFICATE</span>
            </div>
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wider font-sans">
              CERTIFICATE OF ADMISSIBILITY OF ELECTRONIC RECORD
            </h2>
            <p className="text-[11px] text-slate-500">
              (Issued pursuant to Section 65B(4) of the Indian Evidence Act, 1872 / Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023)
            </p>
          </div>

          {/* Certificate Details Body */}
          <div className="space-y-3.5 leading-relaxed text-slate-700 font-sans text-xs">
            <p>
              I, <strong className="text-slate-900 font-bold">{officerName}</strong>, holding the position of{' '}
              <strong className="text-blue-600 font-bold">{officerRole}</strong> at{' '}
              <strong className="text-slate-800 font-bold">{officerOrg}</strong>, having lawful custody and management of the secure digital computerized document system, do hereby solemnly certify and state as under:
            </p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 font-mono text-[11px]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[10px]">Certificate Reference:</span>
                  <strong className="text-amber-700">{certNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Date of Issue:</span>
                  <strong className="text-slate-800">{currentDate}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-500 block text-[10px]">Document Identification:</span>
                  <strong className="text-blue-700">{documentData?.documentNumber} (v{versionData?.versionNumber})</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Associated Case Docket:</span>
                  <strong className="text-slate-800">{documentData?.caseNumber}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-slate-500 block text-[10px]">SHA-256 Cryptographic Hash Digest:</span>
                <span className="text-emerald-700 font-bold break-all">{versionData?.sha256Hash}</span>
              </div>
            </div>

            <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-600">
              <li>
                The electronic record described above was produced during the ordinary course of official duties by lawful digital recording systems operating with cryptographic SHA-256 integrity controls.
              </li>
              <li>
                Throughout the material period, the computerized document repository was operating properly, and the cryptographic hash verified that the contents have not been altered or tampered with since creation.
              </li>
              <li>
                This electronic output is an authentic and true copy of the electronic record stored in the immutable Government Merkle Ledger.
              </li>
            </ol>
          </div>

          {/* Certificate Footer Stamp & Signatures */}
          <div className="pt-4 border-t border-slate-100 flex items-end justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 p-1 flex items-center justify-center text-slate-400 shadow-xs">
                <QrCode className="w-10 h-10 text-slate-800" />
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                <p>Digital QR Verification</p>
                <p className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Valid & Authentic
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-[11px] space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                DIGITALLY CERTIFIED (SEC 65B)
              </span>
              <p className="font-bold text-slate-900 text-xs">{officerName}</p>
              <p className="text-slate-600">{officerRole}</p>
              <p className="text-slate-400 text-[10px]">{officerOrg}</p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-all"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {!certified ? (
              <button
                type="button"
                onClick={handleIssueCertificate}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Issue & Sign Section 65B Certificate</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Certificate</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
