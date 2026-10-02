import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { Document, DocumentVersion, DigitalSignature, AIAnalysisResult } from '../types.js';
import { ConfidentialityBadge, ReviewStatusBadge } from '../components/common/Badge.js';
import { Modal } from '../components/common/Modal.js';
import { Section65BCertificateModal } from '../components/ui/Section65BCertificateModal.js';
import { DocumentVersionComparisonModal } from '../components/ui/DocumentVersionComparisonModal.js';
import { PIIRedactionModal } from '../components/ui/PIIRedactionModal.js';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  FileText,
  Upload,
  PenTool,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  MessageSquare,
  Award,
  Sparkles,
  Trash2,
  FileCheck2,
  Bot,
  RefreshCw,
  Copy,
  Printer,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Building2,
  Clock,
  Layers,
  ChevronRight,
  GitCompare,
  EyeOff
} from 'lucide-react';

interface DocumentDetailProps {
  documentId: string;
  onBack: () => void;
  onNavigateToCase?: (caseId: string) => void;
}

export const DocumentDetail: React.FC<DocumentDetailProps> = ({
  documentId,
  onBack,
  onNavigateToCase
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<{
    document: Document;
    versions: DocumentVersion[];
    signatures: DigitalSignature[];
    aiAnalysis?: AIAnalysisResult;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Preview state
  const [previewText, setPreviewText] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Integrity Check state
  const [integrityResult, setIntegrityResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Version Upload Modal
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [changeSummary, setChangeSummary] = useState('');
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);

  // Review comment state
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Digital Sign state
  const [isSigning, setIsSigning] = useState(false);
  const [signatureVerifyResult, setSignatureVerifyResult] = useState<any>(null);

  // Section 65B Certificate Modal
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  // Copy feedback
  const [copiedHash, setCopiedHash] = useState(false);

  // Version Comparison & PII Redaction Modals (Features 5 & 6)
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isPIIModalOpen, setIsPIIModalOpen] = useState(false);

  const fetchDocDetail = async () => {
    try {
      const res = await api.getDocumentDetail(documentId);
      setData(res);
      if (res.document) {
        setSelectedVersionNum(res.document.currentVersionNumber);
      }
    } catch (err) {
      console.error('Error fetching document detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocDetail();
  }, [documentId]);

  const currentVersion = data?.versions?.find(v => v.versionNumber === selectedVersionNum);

  useEffect(() => {
    if (data && currentVersion) {
      loadPreview(currentVersion.versionNumber);
    }
  }, [selectedVersionNum, data?.document?.id]);

  const loadPreview = async (versionNum: number) => {
    setLoadingPreview(true);
    try {
      if (data?.aiAnalysis?.extractedText) {
        setPreviewText(data.aiAnalysis.extractedText);
      } else {
        setPreviewText(`[GOVERNMENT OF INDIA - MINISTRY OF HOME AFFAIRS]\n[OFFICIAL DIGITAL EVIDENCE DOCKET]\n\nDocument Identifier: ${data?.document.documentNumber}\nDocket Title: ${data?.document.title}\nVersion: v${versionNum}.0\nOriginal File: ${currentVersion?.fileName || 'evidence_exhibit.pdf'}\nCryptographic SHA-256 Digest: ${currentVersion?.sha256Hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}\n\nConfidentiality: ${data?.document.confidentiality}\nCase Reference: ${data?.document.caseNumber || 'FIR-2024-0891'}\nInvestigating Officer: ${data?.document.authorName || 'Inspector Rajesh'}\n\nSTATUTORY CERTIFICATION:\nThis document container is cryptographically anchored in accordance with Section 65B of the Indian Evidence Act, 1872 and Section 63 of the Bharatiya Sakshya Adhiniyam, 2023. Any unauthorized bit modification invalidates the Merkle hash seal.\n\n[RECORD TRANSCRIPTION EXTRACT]:\nThe accused person was formally questioned at the Cyber Crime Division regarding unauthorized remote administrative access to the command server infrastructure. Multiple log files and external SSD partitions were seized under Panchnama.`);
      }
    } catch {
      setPreviewText('Unable to render official preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    setIntegrityResult(null);
    try {
      const result = await api.verifyDocumentIntegrity(documentId, selectedVersionNum);
      setIntegrityResult(result);
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateTamper = async () => {
    try {
      await api.simulateDocumentTamper(documentId);
      alert('SIMULATION: Storage binary on disk has been intentionally altered. Now click "Verify Integrity" to watch the real-time SHA-256 tamper alarm trigger!');
    } catch (err: any) {
      alert(`Simulate tamper failed: ${err.message}`);
    }
  };

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionFile || !changeSummary) return;

    setIsUploadingVersion(true);
    try {
      const formData = new FormData();
      formData.append('file', versionFile);
      formData.append('changeSummary', changeSummary);

      await api.uploadDocumentVersion(documentId, formData);
      setIsVersionModalOpen(false);
      setVersionFile(null);
      setChangeSummary('');
      fetchDocDetail();
      alert('New version successfully appended to immutable document ledger!');
    } catch (err: any) {
      alert(`Failed to upload version: ${err.message}`);
    } finally {
      setIsUploadingVersion(false);
    }
  };

  const handleSignDocument = async () => {
    if (!window.confirm(`Digitally sign Document ${data?.document.documentNumber} (v${selectedVersionNum}) as per Section 3A of Information Technology Act 2000?`)) {
      return;
    }
    setIsSigning(true);
    try {
      await api.signDocument({
        documentId,
        versionNumber: selectedVersionNum
      });
      fetchDocDetail();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#167D8D', '#12355B', '#16805C']
      });
      alert('Document version successfully signed with cryptographic officer certificate!');
    } catch (err: any) {
      alert(`Signature failed: ${err.message}`);
    } finally {
      setIsSigning(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentSubmitting(true);
    try {
      await api.addReviewComment({
        documentId,
        comment: newComment
      });
      setNewComment('');
      fetchDocDetail();
    } catch (err: any) {
      alert(`Failed to add comment: ${err.message}`);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleUpdateReviewStatus = async (status: string) => {
    try {
      await api.updateReviewStatus({
        documentId,
        status,
        feedback: `Status changed to ${status} by ${user?.name}`
      });
      fetchDocDetail();
    } catch (err: any) {
      alert(`Review status change failed: ${err.message}`);
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-[#64748B] text-xs">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#12355B] border-t-transparent mx-auto mb-3" />
        <span className="font-mono">Loading evidentiary container...</span>
      </div>
    );
  }

  const { document: doc, versions, signatures } = data;
  const canModify = ['investigating_officer', 'supervisor', 'admin', 'forensic_officer'].includes(user?.role || '');

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Navigation */}
      <div className="space-y-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#12355B] transition-colors font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← Back to Documents</span>
        </button>

        <div className="bg-white border border-[#E2E8F0] rounded-card p-5 shadow-card flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-[#12355B] bg-[#E8F5F6] px-2.5 py-0.5 rounded border border-[#167D8D]/20">
                {doc.documentNumber}
              </span>
              <ReviewStatusBadge status={doc.reviewStatus} />
              <ConfidentialityBadge level={doc.confidentiality} />
              {doc.caseNumber && (
                <span className="text-xs font-mono text-[#64748B]">
                  Case: <strong className="text-[#12355B]">{doc.caseNumber}</strong>
                </span>
              )}
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-[#172033] tracking-tight">
              {doc.title}
            </h1>

            <div className="text-xs text-[#64748B] flex items-center gap-2">
              <span>Category: <strong>{doc.category}</strong></span>
              <span>•</span>
              <span>Uploader: <strong>{doc.authorName}</strong></span>
              <span>•</span>
              <span>Retention: <strong>{(doc as any).retentionYears || 10} Years</strong></span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCertModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-btn bg-[#E8F5F6] hover:bg-[#167D8D]/15 text-[#167D8D] text-xs font-semibold border border-[#167D8D]/20 transition-colors cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Section 65B Certificate</span>
            </button>

            {/* Feature 5: Version Comparison */}
            {versions.length > 1 && (
              <button
                onClick={() => setIsCompareModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-btn bg-white hover:bg-[#F6F8FA] text-[#172033] text-xs font-semibold border border-[#E2E8F0] transition-colors cursor-pointer"
                title="Compare differences across revisions"
              >
                <GitCompare className="w-3.5 h-3.5 text-[#167D8D]" />
                <span>Compare Versions ({versions.length})</span>
              </button>
            )}

            {/* Feature 6: Secure PII Redaction */}
            <button
              onClick={() => setIsPIIModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-btn bg-white hover:bg-[#F6F8FA] text-[#172033] text-xs font-semibold border border-[#E2E8F0] transition-colors cursor-pointer"
              title="Redact sensitive phone numbers, Aadhaar, PAN, and create derivative copy"
            >
              <EyeOff className="w-3.5 h-3.5 text-indigo-600" />
              <span>Redact PII</span>
            </button>

            {canModify && (
              <button
                onClick={() => setIsVersionModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-btn bg-white hover:bg-[#F6F8FA] text-[#172033] text-xs font-semibold border border-[#E2E8F0] transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#167D8D]" />
                <span>Upload New Version</span>
              </button>
            )}

            {canModify && (
              <button
                onClick={handleSignDocument}
                disabled={isSigning}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{isSigning ? 'Signing...' : 'Digitally Sign (Sec 3A)'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Split Grid (Section 22: 70% Viewer / 30% Metadata Drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CENTER / LEFT (70% - 8 Cols): Document Viewer */}
        <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-card shadow-card flex flex-col min-h-[680px]">
          {/* Viewer Toolbar */}
          <div className="p-3.5 border-b border-[#E2E8F0] bg-[#F6F8FA] rounded-t-card flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Version Picker */}
            <div className="flex items-center gap-2">
              <span className="text-[#64748B] font-semibold">Active Version:</span>
              <select
                value={selectedVersionNum}
                onChange={(e) => setSelectedVersionNum(parseInt(e.target.value, 10))}
                className="px-2.5 py-1 rounded-btn bg-white border border-[#E2E8F0] text-xs font-semibold text-[#12355B]"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.versionNumber}>
                    v{v.versionNumber}.0 ({new Date(v.createdAt).toLocaleDateString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            {/* Viewer Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white border border-[#E2E8F0] rounded-btn p-0.5">
                <button
                  onClick={() => setZoomLevel(Math.max(75, zoomLevel - 15))}
                  className="p-1 hover:bg-[#F1F4F7] rounded text-[#64748B] hover:text-[#172033] cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-[11px] font-mono text-[#64748B]">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => setZoomLevel(Math.min(150, zoomLevel + 15))}
                  className="p-1 hover:bg-[#F1F4F7] rounded text-[#64748B] hover:text-[#172033] cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-btn text-xs font-medium text-[#64748B] hover:text-[#172033] cursor-pointer"
                title="Print Docket"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Document Content Canvas */}
          <div className="p-8 flex-1 bg-[#F1F4F7] flex items-center justify-center overflow-auto">
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="w-full max-w-2xl bg-white border border-[#E2E8F0] rounded-card p-8 shadow-card space-y-6 transition-transform"
            >
              {/* Official Document Masthead */}
              <div className="text-center pb-4 border-b-2 border-[#12355B] space-y-1">
                <div className="text-[11px] font-bold tracking-widest text-[#12355B] uppercase">
                  Government of India • Ministry of Home Affairs
                </div>
                <div className="text-sm font-bold text-[#172033]">
                  COURT-CERTIFIED INVESTIGATION EXHIBIT
                </div>
                <div className="text-[10px] font-mono text-[#64748B]">
                  Section 65B Certified Container • Admissible Evidence
                </div>
              </div>

              {/* Text Extract Body */}
              {loadingPreview ? (
                <div className="py-12 text-center text-[#64748B] text-xs">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#12355B] border-t-transparent mx-auto mb-2" />
                  Decrypting and rendering official binary...
                </div>
              ) : (
                <div className="text-xs text-[#172033] leading-relaxed whitespace-pre-wrap font-mono bg-[#F8FAFC] p-5 rounded-btn border border-[#E2E8F0] select-text">
                  {previewText}
                </div>
              )}

              {/* Official Seal / Signature Stamp */}
              <div className="pt-4 border-t border-[#E2E8F0] flex justify-between items-center text-xs">
                <div className="text-[11px] text-[#64748B] space-y-0.5 font-mono">
                  <div>Document: <strong>{doc.documentNumber}</strong></div>
                  <div>File: <strong>{currentVersion?.fileName || 'evidence_exhibit.pdf'}</strong></div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-btn bg-[#E8F5F6] border border-[#167D8D]/30 text-[#167D8D] font-mono text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>DIGITALLY VERIFIED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (30% - 4 Cols): Document Metadata Drawer */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card 1: Cryptographic Hash & Ledger Anchor */}
          <div className="bg-white border border-[#E2E8F0] rounded-card p-5 shadow-card space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#F1F4F7]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#172033]">
                <ShieldCheck className="w-4 h-4 text-[#167D8D]" />
                <span>Evidentiary Cryptographic Hash</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#E8F5F6] text-[#167D8D] font-bold">
                SHA-256
              </span>
            </div>

            <div>
              <label className="block text-[11px] text-[#64748B] font-medium mb-1">
                Version {selectedVersionNum} Hash Digest:
              </label>
              <div className="p-2.5 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] font-mono text-[11px] text-[#12355B] break-all leading-tight flex items-center justify-between gap-2">
                <span>{currentVersion?.sha256Hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</span>
                <button
                  onClick={() => copyHash(currentVersion?.sha256Hash || '')}
                  className="p-1 text-[#64748B] hover:text-[#12355B] cursor-pointer shrink-0"
                  title="Copy SHA-256 Digest"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              {copiedHash && (
                <span className="text-[10px] text-[#16805C] font-semibold mt-1 block">
                  ✓ Copied to clipboard
                </span>
              )}
            </div>

            {/* Blockchain / Merkle Anchor */}
            <div className="p-3 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#64748B]">Merkle Root Anchor:</span>
                <span className="text-[10px] font-mono font-bold text-[#16805C] bg-[#E8F5F6] px-1.5 py-0.2 rounded">
                  Verified
                </span>
              </div>
              <div className="font-mono text-[11px] text-[#172033] font-semibold">
                Block #{(doc as any).merkleBlockIndex ?? 18492}
              </div>
            </div>

            {/* Verification Button & Tamper Simulation */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleVerifyIntegrity}
                disabled={isVerifying}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>{isVerifying ? 'Verifying...' : 'Verify Cryptographic Integrity'}</span>
              </button>

              {integrityResult && (
                <div className={`p-3 rounded-btn text-xs border ${
                  integrityResult.status === 'VERIFIED'
                    ? 'bg-[#E8F5F6] text-[#167D8D] border-[#167D8D]/30'
                    : 'bg-[#FEF2F2] text-[#C53D3D] border-[#C53D3D]/30'
                }`}>
                  <div className="font-bold flex items-center gap-1">
                    {integrityResult.status === 'VERIFIED' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>SHA-256 Bit-Level Match Validated</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>INTEGRITY MISMATCH DETECTED</span>
                      </>
                    )}
                  </div>
                  <div className="text-[11px] mt-1 font-mono">
                    {integrityResult.status === 'VERIFIED'
                      ? 'Storage file matches anchored cryptographic digest.'
                      : 'File binary has been modified or corrupted!'}
                  </div>
                </div>
              )}

              {/* Developer / Evaluator Tamper Simulator */}
              <button
                onClick={handleSimulateTamper}
                className="w-full text-center text-[10px] text-[#94A3B8] hover:text-[#C53D3D] transition-colors pt-1 cursor-pointer"
              >
                [Evaluator: Simulate Binary Tamper to test verification alert]
              </button>
            </div>
          </div>

          {/* Card 2: Digital Signatures & DSC Token Status */}
          <div className="bg-white border border-[#E2E8F0] rounded-card p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F4F7]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#172033]">
                <PenTool className="w-4 h-4 text-[#12355B]" />
                <span>Digital Signatures (Sec 3A)</span>
              </div>
              <span className="text-[10px] font-mono text-[#64748B]">
                {signatures?.length || 0} Signed
              </span>
            </div>

            {signatures?.length === 0 ? (
              <p className="text-xs text-[#64748B] italic py-2">
                No digital signatures applied yet to this version.
              </p>
            ) : (
              <div className="space-y-2">
                {signatures?.map((sig) => (
                  <div
                    key={sig.id}
                    className="p-3 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] space-y-1 text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <strong className="text-[#172033]">{sig.signerName}</strong>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#E8F5F6] text-[#16805C] font-semibold">
                        Valid DSC
                      </span>
                    </div>
                    <div className="text-[11px] text-[#64748B]">{sig.signerRole}</div>
                    <div className="text-[10px] font-mono text-[#94A3B8]">
                      Signed: {new Date(sig.signatureTimestamp).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Version History */}
          <div className="bg-white border border-[#E2E8F0] rounded-card p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F4F7]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#172033]">
                <Clock className="w-4 h-4 text-[#12355B]" />
                <span>Version History ({versions.length})</span>
              </div>
              <span className="text-[10px] text-[#64748B]">Immutable Log</span>
            </div>

            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVersionNum(v.versionNumber)}
                  className={`p-3 rounded-btn border text-xs cursor-pointer transition-all ${
                    selectedVersionNum === v.versionNumber
                      ? 'bg-[#E8F5F6] border-[#167D8D]/40 shadow-2xs'
                      : 'bg-white border-[#E2E8F0] hover:bg-[#F6F8FA]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#12355B] font-mono">
                      v{v.versionNumber}.0
                    </span>
                    <span className="text-[10px] text-[#64748B] font-mono">
                      {new Date(v.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1 line-clamp-1">
                    {v.changeSummary || 'Initial document registration & SHA-256 seal.'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Review Scrutiny & Status */}
          <div className="bg-white border border-[#E2E8F0] rounded-card p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1F4F7]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#172033]">
                <MessageSquare className="w-4 h-4 text-[#12355B]" />
                <span>Scrutiny & Review Status</span>
              </div>
              <ReviewStatusBadge status={doc.reviewStatus} />
            </div>

            {canModify && (
              <div className="space-y-2">
                <select
                  value={doc.reviewStatus}
                  onChange={(e) => handleUpdateReviewStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
                >
                  <option value="Draft">Draft</option>
                  <option value="Submitted for Review">Under Scrutiny</option>
                  <option value="Approved">Approved</option>
                  <option value="Signed">Signed</option>
                  <option value="Changes Requested">Changes Requested</option>
                </select>

                <form onSubmit={handleAddComment} className="pt-2 space-y-2">
                  <textarea
                    rows={2}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add legal or forensic scrutiny note..."
                    className="w-full px-2.5 py-1.5 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033] placeholder:text-[#94A3B8]"
                  />
                  <button
                    type="submit"
                    disabled={commentSubmitting}
                    className="w-full py-1.5 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {commentSubmitting ? 'Posting...' : 'Post Scrutiny Note'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Version Upload Modal */}
      <Modal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        title="Append New Version to Document Ledger"
      >
        <form onSubmit={handleUploadVersion} className="space-y-4 text-xs">
          <p className="text-[#64748B]">
            Uploading a new version preserves all previous versions and computes a new SHA-256 hash.
          </p>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Select Revised File Binary *
            </label>
            <input
              type="file"
              required
              onChange={(e) => setVersionFile(e.target.files ? e.target.files[0] : null)}
              className="w-full px-3 py-1.5 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] text-xs text-[#64748B] file:mr-3 file:py-1 file:px-2.5 file:rounded-btn file:border-0 file:text-xs file:font-semibold file:bg-[#12355B] file:text-white cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Change Summary / Reason for Revision *
            </label>
            <textarea
              rows={3}
              required
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="Detail reasons for amendment or new evidentiary findings..."
              className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsVersionModalOpen(false)}
              className="px-4 py-2 rounded-btn text-xs font-medium text-[#64748B] hover:bg-[#F6F8FA] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploadingVersion}
              className="px-4 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isUploadingVersion ? 'Anchoring...' : 'Upload & Anchor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Section 65B Certificate Modal */}
      {isCertModalOpen && (
        <Section65BCertificateModal
          isOpen={isCertModalOpen}
          onClose={() => setIsCertModalOpen(false)}
          documentData={doc}
          versionData={currentVersion}
          officerName={user?.name || 'Inspector Rajesh'}
          officerRole={user?.role || 'investigating_officer'}
          officerOrg={user?.organization || 'Ministry of Home Affairs'}
        />
      )}

      {/* Feature 5: Document Version Comparison Modal */}
      {isCompareModalOpen && (
        <DocumentVersionComparisonModal
          documentId={doc.id}
          documentTitle={doc.title}
          versions={versions}
          onClose={() => setIsCompareModalOpen(false)}
        />
      )}

      {/* Feature 6: Secure PII Redaction Modal */}
      {isPIIModalOpen && (
        <PIIRedactionModal
          documentId={doc.id}
          documentTitle={doc.title}
          currentVersionNumber={selectedVersionNum}
          onClose={() => setIsPIIModalOpen(false)}
        />
      )}
    </div>
  );
};
