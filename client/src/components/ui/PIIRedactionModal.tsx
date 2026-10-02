import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Download,
  Lock,
  ArrowRight,
  RefreshCw,
  Info,
  Hash
} from 'lucide-react';
import { api, API_BASE } from '../../api/client';
import { RedactedItem, RedactedDocument } from '../../types';

interface PIIRedactionModalProps {
  documentId: string;
  documentTitle: string;
  currentVersionNumber: number;
  onClose: () => void;
  onRedactedCreated?: (redactedDoc: RedactedDocument) => void;
}

export const PIIRedactionModal: React.FC<PIIRedactionModalProps> = ({
  documentId,
  documentTitle,
  currentVersionNumber,
  onClose,
  onRedactedCreated
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Scan, 2: Review, 3: Export Purpose, 4: Complete
  const [scanning, setScanning] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [detectedItems, setDetectedItems] = useState<RedactedItem[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [exportPurpose, setExportPurpose] = useState<string>('Right to Information (RTI) Compliance');
  const [customReason, setCustomReason] = useState<string>('');
  const [createdDerivative, setCreatedDerivative] = useState<RedactedDocument | null>(null);
  const [existingCopies, setExistingCopies] = useState<RedactedDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Scan document for PII
  const runDetection = async () => {
    try {
      setScanning(true);
      setError(null);
      const res = await api.detectPII(documentId, currentVersionNumber);
      setDetectedItems(res.detected || []);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to detect PII in document');
    } finally {
      setScanning(false);
    }
  };

  // Fetch existing redacted copies
  const fetchExistingCopies = async () => {
    try {
      const copies = await api.getRedactedCopies(documentId);
      setExistingCopies(copies);
    } catch (err) {
      console.error('Error fetching redacted copies:', err);
    }
  };

  useEffect(() => {
    fetchExistingCopies();
  }, [documentId]);

  const toggleItemRedaction = (id: string) => {
    setDetectedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, isConfirmed: !item.isConfirmed } : item))
    );
  };

  const selectAll = (enable: boolean) => {
    setDetectedItems(prev => prev.map(item => ({ ...item, isConfirmed: enable })));
  };

  const handleGenerateRedacted = async () => {
    try {
      setGenerating(true);
      setError(null);

      const itemsToRedact = detectedItems.filter(i => i.isConfirmed);
      const purpose = customReason.trim() ? `${exportPurpose}: ${customReason}` : exportPurpose;

      const result = await api.createRedactedDerivative(documentId, {
        versionNumber: currentVersionNumber,
        redactedItems: itemsToRedact,
        exportPurpose: purpose
      });

      setCreatedDerivative(result.redactedDocument);
      setStep(4);
      fetchExistingCopies();
      if (onRedactedCreated) {
        onRedactedCreated(result.redactedDocument);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate redacted derivative');
    } finally {
      setGenerating(false);
    }
  };

  const downloadRedactedFile = (redactedId: string, fileName: string) => {
    const token = localStorage.getItem('nyayasetu_token');
    fetch(`${API_BASE}/documents/redacted/${redactedId}/download`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(err => {
        alert(err.message || 'Failed to download redacted file');
      });
  };

  const filteredItems = detectedItems.filter(item => {
    if (filterType === 'ALL') return true;
    return item.type === filterType;
  });

  const confirmedCount = detectedItems.filter(i => i.isConfirmed).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Secure PII Redaction & Sanitization
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Target: <span className="font-semibold text-slate-700">{documentTitle}</span> (Version v{currentVersionNumber}.0)
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

        {/* Legal Immutability Guarantee Banner */}
        <div className="px-6 py-2.5 bg-blue-50 border-b border-blue-200 flex items-center space-x-3 text-xs text-blue-900">
          <Lock className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Legal Non-Destructive Protection:</strong> Original evidence documents are cryptographically frozen and never modified. 
            This engine generates an independent sanitized derivative file with its own sovereign SHA-256 seal.
          </span>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-6 text-xs">
            <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-700 font-bold' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                1
              </span>
              <span>Automated Scan</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-blue-700 font-bold' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                2
              </span>
              <span>Review & Select</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-blue-700 font-bold' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                3
              </span>
              <span>Export Purpose</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            <div className={`flex items-center space-x-2 ${step >= 4 ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                4
              </span>
              <span>Derivative Generated</span>
            </div>
          </div>

          {existingCopies.length > 0 && (
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-medium">
              {existingCopies.length} existing redacted derivative(s)
            </span>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Scan & Detect */}
          {step === 1 && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Shield className="w-8 h-8" />
              </div>
              <div className="max-w-md">
                <h3 className="text-base font-bold text-slate-800">Scan for Personally Identifiable Information</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Our pattern matching engine scans this document for Indian phone numbers, Aadhaar cards, PAN cards, email addresses, and residential locations.
                </p>
              </div>
              <button
                onClick={runDetection}
                disabled={scanning}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center space-x-2 transition-colors disabled:opacity-50"
              >
                {scanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Scanning Document Content...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Start Automated PII Detection</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP 2: Review & Toggle Masking */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-slate-600">Filter By Type:</span>
                  {['ALL', 'PHONE', 'EMAIL', 'AADHAAR', 'PAN', 'ADDRESS'].map(t => (
                    <button
                      key={t}
                      onClick={() => setFilterType(t)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        filterType === t
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => selectAll(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => selectAll(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Items List */}
              {filteredItems.length === 0 ? (
                <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500 text-xs">
                  No matching PII patterns found for the selected category.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => toggleItemRedaction(item.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between bg-white ${
                        item.isConfirmed
                          ? 'border-indigo-300 bg-indigo-50/20'
                          : 'border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={item.isConfirmed}
                          onChange={() => {}} // handled by parent onClick
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                              {item.type}
                            </span>
                            <span className="text-xs font-semibold text-slate-800">{item.field}</span>
                          </div>
                          <div className="mt-1 flex items-center space-x-3 text-xs">
                            <span className="text-slate-500 line-through font-mono">{item.originalText}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.maskedText}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          item.isConfirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.isConfirmed ? 'Masked' : 'Preserved'}
                        </span>
                        {item.reason && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{item.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Export Purpose */}
          {step === 3 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Specify Purpose of Redacted Release</h3>
              <p className="text-xs text-slate-500">
                Statutory disclosure regulations require documenting the official ground under which sanitized copies are distributed.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Purpose Category:</label>
                  <select
                    value={exportPurpose}
                    onChange={e => setExportPurpose(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Right to Information (RTI) Compliance">Right to Information (RTI) Compliance</option>
                    <option value="Public Judicial Record / Court Filing">Public Judicial Record / Court Filing</option>
                    <option value="Witness & Informant Identity Protection">Witness & Informant Identity Protection</option>
                    <option value="Inter-Agency Intelligence Sharing">Inter-Agency Intelligence Sharing</option>
                    <option value="Defense Counsel Disclosure (Redacted)">Defense Counsel Disclosure (Redacted)</option>
                    <option value="Media Release / Press Briefing">Media Release / Press Briefing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Specific Order / Memo Reference (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. As per Court Order CR-2024-991 dated 14/08/2024"
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start space-x-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Summary of Masked Items:</strong> {confirmedCount} sensitive identifier(s) will be permanently replaced with high-entropy cryptographic placeholders in this derivative copy.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Success & Download */}
          {step === 4 && createdDerivative && (
            <div className="bg-white rounded-xl border border-emerald-200 p-6 space-y-4">
              <div className="flex items-center space-x-3 text-emerald-800">
                <div className="p-2 bg-emerald-100 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Redacted Derivative Successfully Generated</h3>
                  <p className="text-xs text-slate-500">The sanitized derivative is stored independently and sealed with SHA-256.</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Derivative File Name:</span>
                  <span className="font-semibold text-slate-800 font-mono">{createdDerivative.redactedFileName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Release Ground:</span>
                  <span className="font-semibold text-slate-800">{createdDerivative.exportPurpose}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Masked Elements:</span>
                  <span className="font-semibold text-slate-800">{createdDerivative.redactedItems.length} items masked</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Derivative SHA-256 Hash Digest:</span>
                  <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 break-all select-all text-slate-700">
                    {createdDerivative.sha256Hash}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => downloadRedactedFile(createdDerivative.id, createdDerivative.redactedFileName)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Redacted File</span>
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                >
                  Create Another Variant
                </button>
              </div>
            </div>
          )}

          {/* Existing Redacted Copies Accordion / Table */}
          {existingCopies.length > 0 && step !== 4 && (
            <div className="mt-6 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center justify-between">
                <span>Existing Redacted Copies for this Document</span>
                <span className="text-slate-400 font-normal">({existingCopies.length})</span>
              </h4>
              <div className="space-y-2">
                {existingCopies.map(copy => (
                  <div
                    key={copy.id}
                    className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 font-mono">{copy.redactedFileName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Created {new Date(copy.createdAt).toLocaleString()} by {copy.creatorName} • Purpose: {copy.exportPurpose || 'Standard'}
                      </div>
                    </div>
                    <button
                      onClick={() => downloadRedactedFile(copy.id, copy.redactedFileName)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-xs flex items-center space-x-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {step === 2 && `${confirmedCount} of ${detectedItems.length} items selected for redaction`}
          </div>
          <div className="flex items-center space-x-2">
            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={confirmedCount === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors disabled:opacity-50"
              >
                <span>Proceed to Purpose</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <>
                <button
                  onClick={() => setStep(2)}
                  className="px-3 py-2 text-slate-600 hover:text-slate-800 text-xs font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleGenerateRedacted}
                  disabled={generating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Derivative...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Generate Redacted Derivative</span>
                    </>
                  )}
                </button>
              </>
            )}

            {step === 4 && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Done
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
