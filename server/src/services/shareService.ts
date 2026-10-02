import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { CryptoService } from './cryptoService.js';
import { AuditService } from './auditService.js';
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
   * Generates a secure, unguessable expiring share link
   */
  public static createShare(params: CreateShareParams): ShareLink {
    if (!params.documentId && !params.caseId) {
      throw new Error('Must specify either a documentId or caseId to share.');
    }

    let resourceTitle = 'Confidential Resource';
    if (params.documentId) {
      const doc = db.documents.find(d => d.id === params.documentId);
      if (!doc) throw new Error('Document not found');
      resourceTitle = `${doc.documentNumber}: ${doc.title}`;
    } else if (params.caseId) {
      const caseItem = db.cases.find(c => c.id === params.caseId);
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

    db.share_links.unshift(share);
    db.save();

    AuditService.log({
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
   * Accesses a shared resource via token
   */
  public static accessSharedResource(token: string, passcode?: string, ipAddress = '127.0.0.1', userAgent = ''): {
    success: boolean;
    share?: ShareLink;
    resource?: any;
    error?: string;
  } {
    const share = db.share_links.find(s => s.shareToken === token);
    if (!share) {
      return { success: false, error: 'Invalid or non-existent share link.' };
    }

    if (share.isRevoked) {
      this.logAccess(share.id, 'REVOKED_ATTEMPT', 'DENIED', ipAddress, userAgent);
      return { success: false, error: 'This secure share link has been revoked by the issuing authority.' };
    }

    if (new Date(share.expiresAt).getTime() < Date.now()) {
      this.logAccess(share.id, 'PREVIEW', 'DENIED', ipAddress, userAgent);
      return { success: false, error: 'This secure share link has expired.' };
    }

    if (share.accessPasscodeHash) {
      if (!passcode || CryptoService.sha256(passcode) !== share.accessPasscodeHash) {
        this.logAccess(share.id, 'FAILED_PASSCODE', 'DENIED', ipAddress, userAgent);
        return { success: false, error: 'Invalid access passcode required for this protected document.' };
      }
    }

    share.accessCount += 1;
    this.logAccess(share.id, 'PREVIEW', 'SUCCESS', ipAddress, userAgent);
    db.save();

    let resource: any = null;
    if (share.documentId) {
      const doc = db.documents.find(d => d.id === share.documentId);
      const versions = db.document_versions.filter(v => v.documentId === share.documentId);
      resource = { document: doc, versions };
    } else if (share.caseId) {
      const c = db.cases.find(c => c.id === share.caseId);
      const docs = db.documents.filter(d => d.caseId === share.caseId && !d.isDeleted);
      resource = { case: c, documents: docs };
    }

    return { success: true, share, resource };
  }

  /**
   * Revokes a share link immediately
   */
  public static revokeShare(shareId: string, actor: { id: string; name: string; role: UserRole; ip: string }): boolean {
    const share = db.share_links.find(s => s.id === shareId);
    if (!share) throw new Error('Share link not found.');

    share.isRevoked = true;
    share.revokedAt = new Date().toISOString();
    share.revokedBy = actor.id;
    db.save();

    AuditService.log({
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

  private static logAccess(shareId: string, action: 'PREVIEW' | 'DOWNLOAD' | 'FAILED_PASSCODE' | 'REVOKED_ATTEMPT', outcome: 'SUCCESS' | 'DENIED', ip: string, ua: string) {
    const log: ShareAccessLog = {
      id: `SHL-${Date.now()}-${uuidv4().slice(0, 6)}`,
      shareId,
      accessedAt: new Date().toISOString(),
      ipAddress: ip,
      userAgent: ua,
      action,
      outcome
    };
    db.share_access_logs.push(log);
    db.save();
  }
}
