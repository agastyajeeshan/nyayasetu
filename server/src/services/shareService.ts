import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { CryptoService } from './cryptoService.js';
import { AuditService } from './auditService.js';
import {
  ShareRepository,
  DocumentRepository,
  CaseRepository
} from '../repositories/index.js';
import { ShareLink, ShareAccessLog, UserRole } from '../types/index.js';

export interface CreateShareParams {
  documentId?: string;
  caseId?: string;
  recipientEmail: string;
  recipientName: string;
  recipientOrg: string;
  permission: 'VIEW_ONLY' | 'DOWNLOAD_ALLOWED';
  expiresInHours?: number;
  passcode?: string;
  purpose: string;
  watermarkText?: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actorDepartment: string;
  ipAddress: string;
}

export class ShareService {
  /**
   * Generates a secure, unguessable expiring share link in PostgreSQL
   */
  public static async createShare(params: CreateShareParams): Promise<ShareLink> {
    if (!params.documentId && !params.caseId) {
      throw new Error('Must specify either a documentId or caseId to share.');
    }

    let resourceTitle = 'Confidential Resource';
    if (params.documentId) {
      const doc = await DocumentRepository.findById(params.documentId);
      if (!doc) throw new Error('Document not found');
      resourceTitle = `${doc.documentNumber}: ${doc.title}`;
    } else if (params.caseId) {
      const caseItem = await CaseRepository.findById(params.caseId);
      if (!caseItem) throw new Error('Case not found');
      resourceTitle = `${caseItem.caseNumber}: ${caseItem.title}`;
    }

    const shareToken = crypto.randomBytes(24).toString('hex');
    const shareId = `SHR-${Date.now()}-${uuidv4().slice(0, 6)}`;
    const hours = params.expiresInHours || 48;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    const accessPasscodeHash = params.passcode 
      ? CryptoService.sha256(params.passcode)
      : undefined;

    const watermark = params.watermarkText || `CONFIDENTIAL - For ${params.recipientName} (${params.recipientOrg}) - DO NOT DISTRIBUTE`;

    const share: ShareLink = {
      id: shareId,
      shareToken,
      documentId: params.documentId,
      caseId: params.caseId,
      resourceType: params.documentId ? 'DOCUMENT' : 'CASE',
      resourceTitle,
      sharedByUserId: params.actorId,
      sharedByName: params.actorName,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName,
      recipientOrg: params.recipientOrg,
      permission: params.permission,
      watermarkText: watermark,
      purpose: params.purpose,
      accessPasscodeHash,
      expiresAt,
      isRevoked: false,
      accessCount: 0,
      createdAt: new Date().toISOString()
    };

    await ShareRepository.create(share);

    await AuditService.log({
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      organization: 'Ministry of Home Affairs',
      department: params.actorDepartment,
      action: 'SHARE_LINK_CREATED',
      resourceType: 'SHARE',
      resourceId: share.id,
      resourceName: resourceTitle,
      details: `Expiring share link (${params.permission}) created for ${params.recipientName} (${params.recipientOrg}). Purpose: ${params.purpose}. Expires: ${expiresAt}`,
      outcome: 'SUCCESS',
      ipAddress: params.ipAddress
    });

    return share;
  }

  /**
   * Accesses a shared resource via token in PostgreSQL
   */
  public static async accessSharedResource(token: string, passcode?: string, ipAddress = '127.0.0.1', userAgent = ''): Promise<{
    success: boolean;
    share?: ShareLink;
    resource?: any;
    error?: string;
  }> {
    const share = await ShareRepository.findByToken(token);
    if (!share) {
      return { success: false, error: 'Invalid or non-existent share link.' };
    }

    if (share.isRevoked) {
      await this.logAccess(share.id, 'REVOKED_ATTEMPT', 'DENIED', ipAddress, userAgent);
      return { success: false, error: 'This secure share link has been revoked by the issuing authority.' };
    }

    if (new Date(share.expiresAt).getTime() < Date.now()) {
      await this.logAccess(share.id, 'PREVIEW', 'DENIED', ipAddress, userAgent);
      return { success: false, error: 'This secure share link has expired.' };
    }

    if (share.accessPasscodeHash) {
      if (!passcode || CryptoService.sha256(passcode) !== share.accessPasscodeHash) {
        await this.logAccess(share.id, 'FAILED_PASSCODE', 'DENIED', ipAddress, userAgent);
        return { success: false, error: 'Invalid access passcode required for this protected document.' };
      }
    }

    await ShareRepository.incrementAccessCount(share.id);
    share.accessCount += 1;
    await this.logAccess(share.id, 'PREVIEW', 'SUCCESS', ipAddress, userAgent);

    let resource: any = null;
    if (share.documentId) {
      const doc = await DocumentRepository.findById(share.documentId);
      const versions = await DocumentRepository.findVersionsByDocId(share.documentId);
      resource = { document: doc, versions };
    } else if (share.caseId) {
      const c = await CaseRepository.findById(share.caseId);
      const docs = await DocumentRepository.findByCaseId(share.caseId);
      resource = { case: c, documents: docs };
    }

    return { success: true, share, resource };
  }

  /**
   * Revokes a share link immediately in PostgreSQL
   */
  public static async revokeShare(shareId: string, actor: { id: string; name: string; role: UserRole; ip: string }): Promise<boolean> {
    const share = await ShareRepository.findById(shareId);
    if (!share) throw new Error('Share link not found.');

    await ShareRepository.revoke(share.id, actor.id);

    await AuditService.log({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      organization: 'Ministry of Home Affairs',
      department: 'NCRB',
      action: 'SHARE_LINK_REVOKED',
      resourceType: 'SHARE',
      resourceId: share.id,
      resourceName: share.resourceTitle,
      details: `Share link for ${share.recipientName} (${share.recipientOrg}) was REVOKED by ${actor.name}`,
      outcome: 'SUCCESS',
      ipAddress: actor.ip
    });

    return true;
  }

  private static async logAccess(shareId: string, action: 'PREVIEW' | 'DOWNLOAD' | 'FAILED_PASSCODE' | 'REVOKED_ATTEMPT', outcome: 'SUCCESS' | 'DENIED', ip: string, ua: string) {
    const log: ShareAccessLog = {
      id: `SHL-${Date.now()}-${uuidv4().slice(0, 6)}`,
      shareId,
      accessedAt: new Date().toISOString(),
      ipAddress: ip,
      userAgent: ua,
      action,
      outcome
    };
    await ShareRepository.logAccess(log);
  }
}
