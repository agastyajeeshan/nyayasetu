import React, { useState, useEffect } from 'react';
import { 
  Network, 
  GitMerge, 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  FileText, 
  Users, 
  Car, 
  Phone, 
  Crosshair, 
  CreditCard, 
  MapPin,
  CheckCircle2,
  X,
  Table
} from 'lucide-react';
import { CrossCaseCorrelation, GraphNode, GraphEdge, DiscrepancyReport } from '../types.js';
import { apiGet } from '../api/client.js';

interface CrossDocIntelligenceProps {
  onNavigateToCase?: (caseId: string) => void;
  onNavigateToDoc?: (docId: string) => void;
}

export const CrossDocIntelligence: React.FC<CrossDocIntelligenceProps> = ({
  onNavigateToCase,
}) => {
  const [activeTab, setActiveTab] = useState<'correlations' | 'graph' | 'discrepancies'>('correlations');
  const [correlations, setCorrelations] = useState<CrossCaseCorrelation[]>([]);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [graphViewMode, setGraphViewMode] = useState<'visual' | 'table'>('visual');
  const [graphFilter, setGraphFilter] = useState<'ALL' | 'case' | 'person' | 'evidence' | 'location'>('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [corrRes, graphRes, discRes] = await Promise.all([
        apiGet<CrossCaseCorrelation[]>('/api/intelligence/correlations'),
        apiGet<{ nodes: GraphNode[]; edges: GraphEdge[] }>('/api/intelligence/graph'),
        apiGet<DiscrepancyReport[]>('/api/intelligence/discrepancies')
      ]);
      setCorrelations(corrRes || []);
      setGraphData(graphRes || { nodes: [], edges: [] });
      setDiscrepancies(discRes || []);
    } catch (err) {
      console.error('Failed to load intelligence telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'PERSON': return Users;
      case 'PHONE': return Phone;
      case 'VEHICLE': return Car;
      case 'WEAPON': return Crosshair;
      case 'BANK_ACCOUNT': return CreditCard;
      default: return MapPin;
    }
  };

  const filteredCorrelations = correlations.filter(c => 
    c.entityValue.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.matchedCaseNumbers.some(cn => cn.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-200">
              <GitMerge className="w-4 h-4 text-purple-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Cross-Document Intelligence & Correlation Analysis
            </h1>
            <span className="status-pill-purple text-[10px]">
              AI LINK ENGINE
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Automated multi-FIR entity matching, suspect syndicate networks, evidentiary discrepancy detection, and link analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="px-3.5 py-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Re-scan Matrix</span>
          </button>
        </div>
      </div>

      {/* Tabs Selector Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('correlations')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'correlations'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GitMerge className="w-3.5 h-3.5" />
          <span>Multi-Case Entity Matches ({correlations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('graph')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'graph'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Interactive Link Graph ({graphData.nodes.length} Nodes)</span>
        </button>

        <button
          onClick={() => setActiveTab('discrepancies')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'discrepancies'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Contradiction & Alibi Finder ({discrepancies.length})</span>
        </button>
      </div>

      {/* TAB 1: Multi-Case Entity Correlations */}
      {activeTab === 'correlations' && (
        <div className="space-y-4">
          <div className="gov-card p-3 flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter correlations by entity, phone, weapon, vehicle, or case number..."
              className="w-full bg-transparent border-none text-xs focus:outline-none text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCorrelations.map(corr => {
              const Icon = getEntityIcon(corr.entityType);
              return (
                <div
                  key={corr.id}
                  className="gov-card p-5 space-y-3.5 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase font-mono">
                          {corr.entityType} MATCH
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-0.5 group-hover:text-blue-600 transition-colors">
                          {corr.entityValue}
                        </h3>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="status-pill-emerald text-[10px] font-mono">
                        {Math.round(corr.confidenceScore * 100)}% CONFIDENCE
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed">
                    {corr.description}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span>Correlated:</span>
                      {corr.matchedCaseNumbers.map((num, i) => (
                        <span key={i} className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 text-[10px]">
                          {num}
                        </span>
                      ))}
                    </div>

                    {onNavigateToCase && corr.matchedCaseIds[0] && (
                      <button
                        onClick={() => onNavigateToCase(corr.matchedCaseIds[0])}
                        className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <span>Investigate Docket</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Interactive Link Graph Visualizer */}
      {activeTab === 'graph' && (() => {
        const filteredNodes = graphData.nodes.filter(n => {
          if (graphFilter === 'ALL') return true;
          if (graphFilter === 'case') return n.type === 'case';
          if (graphFilter === 'person') return n.type === 'person';
          if (graphFilter === 'evidence') return n.type === 'evidence';
          if (graphFilter === 'location') return n.type === 'location';
          return true;
        });

        const filteredEdges = graphData.edges.filter(e => {
          if (graphFilter === 'ALL') return true;
          const src = filteredNodes.find(n => n.id === e.source);
          const tgt = filteredNodes.find(n => n.id === e.target);
          return !!src && !!tgt;
        });

        return (
          <div className="bg-white border border-[#E2E8F0] rounded-card p-6 shadow-card space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#F1F4F7]">
              <div>
                <h3 className="text-sm font-bold text-[#172033] flex items-center gap-2">
                  <Network className="w-4 h-4 text-[#167D8D]" />
                  <span>Inter-Docket Evidentiary Network Matrix</span>
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Trace cross-case criminal syndicate linkages, common phone numbers, getaway vehicles, and evidentiary transfers across FIR dockets.
                </p>
              </div>

              {/* View Mode Toggle */}
              <div className="inline-flex rounded-btn p-1 bg-[#F1F5F9] border border-[#E2E8F0] self-start md:self-auto">
                <button
                  onClick={() => setGraphViewMode('visual')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                    graphViewMode === 'visual'
                      ? 'bg-white text-[#12355B] shadow-2xs'
                      : 'text-[#64748B] hover:text-[#172033]'
                  }`}
                >
                  <Network className="w-3.5 h-3.5 text-[#167D8D]" />
                  <span>Network Map</span>
                </button>
                <button
                  onClick={() => setGraphViewMode('table')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                    graphViewMode === 'table'
                      ? 'bg-white text-[#12355B] shadow-2xs'
                      : 'text-[#64748B] hover:text-[#172033]'
                  }`}
                >
                  <Table className="w-3.5 h-3.5 text-[#12355B]" />
                  <span>Link Table ({graphData.edges.length})</span>
                </button>
              </div>
            </div>

            {/* Scope Filter Chips */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-semibold text-[#64748B] mr-1">Scope:</span>
                {[
                  { key: 'ALL', label: `All Entities (${graphData.nodes.length})` },
                  { key: 'case', label: 'FIR Dockets' },
                  { key: 'person', label: 'Persons & Suspects' },
                  { key: 'evidence', label: 'Exhibits & Assets' },
                  { key: 'location', label: 'Stations & Locations' }
                ].map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => setGraphFilter(chip.key as any)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      graphFilter === chip.key
                        ? 'bg-[#12355B] text-white'
                        : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#12355B]" /> Case Docket</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Suspect</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]" /> Exhibit</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#64748B]" /> Location</span>
              </div>
            </div>

            {/* Content: Visual Grid OR Link Table */}
            {graphViewMode === 'visual' ? (
              <div className="w-full min-h-[380px] bg-[#F8FAFC] rounded-btn border border-[#E2E8F0] p-6 relative overflow-hidden flex items-center justify-center select-none">
                {/* Subtle Dot Grid */}
                <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:20px_20px] opacity-70" />

                {/* Nodes Grid */}
                <div className="relative z-10 w-full h-full flex flex-wrap items-center justify-around p-4 gap-4">
                  {filteredNodes.map(node => {
                    const isSelected = selectedNode?.id === node.id;
                    const cardStyle = node.type === 'case'
                      ? 'bg-[#EFF6FF] border-[#3B82F6] text-[#1E40AF]'
                      : node.type === 'person' && node.group === 'suspect'
                      ? 'bg-[#FEF2F2] border-[#EF4444] text-[#991B1B]'
                      : node.type === 'evidence'
                      ? 'bg-[#E8F5F6] border-[#14B8A6] text-[#134E4A]'
                      : 'bg-[#F1F5F9] border-[#94A3B8] text-[#334155]';

                    return (
                      <button
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className={`px-3.5 py-2 rounded-btn border text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${cardStyle} ${
                          isSelected ? 'ring-2 ring-[#12355B] shadow-md border-[#12355B]' : 'hover:shadow-xs hover:border-[#12355B]'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current" />
                        <span>{node.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Node Details Drawer */}
                {selectedNode && (
                  <div className="absolute bottom-4 right-4 z-20 bg-white p-4 rounded-btn border border-[#E2E8F0] shadow-card max-w-sm text-[#172033] space-y-2.5 text-xs animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E8F5F6] text-[#167D8D] uppercase font-mono">
                        {selectedNode.type}
                      </span>
                      <button onClick={() => setSelectedNode(null)} className="text-[#94A3B8] hover:text-[#172033] cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="font-bold text-sm text-[#172033]">{selectedNode.label}</div>

                    {selectedNode.metadata && (
                      <div className="bg-[#F8FAFC] p-2.5 rounded-btn space-y-1 text-[11px] text-[#64748B] border border-[#E2E8F0]">
                        {Object.entries(selectedNode.metadata).map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="capitalize text-[#64748B]">{k}:</span>
                            <span className="font-semibold text-[#172033]">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedNode.type === 'case' && onNavigateToCase && (
                      <button
                        onClick={() => onNavigateToCase(selectedNode.id.replace('case-', ''))}
                        className="w-full btn-primary justify-center py-2 text-xs cursor-pointer mt-1"
                      >
                        <span>Open Investigation Docket →</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* TABULAR LINK MATRIX */
              <div className="rounded-btn border border-[#E2E8F0] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] uppercase tracking-wider font-semibold border-b border-[#E2E8F0]">
                    <tr>
                      <th className="px-4 py-3">Source Node</th>
                      <th className="px-4 py-3">Link Relationship</th>
                      <th className="px-4 py-3">Target Node</th>
                      <th className="px-4 py-3">Connection Type</th>
                      <th className="px-4 py-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredEdges.map((edge) => {
                      const srcNode = graphData.nodes.find(n => n.id === edge.source);
                      const tgtNode = graphData.nodes.find(n => n.id === edge.target);

                      return (
                        <tr key={edge.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="px-4 py-3 font-medium text-[#172033]">
                            {srcNode?.label || edge.source}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-[11px] font-bold text-[#12355B] bg-[#E8F5F6] px-2 py-0.5 rounded border border-[#167D8D]/20">
                              {edge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-[#172033]">
                            {tgtNode?.label || edge.target}
                          </td>
                          <td className="px-4 py-3 text-[#64748B] font-mono text-[11px]">
                            {edge.type}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {srcNode && (
                              <button
                                onClick={() => {
                                  setSelectedNode(srcNode);
                                  setGraphViewMode('visual');
                                }}
                                className="px-2.5 py-1 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#12355B] font-semibold text-xs cursor-pointer transition-colors"
                              >
                                View in Graph
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* TAB 3: Discrepancy & Contradiction Detection */}
      {activeTab === 'discrepancies' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold">AI Contradiction Telemetry Active: </span>
              NyayaSetu continuously evaluates witness depositions (under Section 180 BNSS / 161 CrPC), tower CDR telemetry, and recovery panchnamas to detect inconsistencies before judicial scrutiny.
            </div>
          </div>

          <div className="space-y-4">
            {discrepancies.map(disc => (
              <div
                key={disc.id}
                className="gov-card p-5 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2.5 py-0.5 rounded-full">
                        {disc.caseNumber}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        {disc.type.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{disc.title}</h3>
                  </div>

                  <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                    disc.severity === 'Critical' ? 'status-pill-crimson' :
                    disc.severity === 'High' ? 'status-pill-amber' :
                    'status-pill-blue'
                  }`}>
                    {disc.severity.toUpperCase()} SEVERITY
                  </span>
                </div>

                <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 leading-relaxed">
                  {disc.description}
                </p>

                {/* Conflicting Source Excerpts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {disc.conflictingSources.map((source, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
                      <div className="font-bold text-blue-700 text-[11px] flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Source {i + 1}: {source.documentTitle}</span>
                      </div>
                      <div className="text-slate-700 italic text-[11px] bg-white p-2.5 rounded-lg border border-slate-200">
                        {source.snippet}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recommended Resolution Action */}
                <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 text-xs flex items-start gap-2 text-blue-950">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-blue-900">Investigative Action Required: </span>
                    {disc.recommendation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
