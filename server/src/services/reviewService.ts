import { v4 as uuidv4 } from 'uuid';
import { CryptoService } from './cryptoService.js';
import { LedgerService } from './ledgerService.js';
import { AuditService } from './auditService.js';
import {
  DocumentRepository,
  UserRepository,
  SignatureRepository,
  ReviewRepository
} from '../repositories/index.js';
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
  public static async addComment(params: SubmitReviewCommentParams): Promise<ReviewComment> {
    const doc = await DocumentRepository.findById(params.documentId);
    if (!doc || doc.isDeleted) throw new Error('Document not found');

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

    await ReviewRepository.addComment(comment);

    await AuditService.log({
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
  public static async updateReviewStatus(params: UpdateReviewStatusParams): Promise<Document> {
    const doc = await DocumentRepository.findById(params.documentId);
    if (!doc || doc.isDeleted) throw new Error('Document not found');

    const oldStatus = doc.reviewStatus;
    const updated = await DocumentRepository.update(doc.id, {
      reviewStatus: params.status,
      updatedAt: new Date().toISOString()
    });

    await AuditService.log({
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

    return updated || doc;
  }

  /**
   * Cryptographically signs a document version using officer's digital certificate key
   */
  public static async signDocument(params: SignDocumentParams): Promise<DigitalSignature> {
    const doc = await DocumentRepository.findById(params.documentId);
    if (!doc || doc.isDeleted) throw new Error('Document not found');

    const versions = await DocumentRepository.findVersionsByDocId(doc.id);
    const version = versions.find(v => v.versionNumber === params.versionNumber);
    if (!version) throw new Error(`Version v${params.versionNumber} does not exist.`);

    // Retrieve officer's private key from PostgreSQL (or generate and store if missing for prototype)
    let privateKey = await UserRepository.getPrivateKey(params.actorId);
    let user = await UserRepository.findById(params.actorId);

    if (!privateKey || !user?.publicKey) {
      const keys = CryptoService.generateKeyPair();
      privateKey = keys.privateKey;
      await UserRepository.setPrivateKey(params.actorId, keys.privateKey);
      if (user) {
        await UserRepository.updateProfile(params.actorId, { publicKey: keys.publicKey });
        user.publicKey = keys.publicKey;
      }
    }

    const timestamp = new Date().toISOString();
    const signatureDigest = `${version.sha256Hash}:${params.actorId}:${params.actorAgencyId}:${params.versionNumber}:${timestamp}`;
    const signatureValue = CryptoService.signData(signatureDigest, privateKey);

    const signatureId = `SIG-${Date.now()}-${uuidv4().slice(0, 6)}`;

    // Anchor to ledger
    const ledgerBlock = await LedgerService.createBlock({
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

    await SignatureRepository.create(signature);

    // Update doc status to Signed in PostgreSQL
    await DocumentRepository.update(doc.id, {
      reviewStatus: 'Signed',
      updatedAt: new Date().toISOString()
    });

    await AuditService.log({
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
  public static async verifySignature(signatureId: string): Promise<{
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
  }> {
    const signature = await SignatureRepository.findById(signatureId);
    if (!signature) throw new Error('Signature record not found.');

    const doc = await DocumentRepository.findById(signature.documentId);
    const versions = doc ? await DocumentRepository.findVersionsByDocId(doc.id) : [];
    const currentVersion = versions.find(v => v.versionNumber === doc?.currentVersionNumber);

    const user = await UserRepository.findById(signature.signerId);
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
