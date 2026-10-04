import { PostgresService } from '../db/postgres.js';
import { AIAnalysisResult, DocumentCategory } from '../types/index.js';

export class AIAnalysisRepository {
  public static mapRowToAI(row: any): AIAnalysisResult {
    return {
      documentId: row.document_id,
      extractedText: row.extracted_text || '',
      ocrConfidence: Number(row.ocr_confidence) || 0,
      suggestedCategory: (row.suggested_category as DocumentCategory) || 'Other',
      summary: row.summary || '',
      entities: (typeof row.entities === 'string' ? JSON.parse(row.entities) : row.entities) || {
        suspects: [],
        victims: [],
        officers: [],
        locations: [],
        legalSections: [],
        dates: []
      },
      timelineEvents: Array.isArray(row.timeline_events)
        ? row.timeline_events
        : (typeof row.timeline_events === 'string' ? JSON.parse(row.timeline_events) : []),
      isHumanVerified: Boolean(row.is_human_verified),
      analyzedAt: row.analyzed_at ? new Date(row.analyzed_at).toISOString() : new Date().toISOString()
    };
  }

  public static async findByDocId(documentId: string): Promise<AIAnalysisResult | null> {
    const res = await PostgresService.query('SELECT * FROM ai_analyses WHERE document_id = $1', [documentId]);
    if (res.rows.length === 0) return null;
    return this.mapRowToAI(res.rows[0]);
  }

  public static async findByDocumentId(documentId: string): Promise<AIAnalysisResult | null> {
    return this.findByDocId(documentId);
  }

  public static async upsert(a: AIAnalysisResult): Promise<AIAnalysisResult> {
    await PostgresService.query(`
      INSERT INTO ai_analyses (
        document_id, extracted_text, ocr_confidence, suggested_category,
        summary, entities, timeline_events, is_human_verified, analyzed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (document_id) DO UPDATE SET
        extracted_text = EXCLUDED.extracted_text,
        ocr_confidence = EXCLUDED.ocr_confidence,
        suggested_category = EXCLUDED.suggested_category,
        summary = EXCLUDED.summary,
        entities = EXCLUDED.entities,
        timeline_events = EXCLUDED.timeline_events,
        is_human_verified = EXCLUDED.is_human_verified,
        analyzed_at = EXCLUDED.analyzed_at
    `, [
      a.documentId, a.extractedText || '', a.ocrConfidence || 0,
      a.suggestedCategory || null, a.summary || '',
      JSON.stringify(a.entities || {}), JSON.stringify(a.timelineEvents || []),
      !!a.isHumanVerified, a.analyzedAt || new Date().toISOString()
    ]);
    return a;
  }

  public static async findAll(): Promise<AIAnalysisResult[]> {
    const res = await PostgresService.query('SELECT * FROM ai_analyses ORDER BY analyzed_at DESC');
    return res.rows.map(r => this.mapRowToAI(r));
  }

  public static async count(): Promise<number> {
    const res = await PostgresService.query('SELECT COUNT(*) FROM ai_analyses');
    return parseInt(res.rows[0].count, 10);
  }
}
