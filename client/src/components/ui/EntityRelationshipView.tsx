import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client.js';
import { GraphNode, GraphEdge } from '../../types.js';
import {
  Users,
  FileText,
  Shield,
  MapPin,
  Calendar,
  Building2,
  FolderKanban,
  ExternalLink,
  Search,
  Filter,
  X,
  Layers,
  ChevronRight,
  Info,
  Car,
  Phone
} from 'lucide-react';

interface EntityRelationshipViewProps {
  caseId?: string;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  caseNumber?: string;
  onSelectDocument?: (docId: string) => void;
  onSelectEvidence?: (evId: string) => void;
  onSelectEntity?: (node: GraphNode) => void;
}

export const EntityRelationshipView: React.FC<EntityRelationshipViewProps> = ({
  caseId,
  nodes: initialNodes,
  edges: initialEdges,
  caseNumber,
  onSelectDocument,
  onSelectEvidence,
  onSelectEntity
}) => {
  const [nodes, setNodes] = useState<GraphNode[]>(initialNodes || []);
  const [edges, setEdges] = useState<GraphEdge[]>(initialEdges || []);
  const [loading, setLoading] = useState<boolean>(!initialNodes && !!caseId);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (initialNodes && initialEdges) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    } else if (caseId) {
      setLoading(true);
      api.getKnowledgeGraph(caseId)
        .then((res: any) => {
          setNodes(res.nodes || []);
          setEdges(res.edges || []);
        })
        .catch((err: any) => console.error('Failed to load knowledge graph:', err))
        .finally(() => setLoading(false));
    }
  }, [caseId, initialNodes, initialEdges]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      // Type filter
      if (activeFilter === 'PEOPLE' && node.type !== 'person') return false;
      if (activeFilter === 'DOCUMENTS' && node.type !== 'document') return false;
      if (activeFilter === 'EVIDENCE' && node.type !== 'evidence') return false;
      if (activeFilter === 'LOCATIONS' && node.type !== 'location') return false;
      if (activeFilter === 'EVENTS' && node.type !== 'event') return false;
      if (activeFilter === 'ORGANIZATIONS' && node.type !== 'organization') return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = node.label.toLowerCase().includes(q);
        const matchesType = node.type.toLowerCase().includes(q);
        const matchesMeta = node.metadata && Object.values(node.metadata).some(v => 
          typeof v === 'string' && v.toLowerCase().includes(q)
        );
        return matchesLabel || matchesType || matchesMeta;
      }
      return true;
    });
  }, [nodes, activeFilter, searchQuery]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  // Edges connecting visible nodes
  const visibleEdges = useMemo(() => {
    return edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [edges, filteredNodeIds]);

  const getEntityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'person':
        return Users;
      case 'document':
        return FileText;
      case 'evidence':
        return Shield;
      case 'location':
        return MapPin;
      case 'event':
        return Calendar;
      case 'organization':
        return Building2;
      case 'vehicle':
        return Car;
      case 'phone':
        return Phone;
      default:
        return FolderKanban;
    }
  };

  const getEntityColor = (type: string, group?: string) => {
    switch (type.toLowerCase()) {
      case 'person':
        if (group === 'suspect') return { bg: 'bg-[#FEF2F2]', border: 'border-[#FCA5A5]', text: 'text-[#B91C1C]', dot: 'bg-[#EF4444]' };
        return { bg: 'bg-[#F0FDF4]', border: 'border-[#86EFAC]', text: 'text-[#15803D]', dot: 'bg-[#22C55E]' };
      case 'document':
        return { bg: 'bg-[#ECFDF5]', border: 'border-[#A7F3D0]', text: 'text-[#065F46]', dot: 'bg-[#10B981]' };
      case 'evidence':
        return { bg: 'bg-[#F3E8FF]', border: 'border-[#DDD6FE]', text: 'text-[#6B21A8]', dot: 'bg-[#A855F7]' };
      case 'location':
        return { bg: 'bg-[#FFF7ED]', border: 'border-[#FED7AA]', text: 'text-[#C2410C]', dot: 'bg-[#F97316]' };
      case 'event':
        return { bg: 'bg-[#FEF3C7]', border: 'border-[#FDE68A]', text: 'text-[#B45309]', dot: 'bg-[#F59E0B]' };
      case 'organization':
        return { bg: 'bg-[#EBF3FB]', border: 'border-[#BFDBFE]', text: 'text-[#12355B]', dot: 'bg-[#3B82F6]' };
      default:
        return { bg: 'bg-[#F6F8FA]', border: 'border-[#CBD5E1]', text: 'text-[#1E293B]', dot: 'bg-[#64748B]' };
    }
  };

  // Connected relationships for selected entity
  const selectedEntityRelations = useMemo(() => {
    if (!selectedEntity) return [];
    return edges
      .filter(e => e.source === selectedEntity.id || e.target === selectedEntity.id)
      .map(e => {
        const isOutbound = e.source === selectedEntity.id;
        const otherNodeId = isOutbound ? e.target : e.source;
        const otherNode = nodes.find(n => n.id === otherNodeId);
        return {
          relationship: e.label.replace(/_/g, ' '),
          direction: isOutbound ? 'outbound' : 'inbound',
          targetNode: otherNode
        };
      })
      .filter(r => r.targetNode !== undefined);
  }, [selectedEntity, edges, nodes]);

  if (loading) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-card p-12 text-center text-xs text-[#64748B] shadow-card">
        <div className="w-6 h-6 border-2 border-[#12355B] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Resolving entity nodes and relational edges...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-card p-5 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F1F4F7]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#12355B] animate-pulse" />
              <h2 className="text-base font-bold text-[#172033] tracking-tight">
                Case Entity Relationship Explorer
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E8F5F6] text-[#167D8D] font-bold">
                {caseNumber}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Multi-entity link visualization mapping accused subjects, eyewitness depositions, seized exhibits, and physical crime coordinates.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-[#64748B]">
            <span className="font-bold text-[#172033]">{filteredNodes.length}</span> Entities •{' '}
            <span className="font-bold text-[#172033]">{visibleEdges.length}</span> Verified Relations
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people, exhibits, documents, or locations..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#F6F8FA] border border-[#E2E8F0] rounded-btn text-xs text-[#172033] focus:outline-none focus:border-[#12355B]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <Filter className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
            {[
              { id: 'ALL', label: 'All Entities' },
              { id: 'PEOPLE', label: 'People' },
              { id: 'DOCUMENTS', label: 'Documents' },
              { id: 'EVIDENCE', label: 'Evidence' },
              { id: 'LOCATIONS', label: 'Locations' },
              { id: 'EVENTS', label: 'Events' },
              { id: 'ORGANIZATIONS', label: 'Organizations' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-2.5 py-1 rounded-btn text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  activeFilter === f.id
                    ? 'bg-[#12355B] text-white font-semibold shadow-xs'
                    : 'bg-[#F6F8FA] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#172033]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid & Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity Card Grid (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {filteredNodes.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-card p-12 text-center text-[#64748B] text-xs">
              <Layers className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
              <p className="font-semibold text-[#172033]">No entities match your filter</p>
              <p className="text-[11px] text-[#94A3B8] mt-1">Select "All Entities" to view the complete case relationship network.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredNodes.map(node => {
                const Icon = getEntityIcon(node.type);
                const colors = getEntityColor(node.type, node.group);
                const isSelected = selectedEntity?.id === node.id;

                // Count connected edges
                const relCount = edges.filter(e => e.source === node.id || e.target === node.id).length;

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedEntity(node)}
                    className={`bg-white border rounded-card p-4 shadow-xs hover:shadow-card transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-[#12355B] ring-2 ring-[#12355B]/10'
                        : `${colors.border} hover:border-[#94A3B8]`
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-btn ${colors.bg} flex items-center justify-center shrink-0 border ${colors.border}`}>
                          <Icon className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
                            {node.type}
                          </span>
                          <h4 className="text-xs font-bold text-[#172033] line-clamp-1">
                            {node.label}
                          </h4>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
                        {relCount} links
                      </span>
                    </div>

                    {/* Metadata preview snippets */}
                    <div className="space-y-1 text-[11px] text-[#64748B] border-t border-[#F8FAFC] pt-2">
                      {node.metadata?.role && (
                        <div className="flex items-center justify-between">
                          <span>Role:</span>
                          <span className="font-semibold text-[#172033]">{node.metadata.role}</span>
                        </div>
                      )}
                      {node.metadata?.category && (
                        <div className="flex items-center justify-between">
                          <span>Category:</span>
                          <span className="font-semibold text-[#172033]">{node.metadata.category}</span>
                        </div>
                      )}
                      {node.metadata?.custodian && (
                        <div className="flex items-center justify-between">
                          <span>Custodian:</span>
                          <span className="font-semibold text-[#172033]">{node.metadata.custodian}</span>
                        </div>
                      )}
                      {node.metadata?.locker && (
                        <div className="flex items-center justify-between">
                          <span>Locker:</span>
                          <span className="font-mono text-[10px] text-[#12355B]">{node.metadata.locker}</span>
                        </div>
                      )}
                      {node.metadata?.fullAddress && (
                        <div className="truncate text-[10px] text-[#64748B]">
                          {node.metadata.fullAddress}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#F1F4F7] flex items-center justify-between text-[11px] font-semibold text-[#167D8D]">
                      <span>Inspect Entity Relations</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Entity Inspector Drawer (1 Col) */}
        <div className="lg:col-span-1">
          {selectedEntity ? (
            <div className="bg-white border border-[#CBD5E1] rounded-card p-5 shadow-card space-y-5 sticky top-4">
              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#F1F4F7]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#167D8D]">
                    {selectedEntity.type} Profile
                  </span>
                  <h3 className="text-sm font-bold text-[#172033]">
                    {selectedEntity.label}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="p-1 rounded-btn hover:bg-[#F1F5F9] text-[#94A3B8] hover:text-[#172033] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Attributes / Metadata */}
              <div className="space-y-2 text-xs">
                <h4 className="text-[10px] font-bold uppercase text-[#94A3B8] tracking-wider">
                  Entity Metadata
                </h4>
                <div className="bg-[#F8FAFC] p-3 rounded-btn border border-[#E2E8F0] space-y-1.5">
                  {selectedEntity.metadata && Object.entries(selectedEntity.metadata).map(([key, val]) => (
                    <div key={key} className="flex items-start justify-between text-[11px] gap-2">
                      <span className="text-[#64748B] capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="font-semibold text-[#172033] text-right truncate max-w-[180px]">
                        {String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connected Relationships */}
              <div className="space-y-2 text-xs">
                <h4 className="text-[10px] font-bold uppercase text-[#94A3B8] tracking-wider">
                  Verified Relational Links ({selectedEntityRelations.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedEntityRelations.length === 0 ? (
                    <p className="text-[11px] text-[#94A3B8] italic">No direct relations linked.</p>
                  ) : (
                    selectedEntityRelations.map((rel, idx) => (
                      <div
                        key={idx}
                        onClick={() => rel.targetNode && setSelectedEntity(rel.targetNode)}
                        className="p-2.5 rounded-btn bg-[#F6F8FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#167D8D] font-bold mb-1">
                          <span className="uppercase">{rel.relationship}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-white text-[#64748B]">
                            {rel.targetNode?.type}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-[#172033] truncate">
                          {rel.targetNode?.label}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

                {/* Direct Action Link */}
              <div className="pt-3 border-t border-[#F1F4F7]">
                {selectedEntity.type === 'document' && onSelectDocument && (
                  <button
                    onClick={() => onSelectDocument(selectedEntity.metadata?.id || selectedEntity.id.replace('doc-', ''))}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-btn bg-[#12355B] hover:bg-[#0B2545] text-white text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Open Document File & Versions</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}

                {selectedEntity.type === 'evidence' && onSelectEvidence && (
                  <button
                    onClick={() => onSelectEvidence(selectedEntity.metadata?.id || selectedEntity.id.replace('ev-', ''))}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-btn bg-[#6B21A8] hover:bg-[#581C87] text-white text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Inspect Evidence Chain of Custody</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-card p-8 text-center text-[#64748B] text-xs">
              <Info className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
              <p className="font-semibold text-[#172033]">Select any Entity</p>
              <p className="text-[11px] text-[#94A3B8] mt-1">Click on any person, document, exhibit, or location card on the left to inspect its detailed relations and evidence docket.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
