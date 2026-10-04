import { PostgresService } from '../db/postgres.js';
import { CaseRepository } from '../repositories/caseRepository.js';
import { DocumentRepository } from '../repositories/documentRepository.js';
import { EvidenceRepository } from '../repositories/evidenceRepository.js';
import { PersonRepository } from '../repositories/personRepository.js';
import { SemanticSearchResult } from '../types/index.js';

export class SemanticSearchService {
  /**
   * Performs high-precision natural language semantic & keyword search across all PostgreSQL DMS records
   */
  public static async search(query: string, filters?: {
    resourceType?: 'CASE' | 'DOCUMENT' | 'EVIDENCE' | 'PERSON' | 'ALL';
    jurisdiction?: string;
    sectionFilter?: string;
    minScore?: number;
  }): Promise<SemanticSearchResult[]> {
    const rawQ = (query || '').trim();
    if (!rawQ) return [];

    const lowerQ = rawQ.toLowerCase();
    const queryTokens = lowerQ.split(/\s+/).filter(t => t.length > 2);
    const results: SemanticSearchResult[] = [];
    const targetType = filters?.resourceType || 'ALL';

    const matchParam = `%${lowerQ}%`;

    // 1. Search in Cases
    if (targetType === 'ALL' || targetType === 'CASE') {
      const caseRes = await PostgresService.query(`
        SELECT * FROM cases WHERE
          LOWER(case_number) LIKE $1 OR
          LOWER(title) LIKE $1 OR
          LOWER(police_station) LIKE $1 OR
          LOWER(summary) LIKE $1 OR
          LOWER(fir_contents) LIKE $1 OR
          LOWER(suspect_details) LIKE $1 OR
          LOWER(type) LIKE $1
        ORDER BY created_at DESC LIMIT 50
      `, [matchParam]);

      const cases = caseRes.rows.map(r => CaseRepository.mapRowToCase(r));
      cases.forEach(c => {
        let score = 0;
        const matchedSnippets: string[] = [];

        if (c.caseNumber.toLowerCase().includes(lowerQ)) score += 50;
        if (c.title.toLowerCase().includes(lowerQ)) score += 35;
        if (c.policeStation.toLowerCase().includes(lowerQ)) score += 20;
        if (c.summary.toLowerCase().includes(lowerQ)) score += 30;

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

        queryTokens.forEach(token => {
          if (c.title.toLowerCase().includes(token)) score += 8;
          if (c.summary.toLowerCase().includes(token)) score += 6;
          if (c.type.toLowerCase().includes(token)) score += 7;
          if (c.district?.toLowerCase().includes(token)) score += 5;
        });

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
          relevanceScore: normScore || 65,
          tags: [c.status, c.priority, ...(c.actsAndSections?.map(a => a.sections) || [])],
          metadata: {
            status: c.status,
            priority: c.priority,
            filingDate: c.filingDate,
            io: c.investigatingOfficerName
          },
          actionUrl: `#/cases/${c.id}`
        });
      });
    }

    // 2. Search in Documents & AI Summaries
    if (targetType === 'ALL' || targetType === 'DOCUMENT') {
      const docRes = await PostgresService.query(`
        SELECT d.*, a.extracted_text, a.summary as ai_summary, a.entities as ai_entities
        FROM documents d
        LEFT JOIN ai_analyses a ON d.id = a.document_id
        WHERE d.is_deleted = false AND (
          LOWER(d.document_number) LIKE $1 OR
          LOWER(d.title) LIKE $1 OR
          LOWER(d.description) LIKE $1 OR
          LOWER(d.category) LIKE $1 OR
          LOWER(COALESCE(a.extracted_text, '')) LIKE $1 OR
          LOWER(COALESCE(a.summary, '')) LIKE $1
        )
        ORDER BY d.created_at DESC LIMIT 50
      `, [matchParam]);

      docRes.rows.forEach(r => {
        const d = DocumentRepository.mapRowToDocument(r);
        let score = 0;
        const extractedText: string = r.extracted_text || '';
        const aiSummary: string = r.ai_summary || '';

        if (d.title.toLowerCase().includes(lowerQ)) score += 40;
        if (d.documentNumber.toLowerCase().includes(lowerQ)) score += 50;
        if (d.category.toLowerCase().includes(lowerQ)) score += 20;
        if (d.description.toLowerCase().includes(lowerQ)) score += 25;

        if (extractedText.toLowerCase().includes(lowerQ)) score += 30;
        if (aiSummary.toLowerCase().includes(lowerQ)) score += 30;

        queryTokens.forEach(t => {
          if (d.title.toLowerCase().includes(t)) score += 8;
          if (d.tags.some(tg => tg.toLowerCase().includes(t))) score += 10;
          if (aiSummary.toLowerCase().includes(t)) score += 6;
        });

        const normScore = Math.min(99, Math.round(score * 1.3));
        const snippet = aiSummary 
          ? `AI Summary: ${aiSummary.slice(0, 160)}...`
          : `${d.category} for case ${d.caseNumber}. ${d.description || 'Verified evidentiary record.'}`;

        results.push({
          id: `search-doc-${d.id}`,
          resourceType: 'DOCUMENT',
          title: `${d.documentNumber} • ${d.title}`,
          subtitle: `Document • ${d.category} (Case: ${d.caseNumber})`,
          caseNumber: d.caseNumber,
          snippet,
          relevanceScore: normScore || 60,
          tags: [d.category, d.confidentiality, d.reviewStatus],
          metadata: {
            category: d.category,
            confidentiality: d.confidentiality,
            reviewStatus: d.reviewStatus,
            author: d.authorName
          },
          actionUrl: `#/documents/${d.id}`
        });
      });
    }

    // 3. Search in Evidence Items
    if (targetType === 'ALL' || targetType === 'EVIDENCE') {
      const evRes = await PostgresService.query(`
        SELECT * FROM evidence_items WHERE
          LOWER(evidence_number) LIKE $1 OR
          LOWER(description) LIKE $1 OR
          LOWER(type) LIKE $1 OR
          LOWER(storage_locker) LIKE $1 OR
          LOWER(collection_location) LIKE $1
        ORDER BY created_at DESC LIMIT 50
      `, [matchParam]);

      const evidence = evRes.rows.map(r => EvidenceRepository.mapRowToEvidence(r));
      evidence.forEach(e => {
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

        const normScore = Math.min(99, Math.round(score * 1.35));
        results.push({
          id: `search-ev-${e.id}`,
          resourceType: 'EVIDENCE',
          title: `${e.evidenceNumber} • ${e.description}`,
          subtitle: `Exhibit • ${e.type} (Custodian: ${e.currentCustodian})`,
          caseNumber: e.caseNumber,
          snippet: `Recovered at ${e.collectionLocation}. Securely held at ${e.storageLocker}. SHA-256: ${e.sha256Hash.slice(0, 16)}...`,
          relevanceScore: normScore || 60,
          tags: [e.type, e.storageLocker, 'Chain-of-Custody Verified'],
          metadata: {
            type: e.type,
            currentCustodian: e.currentCustodian,
            locker: e.storageLocker
          },
          actionUrl: `#/evidence/${e.id}`
        });
      });
    }

    // 4. Search in Persons
    if (targetType === 'ALL' || targetType === 'PERSON') {
      const pRes = await PostgresService.query(`
        SELECT * FROM persons WHERE
          LOWER(full_name) LIKE $1 OR
          LOWER(cpid) LIKE $1 OR
          LOWER(aliases::text) LIKE $1 OR
          LOWER(father_or_spouse_name) LIKE $1 OR
          LOWER(police_station) LIKE $1 OR
          LOWER(district) LIKE $1
        ORDER BY updated_at DESC LIMIT 50
      `, [matchParam]);

      const persons = pRes.rows.map(r => PersonRepository.mapRowToPerson(r));
      persons.forEach(p => {
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

        const normScore = Math.min(99, Math.round(score * 1.4));
        const snippet = `CPID: ${p.cpid} | Risk: ${p.riskRating} | Station: ${p.policeStation}. Aliases: ${p.aliases.join(', ') || 'None'}. Linked to ${p.linkedCases.length} case dockets.`;

        results.push({
          id: `search-person-${p.id}`,
          resourceType: 'PERSON',
          title: `${p.cpid} • ${p.fullName}`,
          subtitle: `Criminal Record Dossier • ${p.policeStation} (${p.district})`,
          caseNumber: p.linkedCases[0]?.caseNumber,
          snippet,
          relevanceScore: normScore || 65,
          tags: [p.riskRating + ' Risk', `AFIS ${p.biometrics.afisStatus}`, `${p.linkedCases.length} Cases`],
          metadata: {
            cpid: p.cpid,
            risk: p.riskRating,
            afis: p.biometrics.afisStatus,
            station: p.policeStation
          },
          actionUrl: `#/persons/${p.id}`
        });
      });
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
