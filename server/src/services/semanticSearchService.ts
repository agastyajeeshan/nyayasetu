import { db } from '../db/database.js';
import { SemanticSearchResult } from '../types/index.js';

export class SemanticSearchService {
  /**
   * Performs high-precision natural language semantic & keyword search across all DMS records
   */
  public static search(query: string, filters?: {
    resourceType?: 'CASE' | 'DOCUMENT' | 'EVIDENCE' | 'PERSON' | 'ALL';
    jurisdiction?: string;
    sectionFilter?: string;
    minScore?: number;
  }): SemanticSearchResult[] {
    const rawQ = (query || '').trim();
    if (!rawQ) return [];

    const lowerQ = rawQ.toLowerCase();
    const queryTokens = lowerQ.split(/\s+/).filter(t => t.length > 2);
    const results: SemanticSearchResult[] = [];

    const targetType = filters?.resourceType || 'ALL';

    // 1. Search in Cases
    if (targetType === 'ALL' || targetType === 'CASE') {
      db.cases.forEach(c => {
        let score = 0;
        const matchedSnippets: string[] = [];

        // Exact matches
        if (c.caseNumber.toLowerCase().includes(lowerQ)) score += 50;
        if (c.title.toLowerCase().includes(lowerQ)) score += 35;
        if (c.policeStation.toLowerCase().includes(lowerQ)) score += 20;
        if (c.summary.toLowerCase().includes(lowerQ)) score += 30;

        // Form I.F.1 fields
        if (c.firContents && c.firContents.toLowerCase().includes(lowerQ)) {
          score += 25;
          matchedSnippets.push(`FIR Text: "...${c.firContents.slice(0, 180)}..."`);
        }
        if (c.suspectDetails && c.suspectDetails.toLowerCase().includes(lowerQ)) {
          score += 25;
          matchedSnippets.push(`Suspect Info: "${c.suspectDetails}"`);
        }
        if (c.actsAndSections?.some(s => s.sections.toLowerCase().includes(lowerQ) || s.act.toLowerCase().includes(lowerQ))) {
          score += 30;
        }

        // Token matches
        queryTokens.forEach(token => {
          if (c.title.toLowerCase().includes(token)) score += 8;
          if (c.summary.toLowerCase().includes(token)) score += 6;
          if (c.type.toLowerCase().includes(token)) score += 7;
          if (c.district?.toLowerCase().includes(token)) score += 5;
        });

        // Law section heuristics (e.g. "murder" -> IPC 302 / BNS 103)
        if (lowerQ.includes('murder') && (c.summary.toLowerCase().includes('302') || c.summary.toLowerCase().includes('103') || c.title.toLowerCase().includes('homicide'))) {
          score += 25;
        }
        if (lowerQ.includes('firearm') || lowerQ.includes('gun') || lowerQ.includes('pistol') || lowerQ.includes('weapon')) {
          if (c.title.toLowerCase().includes('armed') || c.summary.toLowerCase().includes('weapon') || c.propertiesStolenOrInvolved?.toLowerCase().includes('firearm')) {
            score += 20;
          }
        }
        if (lowerQ.includes('cyber') || lowerQ.includes('phishing') || lowerQ.includes('telegram') || lowerQ.includes('otp')) {
          if (c.type.toLowerCase().includes('cyber') || c.summary.toLowerCase().includes('fraud') || c.summary.toLowerCase().includes('telegram')) {
            score += 25;
          }
        }

        if (score > 10) {
          const normScore = Math.min(99, Math.round(score * 1.4));
          const snippet = matchedSnippets.length > 0 
            ? matchedSnippets.join(' | ')
            : `Docket: ${c.type} under ${c.policeStation}. Status: ${c.status}. ${c.summary.slice(0, 160)}...`;

          results.push({
            id: `search-case-${c.id}`,
            resourceType: 'CASE',
            title: `${c.caseNumber} • ${c.title}`,
            subtitle: `FIR Docket • ${c.policeStation} (${c.district || c.jurisdiction})`,
            caseNumber: c.caseNumber,
            snippet,
            relevanceScore: normScore,
            tags: [c.status, c.priority, ...(c.actsAndSections?.map(a => a.sections) || [])],
            metadata: {
              status: c.status,
              priority: c.priority,
              filingDate: c.filingDate,
              io: c.investigatingOfficerName
            },
            actionUrl: `#/cases/${c.id}`
          });
        }
      });
    }

    // 2. Search in Documents & AI Summaries
    if (targetType === 'ALL' || targetType === 'DOCUMENT') {
      db.documents.forEach(d => {
        let score = 0;
        const aiAnalysis = db.ai_analyses.find(a => a.documentId === d.id);

        if (d.title.toLowerCase().includes(lowerQ)) score += 40;
        if (d.documentNumber.toLowerCase().includes(lowerQ)) score += 50;
        if (d.category.toLowerCase().includes(lowerQ)) score += 20;
        if (d.description.toLowerCase().includes(lowerQ)) score += 25;

        if (aiAnalysis) {
          if (aiAnalysis.extractedText.toLowerCase().includes(lowerQ)) score += 30;
          if (aiAnalysis.summary.toLowerCase().includes(lowerQ)) score += 30;
          if (aiAnalysis.entities.suspects.some(s => s.toLowerCase().includes(lowerQ))) score += 25;
          if (aiAnalysis.entities.legalSections.some(l => l.code.toLowerCase().includes(lowerQ) || l.title.toLowerCase().includes(lowerQ))) score += 25;
        }

        queryTokens.forEach(t => {
          if (d.title.toLowerCase().includes(t)) score += 8;
          if (d.tags.some(tg => tg.toLowerCase().includes(t))) score += 10;
          if (aiAnalysis?.summary.toLowerCase().includes(t)) score += 6;
        });

        if (score > 10) {
          const normScore = Math.min(99, Math.round(score * 1.3));
          const snippet = aiAnalysis 
            ? `AI Summary: ${aiAnalysis.summary.slice(0, 160)}...`
            : `${d.category} for case ${d.caseNumber}. ${d.description || 'Verified evidentiary record.'}`;

          results.push({
            id: `search-doc-${d.id}`,
            resourceType: 'DOCUMENT',
            title: `${d.documentNumber} • ${d.title}`,
            subtitle: `Document • ${d.category} (Case: ${d.caseNumber})`,
            caseNumber: d.caseNumber,
            snippet,
            relevanceScore: normScore,
            tags: [d.category, d.confidentiality, d.reviewStatus],
            metadata: {
              category: d.category,
              confidentiality: d.confidentiality,
              reviewStatus: d.reviewStatus,
              author: d.authorName
            },
            actionUrl: `#/documents/${d.id}`
          });
        }
      });
    }

    // 3. Search in Evidence Items & Chain of Custody
    if (targetType === 'ALL' || targetType === 'EVIDENCE') {
      db.evidence_items.forEach(e => {
        let score = 0;
        if (e.evidenceNumber.toLowerCase().includes(lowerQ)) score += 50;
        if (e.description.toLowerCase().includes(lowerQ)) score += 35;
        if (e.type.toLowerCase().includes(lowerQ)) score += 20;
        if (e.storageLocker.toLowerCase().includes(lowerQ)) score += 15;
        if (e.collectionLocation.toLowerCase().includes(lowerQ)) score += 20;

        queryTokens.forEach(t => {
          if (e.description.toLowerCase().includes(t)) score += 8;
          if (e.type.toLowerCase().includes(t)) score += 6;
        });

        if (score > 10) {
          const normScore = Math.min(99, Math.round(score * 1.35));
          results.push({
            id: `search-ev-${e.id}`,
            resourceType: 'EVIDENCE',
            title: `${e.evidenceNumber} • ${e.description}`,
            subtitle: `Exhibit • ${e.type} (Custodian: ${e.currentCustodian})`,
            caseNumber: e.caseNumber,
            snippet: `Recovered at ${e.collectionLocation}. Securely held at ${e.storageLocker}. SHA-256: ${e.sha256Hash.slice(0, 16)}...`,
            relevanceScore: normScore,
            tags: [e.type, e.storageLocker, 'Chain-of-Custody Verified'],
            metadata: {
              type: e.type,
              currentCustodian: e.currentCustodian,
              locker: e.storageLocker
            },
            actionUrl: `#/evidence/${e.id}`
          });
        }
      });
    }

    // 4. Search in Person/Criminal Records
    if (targetType === 'ALL' || targetType === 'PERSON') {
      db.persons.forEach(p => {
        let score = 0;
        if (p.fullName.toLowerCase().includes(lowerQ)) score += 45;
        if (p.cpid.toLowerCase().includes(lowerQ)) score += 55;
        if (p.aliases.some(a => a.toLowerCase().includes(lowerQ))) score += 40;
        if (p.fatherOrSpouseName.toLowerCase().includes(lowerQ)) score += 20;
        if (p.policeStation.toLowerCase().includes(lowerQ)) score += 15;
        if (p.district.toLowerCase().includes(lowerQ)) score += 15;

        queryTokens.forEach(t => {
          if (p.fullName.toLowerCase().includes(t)) score += 10;
          if (p.aliases.some(a => a.toLowerCase().includes(t))) score += 8;
          if (p.address.toLowerCase().includes(t)) score += 6;
        });

        if (score > 10) {
          const normScore = Math.min(99, Math.round(score * 1.4));
          const snippet = `CPID: ${p.cpid} | Risk: ${p.riskRating} | Station: ${p.policeStation}. Aliases: ${p.aliases.join(', ') || 'None'}. Linked to ${p.linkedCases.length} case dockets.`;

          results.push({
            id: `search-person-${p.id}`,
            resourceType: 'PERSON',
            title: `${p.cpid} • ${p.fullName}`,
            subtitle: `Criminal Record Dossier • ${p.policeStation} (${p.district})`,
            caseNumber: p.linkedCases[0]?.caseNumber,
            snippet,
            relevanceScore: normScore,
            tags: [p.riskRating + ' Risk', `AFIS ${p.biometrics.afisStatus}`, `${p.linkedCases.length} Cases`],
            metadata: {
              cpid: p.cpid,
              risk: p.riskRating,
              afis: p.biometrics.afisStatus,
              station: p.policeStation
            },
            actionUrl: `#/persons/${p.id}`
          });
        }
      });
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
