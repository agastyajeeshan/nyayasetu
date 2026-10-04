import { PostgresService } from '../db/postgres.js';
import { Review, ReviewComment, ReviewStatus, UserRole } from '../types/index.js';

export class ReviewRepository {
  public static mapRowToReview(row: any): Review {
    return {
      id: row.id,
      documentId: row.document_id,
      versionNumber: Number(row.version_number),
      reviewerId: row.reviewer_id,
      reviewerName: row.reviewer_name,
      reviewerRole: row.reviewer_role as UserRole,
      status: row.status as ReviewStatus,
      feedback: row.feedback || undefined,
      reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    };
  }

  public static mapRowToComment(row: any): ReviewComment {
    return {
      id: row.id,
      reviewId: row.review_id,
      documentId: row.document_id,
      authorId: row.author_id,
      authorName: row.author_name,
      authorRole: row.author_role as UserRole,
      comment: row.comment,
      suggestedChanges: row.suggested_changes || undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
    };
  }

  public static async findByDocId(documentId: string): Promise<Review[]> {
    const res = await PostgresService.query(
      'SELECT * FROM reviews WHERE document_id = $1 ORDER BY created_at DESC',
      [documentId]
    );
    const reviews = res.rows.map(r => this.mapRowToReview(r));
    for (const r of reviews) {
      r.comments = await this.getComments(r.id);
    }
    return reviews;
  }

  public static async findById(id: string): Promise<Review | null> {
    const res = await PostgresService.query('SELECT * FROM reviews WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const review = this.mapRowToReview(res.rows[0]);
    review.comments = await this.getComments(review.id);
    return review;
  }

  public static async create(r: Review): Promise<Review> {
    await PostgresService.query(`
      INSERT INTO reviews (
        id, document_id, version_number, reviewer_id, reviewer_name,
        reviewer_role, status, feedback, reviewed_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        feedback = EXCLUDED.feedback,
        reviewed_at = EXCLUDED.reviewed_at
    `, [
      r.id, r.documentId, r.versionNumber, r.reviewerId, r.reviewerName,
      r.reviewerRole, r.status, r.feedback || null, r.reviewedAt || null,
      r.createdAt || new Date().toISOString()
    ]);
    return r;
  }

  public static async update(id: string, updates: Partial<Review>): Promise<Review | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...updates };
    await this.create(merged);
    return merged;
  }

  public static async addComment(c: ReviewComment): Promise<ReviewComment> {
    await PostgresService.query(`
      INSERT INTO review_comments (
        id, review_id, document_id, author_id, author_name, author_role,
        comment, suggested_changes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING
    `, [
      c.id, c.reviewId, c.documentId, c.authorId, c.authorName, c.authorRole,
      c.comment, c.suggestedChanges || null, c.createdAt || new Date().toISOString()
    ]);
    return c;
  }

  public static async getComments(reviewId: string): Promise<ReviewComment[]> {
    const res = await PostgresService.query(
      'SELECT * FROM review_comments WHERE review_id = $1 ORDER BY created_at ASC',
      [reviewId]
    );
    return res.rows.map(r => this.mapRowToComment(r));
  }

  public static async getCommentsByDocId(documentId: string): Promise<ReviewComment[]> {
    const res = await PostgresService.query(
      'SELECT * FROM review_comments WHERE document_id = $1 ORDER BY created_at ASC',
      [documentId]
    );
    return res.rows.map(r => this.mapRowToComment(r));
  }
}
