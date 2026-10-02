import React, { useState } from 'react';
import { 
  X, 
  Package, 
  Download, 
  CheckSquare, 
  Square, 
  ShieldCheck, 
  FileText, 
  Database, 
  Clock, 
  Key, 
  FileCheck, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  FolderArchive
} from 'lucide-react';
import { api } from '../../api/client';
import { EvidencePackageOptions } from '../../types';

interface EvidencePackageExportModalProps {
  caseId: string;
  caseNumber: string;
  onClose: () => void;
}

export const EvidencePackageExportModal: React.FC<EvidencePackageExportModalProps> = ({
  caseId,
  caseNumber,
  onClose
}) => {
  const [options, setOptions] = useState<EvidencePackageOptions>({
    includeCaseInfo: true,
    includeDocuments: true,
    includeEvidence: true,
    includeCustodyHistory: true,
    includeAuditTrail: true,
    includeSignatures: true,
    includeIntegrityManifest: true
  });

  const [exporting, setExporting] = useState<boolean>(false);
  const [exportComplete, setExportComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const toggleOption = (key: keyof EvidencePackageOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = (enable: boolean) => {
    setOptions({
      includeCaseInfo: enable,
      includeDocuments: enable,
      includeEvidence: enable,
      includeCustodyHistory: enable,
      includeAuditTrail: enable,
      includeSignatures: enable,
      includeIntegrityManifest: true // always recommended
    });
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);
      await api.exportEvidencePackage(caseId, options);
      setExportComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate evidence package');
    } finally {
      setExporting(false);
    }
  };

  const exportItems = [
    {
      key: 'includeCaseInfo' as const,
      label: 'Case Overview & Registration Docket',
      desc: 'case_info.json containing FIR facts, police station, statutory acts/sections',
      icon: <FileText className="w-4 h-4 text-blue-600" />
    },
    {
      key: 'includeDocuments' as const,
      label: 'Document Files & Version Manifest',
      desc: 'Stored evidentiary documents in documents/ directory plus documents_manifest.json',
      icon: <FolderArchive className="w-4 h-4 text-indigo-600" />
    },
    {
      key: 'includeEvidence' as const,
      label: 'Physical & Digital Evidence Exhibits',
      desc: 'evidence_manifest.json with locker locations, descriptions, and seizure hashes',
      icon: <Database className="w-4 h-4 text-purple-600" />
    },
    {
      key: 'includeCustodyHistory' as const,
      label: 'Complete Chain of Custody History',
      desc: 'custody_history.json detailing all transfers, custodians, timestamps, and proofs',
      icon: <Clock className="w-4 h-4 text-amber-600" />
    },
    {
      key: 'includeAuditTrail' as const,
      label: 'Cryptographic Audit Trail',
      desc: 'audit_trail.json recording all access, edits, and verification events for this case',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />
    },
    {
      key: 'includeSignatures' as const,
      label: 'Digital Signatures & Certificates',
      desc: 'digital_signatures.json containing ECDSA signature values and public certs',
      icon: <Key className="w-4 h-4 text-cyan-600" />
    },
    {
      key: 'includeIntegrityManifest' as const,
      label: 'SHA-256 Hash Manifest & Verification Report',
      desc: 'hash_manifest.sha256 compatible with sha256sum plus verification_report.json',
      icon: <FileCheck className="w-4 h-4 text-rose-600" />
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Export Comprehensive Evidence Package
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Case Docket: <span className="font-semibold text-slate-700">{caseNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legal Explanatory Banner */}
        <div className="px-6 py-2.5 bg-blue-50 border-b border-blue-200 flex items-center space-x-2 text-xs text-blue-900">
          <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            Compiles a sovereign, self-contained forensic ZIP archive containing evidence documents, metadata manifests, 
            and a root SHA-256 integrity seal for judicial filing under Section 63 BSA / IT Act.
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {exportComplete ? (
            <div className="py-8 text-center space-y-4 bg-white p-6 rounded-xl border border-emerald-200">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Evidence Package Successfully Compiled!</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Your browser has downloaded the cryptographic evidence archive. 
                  You can verify all enclosed files using standard <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">sha256sum -c hash_manifest.sha256</code>.
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close Wizard
              </button>
            </div>
          ) : (
            <>
              {/* Options selection controls */}
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="font-semibold text-slate-700 uppercase tracking-wider">
                  Select Included Components
                </span>
                <div className="space-x-2">
                  <button
                    onClick={() => selectAll(true)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => selectAll(false)}
                    className="text-slate-500 hover:text-slate-700 font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Checklist items */}
              <div className="space-y-2.5">
                {exportItems.map(item => {
                  const isChecked = options[item.key];
                  return (
                    <div
                      key={item.key}
                      onClick={() => toggleOption(item.key)}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-start space-x-3 bg-white ${
                        isChecked
                          ? 'border-blue-300 shadow-sm'
                          : 'border-slate-200 opacity-60 hover:opacity-80'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {item.icon}
                          <span className="text-xs font-bold text-slate-800">{item.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!exportComplete && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={exporting}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || !Object.values(options).some(Boolean)}
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center space-x-2 shadow-sm transition-all disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Compiling ZIP Package & Digest...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Generate & Download Evidence Package (.zip)</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
