import { PostgresService } from '../db/postgres.js';
import { Case, CaseStatus, CasePriority } from '../types/index.js';

export class CaseRepository {
  public static mapRowToCase(row: any): Case {
    return {
      id: row.id,
      caseNumber: row.case_number,
      title: row.title,
      type: row.type,
      jurisdiction: row.jurisdiction || '',
      policeStation: row.police_station || '',
      department: row.department || '',
      status: row.status as CaseStatus,
      priority: row.priority as CasePriority,
      investigatingOfficerId: row.investigating_officer_id || '',
      investigatingOfficerName: row.investigating_officer_name || '',
      assignedTeam: Array.isArray(row.assigned_team)
        ? row.assigned_team
        : (typeof row.assigned_team === 'string' ? JSON.parse(row.assigned_team) : []),
      incidentDate: row.incident_date ? new Date(row.incident_date).toISOString() : '',
      filingDate: row.filing_date ? new Date(row.filing_date).toISOString() : '',
      courtName: row.court_name || undefined,
      judgeName: row.judge_name || undefined,
      isLegalHold: Boolean(row.is_legal_hold),
      summary: row.summary || '',

      // Form I.F.1
      district: row.district || undefined,
      state: row.state || undefined,
      firYear: row.fir_year || undefined,
      actsAndSections: Array.isArray(row.acts_and_sections)
        ? row.acts_and_sections
        : (typeof row.acts_and_sections === 'string' ? JSON.parse(row.acts_and_sections) : []),
      occurrenceDay: row.occurrence_day || undefined,
      occurrenceDateFrom: row.occurrence_date_from ? new Date(row.occurrence_date_from).toISOString() : undefined,
      occurrenceDateTo: row.occurrence_date_to ? new Date(row.occurrence_date_to).toISOString() : undefined,
      occurrenceTimeFrom: row.occurrence_time_from || undefined,
      occurrenceTimeTo: row.occurrence_time_to || undefined,
      informationReceivedDate: row.information_received_date ? new Date(row.information_received_date).toISOString() : undefined,
      informationReceivedTime: row.information_received_time || undefined,
      generalDiaryNo: row.general_diary_no || undefined,
      informationType: row.information_type || undefined,
      placeOfOccurrence: row.place_of_occurrence || undefined,
      distanceFromPS: row.distance_from_ps || undefined,
      beatNo: row.beat_no || undefined,
      complainantName: row.complainant_name || undefined,
      complainantFatherSpouse: row.complainant_father_spouse || undefined,
      complainantDobOrAge: row.complainant_dob_or_age || undefined,
      complainantNationality: row.complainant_nationality || undefined,
      complainantOccupation: row.complainant_occupation || undefined,
      complainantAddress: row.complainant_address || undefined,
      complainantPhone: row.complainant_phone || undefined,
      suspectDetails: row.suspect_details || undefined,
      propertiesStolenOrInvolved: row.properties_stolen_or_involved || undefined,
      totalEstimatedValue: row.total_estimated_value || undefined,
      firContents: row.fir_contents || undefined,
      officerInChargeName: row.officer_in_charge_name || undefined,
      officerInChargeRank: row.officer_in_charge_rank || undefined,
      officerInChargeBadge: row.officer_in_charge_badge || undefined,

      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    };
  }

  public static async findById(id: string): Promise<Case | null> {
    const res = await PostgresService.query('SELECT * FROM cases WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToCase(res.rows[0]);
  }

  public static async findByCaseNumber(caseNumber: string): Promise<Case | null> {
    const res = await PostgresService.query('SELECT * FROM cases WHERE LOWER(case_number) = LOWER($1)', [caseNumber]);
    if (res.rows.length === 0) return null;
    return this.mapRowToCase(res.rows[0]);
  }

  public static async findMany(filters: {
    status?: string;
    priority?: string;
    search?: string;
    investigatingOfficerId?: string;
    teamUserId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Case[]> {
    let sql = 'SELECT * FROM cases WHERE 1=1';
    const params: any[] = [];

    if (filters.status) {
      params.push(filters.status);
      sql += ` AND status = $${params.length}`;
    }

    if (filters.priority) {
      params.push(filters.priority);
      sql += ` AND priority = $${params.length}`;
    }

    if (filters.investigatingOfficerId) {
      params.push(filters.investigatingOfficerId);
      sql += ` AND investigating_officer_id = $${params.length}`;
    }

    if (filters.teamUserId) {
      params.push(filters.teamUserId);
      sql += ` AND (investigating_officer_id = $${params.length} OR assigned_team ? $${params.length})`;
    }

    if (filters.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      sql += ` AND (
        LOWER(case_number) LIKE $${params.length} OR
        LOWER(title) LIKE $${params.length} OR
        LOWER(summary) LIKE $${params.length} OR
        LOWER(police_station) LIKE $${params.length} OR
        LOWER(complainant_name) LIKE $${params.length} OR
        LOWER(investigating_officer_name) LIKE $${params.length}
      )`;
    }

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      params.push(filters.limit);
      sql += ` LIMIT $${params.length}`;
    }

    if (filters.offset) {
      params.push(filters.offset);
      sql += ` OFFSET $${params.length}`;
    }

    const res = await PostgresService.query(sql, params);
    return res.rows.map(r => this.mapRowToCase(r));
  }

  public static async findAll(filters: {
    status?: string;
    priority?: string;
    search?: string;
    investigatingOfficerId?: string;
    teamUserId?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<Case[]> {
    return this.findMany(filters);
  }

  public static async create(c: Case): Promise<Case> {
    await PostgresService.query(`
      INSERT INTO cases (
        id, case_number, title, type, jurisdiction, police_station, department,
        status, priority, investigating_officer_id, investigating_officer_name,
        assigned_team, incident_date, filing_date, court_name, judge_name,
        is_legal_hold, summary, district, state, fir_year, acts_and_sections,
        occurrence_day, occurrence_date_from, occurrence_date_to, occurrence_time_from, occurrence_time_to,
        information_received_date, information_received_time, general_diary_no, information_type,
        place_of_occurrence, distance_from_ps, beat_no, complainant_name, complainant_father_spouse,
        complainant_dob_or_age, complainant_nationality, complainant_occupation, complainant_address,
        complainant_phone, suspect_details, properties_stolen_or_involved, total_estimated_value,
        fir_contents, officer_in_charge_name, officer_in_charge_rank, officer_in_charge_badge,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44,
        $45, $46, $47, $48, $49, $50
      )
      ON CONFLICT (id) DO UPDATE SET
        case_number = EXCLUDED.case_number,
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        updated_at = CURRENT_TIMESTAMP
    `, [
      c.id, c.caseNumber, c.title, c.type, c.jurisdiction, c.policeStation, c.department,
      c.status, c.priority, c.investigatingOfficerId, c.investigatingOfficerName,
      JSON.stringify(c.assignedTeam || []), c.incidentDate || null, c.filingDate || null,
      c.courtName || null, c.judgeName || null, !!c.isLegalHold, c.summary || null,
      c.district || null, c.state || null, c.firYear || null,
      JSON.stringify(c.actsAndSections || []), c.occurrenceDay || null,
      c.occurrenceDateFrom || null, c.occurrenceDateTo || null,
      c.occurrenceTimeFrom || null, c.occurrenceTimeTo || null,
      c.informationReceivedDate || null, c.informationReceivedTime || null,
      c.generalDiaryNo || null, c.informationType || null,
      c.placeOfOccurrence || null, c.distanceFromPS || null, c.beatNo || null,
      c.complainantName || null, c.complainantFatherSpouse || null,
      c.complainantDobOrAge || null, c.complainantNationality || null,
      c.complainantOccupation || null, c.complainantAddress || null,
      c.complainantPhone || null, c.suspectDetails || null,
      c.propertiesStolenOrInvolved || null, c.totalEstimatedValue || null,
      c.firContents || null, c.officerInChargeName || null,
      c.officerInChargeRank || null, c.officerInChargeBadge || null,
      c.createdAt || new Date().toISOString(), c.updatedAt || new Date().toISOString()
    ]);
    return c;
  }

  public static async update(id: string, updates: Partial<Case>): Promise<Case | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await this.create(merged);
    return merged;
  }

  public static async setLegalHold(id: string, isHold: boolean): Promise<boolean> {
    const res = await PostgresService.query(
      'UPDATE cases SET is_legal_hold = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id, isHold]
    );
    return (res.rowCount ?? 0) > 0;
  }

  public static async count(filters: { status?: string } = {}): Promise<number> {
    let sql = 'SELECT COUNT(*) FROM cases WHERE 1=1';
    const params: any[] = [];
    if (filters.status) {
      params.push(filters.status);
      sql += ` AND status = $${params.length}`;
    }
    const res = await PostgresService.query(sql, params);
    return parseInt(res.rows[0].count, 10);
  }

  public static async delete(id: string): Promise<boolean> {
    const res = await PostgresService.query('DELETE FROM cases WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }
}
