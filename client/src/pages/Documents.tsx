import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { Document, DocumentCategory, ConfidentialityLevel } from '../types.js';
import { ConfidentialityBadge, ReviewStatusBadge } from '../components/common/Badge.js';
import { Modal } from '../components/common/Modal.js';
import {
  FileText,
  Upload,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Eye,
  Building2,
  FolderKanban
} from 'lucide-react';

interface DocumentsProps {
  onSelectDocument: (docId: string) => void;
  preselectedCaseId?: string | null;
}

export const Documents: React.FC<DocumentsProps> = ({ onSelectDocument, preselectedCaseId }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedCaseFilter, setSelectedCaseFilter] = useState(preselectedCaseId || '');

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadCaseId, setUploadCaseId] = useState(preselectedCaseId || '');
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentCategory>('Police Report');
  const [docDescription, setDocDescription] = useState('');
  const [docConfidentiality, setDocConfidentiality] = useState<ConfidentialityLevel>('Confidential');
  const [retentionYears, setRetentionYears] = useState(10);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (categoryFilter !== 'ALL') {
        if (categoryFilter === 'FIR') params.category = 'FIR';
        else if (categoryFilter === 'STATEMENTS') params.category = 'Witness Statement';
        else if (categoryFilter === 'REPORTS') params.category = 'Police Report';
        else if (categoryFilter === 'FORENSICS') params.category = 'Forensic Report';
        else if (categoryFilter === 'LEGAL') params.category = 'Court Filing';
      }
      if (selectedCaseFilter) params.caseId = selectedCaseFilter;

      const [docsRes, casesRes] = await Promise.all([
        api.getDocuments(params),
        api.getCases()
      ]);
      setDocuments(docsRes.documents || []);
      setCases(casesRes || []);

      if (!uploadCaseId && casesRes && casesRes.length > 0) {
        setUploadCaseId(casesRes[0].id);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [search, categoryFilter, selectedCaseFilter, preselectedCaseId, user]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    if (!uploadCaseId) {
      setUploadError('Please select an associated case.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('caseId', uploadCaseId);
      formData.append('title', docTitle);
      formData.append('category', docCategory);
      formData.append('description', docDescription);
      formData.append('confidentiality', docConfidentiality);
      formData.append('retentionYears', retentionYears.toString());

      const created = await api.uploadDocument(formData);
      setIsUploadOpen(false);
      resetUploadForm();
      fetchDocs();
      onSelectDocument(created.id);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setDocTitle('');
    setDocDescription('');
    setSelectedFile(null);
    setUploadError(null);
  };

  const canUpload = ['investigating_officer', 'supervisor', 'forensic_officer', 'prosecutor', 'admin'].includes(user?.role || '');

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Official Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-btn bg-[#E8F5F6] flex items-center justify-center border border-[#167D8D]/20">
              <FileText className="w-4 h-4 text-[#167D8D]" />
            </div>
            <h1 className="text-xl font-bold text-[#172033] tracking-tight">
              Document Management
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#E8F5F6] text-[#167D8D] border border-[#167D8D]/20">
              SEC 65B ANCHORED
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            Cryptographically sealed evidentiary records, case statements, forensic assays, and judicial filings
          </p>
        </div>

        {canUpload && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>+ Upload Document</span>
          </button>
        )}
      </div>

      {/* Filter Bar (Section 21: Pills + Case Dropdown + Search) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-[#F1F4F7] rounded-btn border border-[#E2E8F0] overflow-x-auto">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                categoryFilter === 'ALL'
                  ? 'bg-white text-[#12355B] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCategoryFilter('FIR')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                categoryFilter === 'FIR'
                  ? 'bg-white text-[#12355B] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              FIR
            </button>
            <button
              onClick={() => setCategoryFilter('STATEMENTS')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                categoryFilter === 'STATEMENTS'
                  ? 'bg-white text-[#12355B] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Statements
            </button>
            <button
              onClick={() => setCategoryFilter('REPORTS')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                categoryFilter === 'REPORTS'
                  ? 'bg-white text-[#12355B] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Reports
            </button>
            <button
              onClick={() => setCategoryFilter('FORENSICS')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                categoryFilter === 'FORENSICS'
                  ? 'bg-white text-[#12355B] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Forensics
            </button>
            <button
              onClick={() => setCategoryFilter('LEGAL')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                categoryFilter === 'LEGAL'
                  ? 'bg-white text-[#12355B] shadow-2xs font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
            >
              Legal
            </button>
          </div>

          {/* Search Box & Case Dropdown */}
          <div className="flex items-center gap-2 flex-1 sm:max-w-md w-full">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search document name, docket no, author..."
                className="w-full pl-8 pr-3 py-1.5 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#167D8D]"
              />
            </div>

            <select
              value={selectedCaseFilter}
              onChange={(e) => setSelectedCaseFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033] focus:outline-none focus:border-[#167D8D] max-w-[160px] truncate"
            >
              <option value="">All Cases</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Structured Document Table (Section 21) */}
      <div className="bg-white border border-[#E2E8F0] rounded-card shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#64748B] text-xs">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#12355B] border-t-transparent mx-auto mb-2" />
            Loading evidentiary dockets...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-8 h-8 text-[#94A3B8] mx-auto" />
            <h3 className="text-sm font-semibold text-[#172033]">No Documents Found</h3>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto">
              No document records matched the selected category filters or search parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F6F8FA] text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Case / FIR</th>
                  <th className="py-3 px-4">Owner / Uploader</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => onSelectDocument(doc.id)}
                    className="hover:bg-[#F6F8FA] transition-colors cursor-pointer group"
                  >
                    {/* Document Title & Number */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-[#172033] group-hover:text-[#12355B] line-clamp-1">
                        {doc.title}
                      </div>
                      <div className="text-[11px] font-mono text-[#64748B] flex items-center gap-1.5 mt-0.5">
                        <span className="text-[#12355B] font-bold">{doc.documentNumber}</span>
                        <span>•</span>
                        <span className="bg-[#F1F4F7] px-1.5 py-0.2 rounded border border-[#E2E8F0]">v{doc.currentVersionNumber}</span>
                      </div>
                    </td>

                    {/* Type / Category */}
                    <td className="py-3 px-4 whitespace-nowrap text-[#64748B]">
                      <span className="font-medium text-[#172033]">{doc.category}</span>
                    </td>

                    {/* Case / FIR */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-[#12355B]">
                      {doc.caseNumber || 'FIR-2024-0891'}
                    </td>

                    {/* Owner / Uploader */}
                    <td className="py-3 px-4 whitespace-nowrap text-[#172033]">
                      {doc.authorName}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <ReviewStatusBadge status={doc.reviewStatus} />
                    </td>

                    {/* Last Updated */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-[#64748B]">
                      {new Date(doc.updatedAt).toLocaleDateString('en-IN')}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDocument(doc.id);
                          }}
                          className="text-xs font-semibold text-[#167D8D] hover:text-[#12355B] bg-[#E8F5F6] hover:bg-[#167D8D]/15 px-2.5 py-1 rounded-btn transition-colors cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDocument(doc.id);
                          }}
                          className="text-xs font-semibold text-[#12355B] hover:bg-[#F1F4F7] px-2.5 py-1 rounded-btn transition-colors cursor-pointer border border-[#E2E8F0]"
                        >
                          Verify
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Upload Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Official Document Ingestion & Ledger Anchoring"
      >
        <form onSubmit={handleUpload} className="space-y-4 text-xs">
          {uploadError && (
            <div className="p-3 rounded-btn bg-[#FEF2F2] border border-[#C53D3D]/30 text-[#C53D3D] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Associated FIR / Case Docket <span className="text-[#C53D3D]">*</span>
            </label>
            <select
              value={uploadCaseId}
              onChange={(e) => setUploadCaseId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033] focus:outline-none focus:border-[#167D8D]"
            >
              <option value="">-- Select FIR / Case Docket --</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber} - {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              Official Document Title / Exhibit Name <span className="text-[#C53D3D]">*</span>
            </label>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              required
              placeholder="e.g. Formal Charge Sheet under Section 173 CrPC / Sec 193 BNSS"
              className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033] focus:outline-none focus:border-[#167D8D]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Category *</label>
              <select
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value as DocumentCategory)}
                className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
              >
                <option value="FIR">First Information Report (FIR)</option>
                <option value="Police Report">Police Case Report</option>
                <option value="Witness Statement">Witness Statement</option>
                <option value="Charge Sheet">Charge Sheet</option>
                <option value="Forensic Report">Forensic Report</option>
                <option value="Court Filing">Court Filing</option>
                <option value="Evidence Record">Evidence Record</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Classification</label>
              <select
                value={docConfidentiality}
                onChange={(e) => setDocConfidentiality(e.target.value as ConfidentialityLevel)}
                className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
              >
                <option value="Top Secret">Top Secret</option>
                <option value="Secret">Secret</option>
                <option value="Confidential">Confidential</option>
                <option value="Restricted">Restricted</option>
                <option value="Unclassified">Unclassified</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Retention (Years)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={retentionYears}
                onChange={(e) => setRetentionYears(parseInt(e.target.value, 10) || 10)}
                className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">File Binary (PDF, DOCX, JPG, PNG) *</label>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
              required
              className="w-full px-3 py-1.5 rounded-btn bg-[#F6F8FA] border border-[#E2E8F0] text-xs text-[#64748B] file:mr-3 file:py-1 file:px-2.5 file:rounded-btn file:border-0 file:text-xs file:font-semibold file:bg-[#12355B] file:text-white hover:file:bg-[#0B2545] cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">Description</label>
            <textarea
              rows={2}
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              placeholder="Brief summary of document contents..."
              className="w-full px-3 py-2 rounded-btn bg-white border border-[#E2E8F0] text-xs text-[#172033]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsUploadOpen(false)}
              className="px-4 py-2 rounded-btn text-xs font-medium text-[#64748B] hover:bg-[#F6F8FA] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isUploading ? 'Computing SHA-256...' : 'Upload & Anchor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
