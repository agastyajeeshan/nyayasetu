import { PostgresService } from '../db/postgres.js';
import { PersonRecord } from '../types/index.js';

export class PersonRepository {
  public static mapRowToPerson(row: any): PersonRecord {
    return {
      id: row.id,
      cpid: row.cpid || '',
      fullName: row.full_name,
      aliases: Array.isArray(row.aliases)
        ? row.aliases
        : (typeof row.aliases === 'string' ? JSON.parse(row.aliases) : []),
      fatherOrSpouseName: row.father_or_spouse_name || '',
      gender: row.gender as any,
      dobOrAge: row.dob_or_age || '',
      nationality: row.nationality || '',
      primaryPhone: row.primary_phone || undefined,
      identificationMarks: Array.isArray(row.identification_marks)
        ? row.identification_marks
        : (typeof row.identification_marks === 'string' ? JSON.parse(row.identification_marks) : []),
      biometrics: (typeof row.biometrics === 'string' ? JSON.parse(row.biometrics) : row.biometrics) || {
        afisStatus: 'NOT_ENROLLED',
        irisEnrolled: false
      },
      address: row.address || '',
      policeStation: row.police_station || '',
      district: row.district || '',
      state: row.state || '',
      pincode: row.pincode || '',
      riskRating: row.risk_rating as any,
      primaryCrimeType: row.primary_crime_type || undefined,
      modusOperandi: row.modus_operandi || undefined,
      gangOrSyndicateAffiliation: row.gang_or_syndicate_affiliation || undefined,
      previousConvictionsCount: Number(row.previous_convictions_count) || 0,
      linkedCases: Array.isArray(row.linked_cases)
        ? row.linked_cases
        : (typeof row.linked_cases === 'string' ? JSON.parse(row.linked_cases) : []),
      isVerifiedProfile: Boolean(row.is_verified_profile),
      verificationAuthority: row.verification_authority || undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    };
  }

  public static async findById(id: string): Promise<PersonRecord | null> {
    const res = await PostgresService.query('SELECT * FROM persons WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return this.mapRowToPerson(res.rows[0]);
  }

  public static async findByCpid(cpid: string): Promise<PersonRecord | null> {
    const res = await PostgresService.query('SELECT * FROM persons WHERE LOWER(cpid) = LOWER($1)', [cpid]);
    if (res.rows.length === 0) return null;
    return this.mapRowToPerson(res.rows[0]);
  }

  public static async findByCase(caseIdentifier: string): Promise<PersonRecord[]> {
    const q = `%${caseIdentifier.toLowerCase().trim()}%`;
    const res = await PostgresService.query(
      `SELECT * FROM persons WHERE LOWER(linked_cases::text) LIKE $1 ORDER BY full_name ASC`,
      [q]
    );
    return res.rows.map(r => this.mapRowToPerson(r));
  }

  public static async findMany(filters: {
    search?: string;
    locality?: string;
    district?: string;
    policeStation?: string;
    riskRating?: string;
    afisStatus?: string;
    caseId?: string;
    isVerifiedProfile?: boolean;
    crimeType?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<PersonRecord[]> {
    let sql = 'SELECT * FROM persons WHERE 1=1';
    const params: any[] = [];

    if (filters.district) {
      params.push(filters.district.toLowerCase());
      sql += ` AND LOWER(district) = $${params.length}`;
    }

    if (filters.policeStation) {
      params.push(`%${filters.policeStation.toLowerCase()}%`);
      sql += ` AND LOWER(police_station) LIKE $${params.length}`;
    }

    if (filters.riskRating) {
      params.push(filters.riskRating.toLowerCase());
      sql += ` AND LOWER(risk_rating) = $${params.length}`;
    }

    if (filters.afisStatus) {
      params.push(`%"afisStatus":"${filters.afisStatus}"%`);
      sql += ` AND biometrics::text LIKE $${params.length}`;
    }

    if (filters.caseId) {
      params.push(`%${filters.caseId.toLowerCase()}%`);
      sql += ` AND LOWER(linked_cases::text) LIKE $${params.length}`;
    }

    if (typeof filters.isVerifiedProfile === 'boolean') {
      params.push(filters.isVerifiedProfile);
      sql += ` AND is_verified_profile = $${params.length}`;
    }

    if (filters.crimeType) {
      params.push(filters.crimeType);
      sql += ` AND primary_crime_type = $${params.length}`;
    }

    if (filters.locality) {
      params.push(`%${filters.locality.toLowerCase().trim()}%`);
      sql += ` AND (
        LOWER(address) LIKE $${params.length} OR
        LOWER(police_station) LIKE $${params.length} OR
        LOWER(district) LIKE $${params.length} OR
        LOWER(state) LIKE $${params.length} OR
        pincode LIKE $${params.length}
      )`;
    }

    if (filters.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      sql += ` AND (
        LOWER(full_name) LIKE $${params.length} OR
        LOWER(cpid) LIKE $${params.length} OR
        LOWER(aliases::text) LIKE $${params.length} OR
        LOWER(father_or_spouse_name) LIKE $${params.length} OR
        LOWER(primary_phone) LIKE $${params.length} OR
        LOWER(police_station) LIKE $${params.length} OR
        LOWER(district) LIKE $${params.length} OR
        LOWER(linked_cases::text) LIKE $${params.length}
      )`;
    }

    sql += ' ORDER BY updated_at DESC';

    if (filters.limit) {
      params.push(filters.limit);
      sql += ` LIMIT $${params.length}`;
    }

    if (filters.offset) {
      params.push(filters.offset);
      sql += ` OFFSET $${params.length}`;
    }

    const res = await PostgresService.query(sql, params);
    return res.rows.map(r => this.mapRowToPerson(r));
  }

  public static async create(p: PersonRecord): Promise<PersonRecord> {
    await PostgresService.query(`
      INSERT INTO persons (
        id, cpid, full_name, aliases, father_or_spouse_name, gender,
        dob_or_age, nationality, primary_phone, identification_marks,
        biometrics, address, police_station, district, state, pincode,
        risk_rating, primary_crime_type, modus_operandi, gang_or_syndicate_affiliation,
        previous_convictions_count, linked_cases, is_verified_profile,
        verification_authority, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      )
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        aliases = EXCLUDED.aliases,
        father_or_spouse_name = EXCLUDED.father_or_spouse_name,
        primary_phone = EXCLUDED.primary_phone,
        identification_marks = EXCLUDED.identification_marks,
        biometrics = EXCLUDED.biometrics,
        address = EXCLUDED.address,
        risk_rating = EXCLUDED.risk_rating,
        primary_crime_type = EXCLUDED.primary_crime_type,
        modus_operandi = EXCLUDED.modus_operandi,
        gang_or_syndicate_affiliation = EXCLUDED.gang_or_syndicate_affiliation,
        previous_convictions_count = EXCLUDED.previous_convictions_count,
        linked_cases = EXCLUDED.linked_cases,
        is_verified_profile = EXCLUDED.is_verified_profile,
        verification_authority = EXCLUDED.verification_authority,
        updated_at = CURRENT_TIMESTAMP
    `, [
      p.id, p.cpid || null, p.fullName, JSON.stringify(p.aliases || []),
      p.fatherOrSpouseName || null, p.gender || null, p.dobOrAge || null,
      p.nationality || null, p.primaryPhone || null, JSON.stringify(p.identificationMarks || []),
      JSON.stringify(p.biometrics || {}), p.address || null, p.policeStation || null,
      p.district || null, p.state || null, p.pincode || null, p.riskRating || null,
      p.primaryCrimeType || null, p.modusOperandi || null, p.gangOrSyndicateAffiliation || null,
      p.previousConvictionsCount || 0, JSON.stringify(p.linkedCases || []),
      !!p.isVerifiedProfile, p.verificationAuthority || null,
      p.createdAt || new Date().toISOString(), p.updatedAt || new Date().toISOString()
    ]);
    return p;
  }

  public static async update(id: string, updates: Partial<PersonRecord>): Promise<PersonRecord | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...updates, updatedAt: new Date().toISOString() };
    await this.create(merged);
    return merged;
  }

  public static async count(): Promise<number> {
    const res = await PostgresService.query('SELECT COUNT(*) FROM persons');
    return parseInt(res.rows[0].count, 10);
  }
}
