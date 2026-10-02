import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { CryptoService } from './cryptoService.js';
import { LedgerService } from './ledgerService.js';
import { AuditService } from './auditService.js';
import {
  Review,
  ReviewComment,
  ReviewStatus,
  DigitalSignature,
  UserRole,
  Document
} from '../types/index.js';

export interface SubmitReviewCommentParams {
  documentId: string;
  comment: string;
  suggestedChanges?: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actorDepartment: string;
  ipAddress: string;
}

export interface UpdateReviewStatusParams {
  documentId: string;
  status: ReviewStatus;
  feedback?: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actorDepartment: string;
  ipAddress: string;
}

export interface SignDocumentParams {
  documentId: string;
  versionNumber: number;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actorAgencyId: string;
  actorDepartment: string;
  ipAddress: string;
}

export class ReviewService {
  /**
   * Adds a review comment without modifying original document
   */
  public static addComment(params: SubmitReviewCommentParams): ReviewComment {
    const doc = db.documents.find(d => d.id === params.documentId && !d.isDeleted);
    if (!doc) throw new Error('Document not found');

    const commentId = `CMT-${Date.now()}-${uuidv4().slice(0, 6)}`;
    const comment: ReviewComment = {
      id: commentId,
      reviewId: `REV-${doc.id}`,
      documentId: doc.id,
      authorId: params.actorId,
      authorName: params.actorName,
      authorRole: params.actorRole,
      comment: params.comment,
      suggestedChanges: params.suggestedChanges,
      createdAt: new Date().toISOString()
    };

    db.review_comments.push(comment);
    db.save();

    AuditService.log({
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      organization: 'Ministry of Home Affairs',
      department: params.actorDepartment,
      action: 'REVIEW_COMMENT_ADDED',
      resourceType: 'DOCUMENT',
      resourceId: doc.id,
      resourceName: doc.documentNumber,
      details: `Review comment added by ${params.actorName} (${params.actorRole}): "${params.comment.slice(0, 40)}..."`,
      outcome: 'SUCCESS',
      ipAddress: params.ipAddress
    });

    return comment;
  }

  /**
   * Updates document review status (e.g. Approved, Changes Requested)
   */
  public static updateReviewStatus(params: UpdateReviewStatusParams): Document {
    const doc = db.documents.find(d => d.id === params.documentId && !d.isDeleted);
    if (!doc) throw new Error('Document not found');

    const oldStatus = doc.reviewStatus;
    doc.reviewStatus = params.status;
    doc.updatedAt = new Date().toISOString();
    db.save();

    AuditService.log({
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      organization: 'Ministry of Home Affairs',
      department: params.actorDepartment,
      action: 'REVIEW_STATUS_UPDATED',
      resourceType: 'DOCUMENT',
      resourceId: doc.id,
      resourceName: doc.documentNumber,
      details: `Document ${doc.documentNumber} review status updated from '${oldStatus}' to '${params.status}'. Feedback: ${params.feedback || 'None'}`,
      outcome: 'SUCCESS',
      ipAddress: params.ipAddress
    });

    return doc as any;
  }

  /**
   * Cryptographically signs a document version using officer's digital certificate key
   */
  public static signDocument(params: SignDocumentParams): DigitalSignature {
    const doc = db.documents.find(d => d.id === params.documentId && !d.isDeleted);
    if (!doc) throw new Error('Document not found');

    const version = db.document_versions.find(v => v.documentId === doc.id && v.versionNumber === params.versionNumber);
    if (!version) throw new Error(`Version v${params.versionNumber} does not exist.`);

    // Retrieve officer's private key (or generate and store one if missing for prototype)
    let privateKey = db.user_private_keys[params.actorId];
    let user = db.users.find(u => u.id === params.actorId);

    if (!privateKey || !user?.publicKey) {
      const keys = CryptoService.generateKeyPair();
      privateKey = keys.privateKey;
      db.user_private_keys[params.actorId] = keys.privateKey;
      if (user) {
        user.publicKey = keys.publicKey;
      }
    }

    const timestamp = new Date().toISOString();
    const signatureDigest = `${version.sha256Hash}:${params.actorId}:${params.actorAgencyId}:${params.versionNumber}:${timestamp}`;
    const signatureValue = CryptoService.signData(signatureDigest, privateKey);

    const signatureId = `SIG-${Date.now()}-${uuidv4().slice(0, 6)}`;

    // Anchor to ledger
    const ledgerBlock = LedgerService.createBlock({
      eventType: 'DOCUMENT_DIGITALLY_SIGNED',
      resourceType: 'DOCUMENT',
      resourceId: doc.id,
      resourceHash: version.sha256Hash,
      actorId: params.actorId,
      actorName: params.actorName,
      payload: {
        signatureId,
        documentNumber: doc.documentNumber,
        versionNumber: params.versionNumber,
        signerAgencyId: params.actorAgencyId,
        signerRole: params.actorRole,
        signatureAlgorithm: 'RSA-SHA256',
        timestamp
      }
    });

    const signature: DigitalSignature = {
      id: signatureId,
      documentId: doc.id,
      versionNumber: params.versionNumber,
      versionHash: version.sha256Hash,
      signerId: params.actorId,
      signerName: params.actorName,
      signerRole: params.actorRole,
      signerAgencyId: params.actorAgencyId,
      signatureTimestamp: timestamp,
      signatureAlgorithm: 'RSA-SHA256 (PKCS#1 v1.5)',
      signatureValue,
      publicKeyCertificate: user?.publicKey || 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...',
      verificationStatus: 'VALID',
      verifiedAt: timestamp,
      ledgerBlockId: ledgerBlock.blockHash
    };

    db.digital_signatures.push(signature);

    // Update doc status to Signed
    doc.reviewStatus = 'Signed';
    doc.updatedAt = new Date().toISOString();
    db.save();

    AuditService.log({
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      organization: 'Ministry of Home Affairs',
      department: params.actorDepartment,
      action: 'DOCUMENT_DIGITALLY_SIGNED',
      resourceType: 'DOCUMENT',
      resourceId: doc.id,
      resourceName: doc.documentNumber,
      details: `Officer ${params.actorName} (${params.actorAgencyId}) signed document ${doc.documentNumber} v${params.versionNumber}. Bound to hash ${version.sha256Hash.slice(0, 16)}...`,
      outcome: 'SUCCESS',
      ipAddress: params.ipAddress
    });

    return signature;
  }

  /**
   * Verifies the cryptographic validity of an existing digital signature
   */
  public static verifySignature(signatureId: string): {
    isValid: boolean;
    signerName: string;
    signerRole: string;
    versionNumber: number;
    versionHash: string;
    currentDocumentVersionHash: string;
    isVersionCurrent: boolean;
    signatureAlgorithm: string;
    timestamp: string;
    verifiedAt: string;
    message: string;
  } {
    const signature = db.digital_signatures.find(s => s.id === signatureId);
    if (!signature) throw new Error('Signature record not found.');

    const doc = db.documents.find(d => d.id === signature.documentId);
    const currentVersion = db.document_versions.find(v => v.documentId === signature.documentId && v.versionNumber === doc?.currentVersionNumber);

    const user = db.users.find(u => u.id === signature.signerId);
    const publicKey = user?.publicKey || signature.publicKeyCertificate;

    const signatureDigest = `${signature.versionHash}:${signature.signerId}:${signature.signerAgencyId}:${signature.versionNumber}:${signature.signatureTimestamp}`;
    const isCryptoValid = CryptoService.verifySignature(signatureDigest, signature.signatureValue, publicKey);

    const isVersionCurrent = currentVersion ? currentVersion.sha256Hash === signature.versionHash : true;

    return {
      isValid: isCryptoValid,
      signerName: signature.signerName,
      signerRole: signature.signerRole,
      versionNumber: signature.versionNumber,
      versionHash: signature.versionHash,
      currentDocumentVersionHash: currentVersion?.sha256Hash || 'N/A',
      isVersionCurrent,
      signatureAlgorithm: signature.signatureAlgorithm,
      timestamp: signature.signatureTimestamp,
      verifiedAt: new Date().toISOString(),
      message: isCryptoValid 
        ? `Valid digital signature verified for Officer ${signature.signerName} (${signature.signerAgencyId}). Bound to version hash.`
        : 'INVALID SIGNATURE: Cryptographic verification failed or signature altered.'
    };
  }
}
