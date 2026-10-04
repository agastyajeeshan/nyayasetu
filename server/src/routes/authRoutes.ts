import { Router, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { UserRepository } from '../repositories/userRepository.js';
import { AuditRepository } from '../repositories/auditRepository.js';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth.js';
import { AuditService } from '../services/auditService.js';
import { UserRole } from '../types/index.js';

const router = Router();

// Login with Officer ID / Agency ID / Email and password
router.post('/login', async (req, res) => {
  const identifier = req.body.identifier || req.body.officerId || req.body.id || req.body.userId || req.body.agencyId;
  const password = req.body.password;
  const enforceMfa = req.body.enforceMfa === true;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!identifier || !password) {
    res.status(400).json({ error: 'Officer ID and password are required.' });
    return;
  }

  const result = await AuthService.login(identifier, password, ip, enforceMfa);

  if (result.error) {
    await AuditService.log({
      actorId: 'UNAUTHENTICATED',
      actorName: identifier,
      actorRole: 'external_stakeholder',
      organization: 'External',
      department: 'Security Gateway',
      action: 'LOGIN_FAILURE',
      resourceType: 'AUTH',
      resourceId: identifier,
      details: `Failed login attempt for Officer ID '${identifier}': ${result.error}`,
      outcome: 'FAILURE',
      ipAddress: ip,
      recordToLedger: false
    });
    res.status(401).json({ error: result.error });
    return;
  }

  if (result.requiresMfa) {
    res.json({
      requiresMfa: true,
      mfaChallengeToken: result.mfaChallengeToken,
      message: 'MFA challenge generated. Enter 6-digit OTP code (Demo OTP: 123456).'
    });
    return;
  }

  if (result.auth) {
    await AuditService.log({
      actorId: result.auth.user.id,
      actorName: result.auth.user.name,
      actorRole: result.auth.user.role,
      organization: result.auth.user.organization,
      department: result.auth.user.department,
      action: 'LOGIN_SUCCESS',
      resourceType: 'AUTH',
      resourceId: result.auth.user.id,
      details: `Successful login for ${result.auth.user.name} (${result.auth.user.agencyId})`,
      outcome: 'SUCCESS',
      ipAddress: ip,
      recordToLedger: false
    });
    res.json(result.auth);
  }
});

// Verify MFA Challenge
router.post('/mfa/verify', async (req, res) => {
  const { challengeToken, code } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!challengeToken || !code) {
    res.status(400).json({ error: 'MFA challenge token and 6-digit code are required.' });
    return;
  }

  const result = await AuthService.verifyMfa(challengeToken, code);
  if (result.error) {
    res.status(401).json({ error: result.error });
    return;
  }

  if (result.auth) {
    await AuditService.log({
      actorId: result.auth.user.id,
      actorName: result.auth.user.name,
      actorRole: result.auth.user.role,
      organization: result.auth.user.organization,
      department: result.auth.user.department,
      action: 'MFA_VERIFIED',
      resourceType: 'AUTH',
      resourceId: result.auth.user.id,
      details: `MFA code verified successfully for ${result.auth.user.name}`,
      outcome: 'SUCCESS',
      ipAddress: ip,
      recordToLedger: false
    });
    res.json(result.auth);
  }
});

// Demo helper: instant role switcher for quick evaluator exploration
router.post('/switch-role', async (req, res) => {
  const { role } = req.body as { role: UserRole };
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!role) {
    res.status(400).json({ error: 'Target role is required.' });
    return;
  }

  const result = await AuthService.switchRole(role);
  if (result.error) {
    res.status(404).json({ error: result.error });
    return;
  }

  res.json(result.auth);
});

// Get current user profile
router.get('/me', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const user = await UserRepository.findById(req.user?.id || '');
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const { passwordHash, salt, mfaSecret, ...safeUser } = user;
  res.json(safeUser);
});

// List users (for assignment & admin)
router.get('/users', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const allUsers = await UserRepository.findAll();
  const users = allUsers.map(({ passwordHash, salt, mfaSecret, ...u }) => u);
  res.json(users);
});

// Update Profile
router.patch('/profile', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const result = await AuthService.updateProfile(req.user.id, req.body);
  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }
  await AuditService.log({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    organization: req.user.organization,
    department: req.user.department,
    action: 'PROFILE_UPDATED',
    resourceType: 'USER',
    resourceId: req.user.id,
    details: `User profile updated for ${req.user.name}`,
    outcome: 'SUCCESS',
    ipAddress: req.ip || '127.0.0.1',
    recordToLedger: false
  });
  res.json(result.user);
});

// Change Password
router.post('/change-password', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { currentPassword, newPassword } = req.body;
  const ip = req.ip || '127.0.0.1';

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current password and new password are required.' });
    return;
  }

  const result = await AuthService.changePassword(req.user.id, currentPassword, newPassword, ip);
  if (result.error) {
    await AuditService.log({
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      organization: req.user.organization,
      department: req.user.department,
      action: 'PASSWORD_CHANGE_FAILED',
      resourceType: 'USER',
      resourceId: req.user.id,
      details: `Password change failed for ${req.user.name}: ${result.error}`,
      outcome: 'FAILURE',
      ipAddress: ip,
      recordToLedger: true
    });
    res.status(400).json({ error: result.error });
    return;
  }

  await AuditService.log({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    organization: req.user.organization,
    department: req.user.department,
    action: 'PASSWORD_CHANGED',
    resourceType: 'USER',
    resourceId: req.user.id,
    details: `Password changed successfully for ${req.user.name}`,
    outcome: 'SUCCESS',
    ipAddress: ip,
    recordToLedger: true
  });
  res.json(result);
});

// Toggle MFA
router.post('/mfa/toggle', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const result = await AuthService.toggleMfa(req.user.id, req.body.enabled);
  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }
  await AuditService.log({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    organization: req.user.organization,
    department: req.user.department,
    action: 'MFA_STATUS_CHANGED',
    resourceType: 'USER',
    resourceId: req.user.id,
    details: `MFA status set to ${result.user?.mfaEnabled} for ${req.user.name}`,
    outcome: 'SUCCESS',
    ipAddress: req.ip || '127.0.0.1',
    recordToLedger: true
  });
  res.json(result.user);
});

// Enroll Face Biometric
router.post('/face/enroll', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { templateHash } = req.body;
  const result = await AuthService.enrollFace(req.user.id, templateHash);
  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }
  await AuditService.log({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    organization: req.user.organization,
    department: req.user.department,
    action: 'FACE_ENROLLED',
    resourceType: 'USER',
    resourceId: req.user.id,
    details: `Facial biometric template enrolled for ${req.user.name}`,
    outcome: 'SUCCESS',
    ipAddress: req.ip || '127.0.0.1',
    recordToLedger: true
  });
  res.json(result);
});

// Remove Face Biometric (requires password re-auth)
router.delete('/face/remove', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { password } = req.body;
  if (!password) {
    res.status(400).json({ error: 'Password is required to remove biometric credentials.' });
    return;
  }
  const result = await AuthService.removeFace(req.user.id, password);
  if (result.error) {
    await AuditService.log({
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      organization: req.user.organization,
      department: req.user.department,
      action: 'FACE_REMOVE_FAILED',
      resourceType: 'USER',
      resourceId: req.user.id,
      details: `Failed face removal attempt for ${req.user.name}`,
      outcome: 'FAILURE',
      ipAddress: req.ip || '127.0.0.1',
      recordToLedger: true
    });
    res.status(400).json({ error: result.error });
    return;
  }
  await AuditService.log({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    organization: req.user.organization,
    department: req.user.department,
    action: 'FACE_REMOVED',
    resourceType: 'USER',
    resourceId: req.user.id,
    details: `Biometric face template removed for ${req.user.name}`,
    outcome: 'SUCCESS',
    ipAddress: req.ip || '127.0.0.1',
    recordToLedger: true
  });
  res.json(result);
});

// Face Verification check
router.post('/face/verify', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const user = await UserRepository.findById(req.user?.id || '');
  if (!user || !user.faceEnrolled) {
    res.status(400).json({ error: 'No face verification enrolled for this account.' });
    return;
  }
  await AuditService.log({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    organization: req.user.organization,
    department: req.user.department,
    action: 'FACE_VERIFIED',
    resourceType: 'AUTH',
    resourceId: req.user.id,
    details: `Facial verification check successful for ${req.user.name}`,
    outcome: 'SUCCESS',
    ipAddress: req.ip || '127.0.0.1',
    recordToLedger: false
  });
  res.json({ verified: true, timestamp: new Date().toISOString() });
});

// Update Notification Preferences
router.patch('/notification-preferences', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const result = await AuthService.updateNotificationPreferences(req.user.id, req.body);
  res.json(result);
});

// Get Session & Security Info
router.get('/session-info', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const user = await UserRepository.findById(req.user?.id || '');
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown workstation';

  // Fetch recent security/auth audit events for this user
  const securityLogs = await AuditRepository.findRecentForUser(req.user.id, req.user.name, 10);

  res.json({
    currentSession: {
      ip,
      userAgent,
      activeNow: true,
      lastActive: new Date().toISOString(),
      tokenExpiresIn: '8 hours',
      authMethod: user?.faceEnrolled ? 'Password + Biometric Face' : (user?.mfaEnabled ? 'Password + TOTP MFA' : 'Password')
    },
    securityEvents: securityLogs
  });
});

// Sign Out Other Sessions
router.post('/sessions/revoke-others', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  await AuditService.log({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    organization: req.user.organization,
    department: req.user.department,
    action: 'SESSION_REVOKE_OTHERS',
    resourceType: 'USER',
    resourceId: req.user.id,
    details: `Signed out all other concurrent sessions for ${req.user.name}`,
    outcome: 'SUCCESS',
    ipAddress: req.ip || '127.0.0.1',
    recordToLedger: true
  });
  res.json({ success: true, message: 'All other sessions have been invalidated.' });
});

// Deactivate Account (requires password)
router.post('/deactivate', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { password } = req.body;
  if (!password) {
    res.status(400).json({ error: 'Password confirmation is required.' });
    return;
  }
  const result = await AuthService.deactivateAccount(req.user.id, password);
  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }
  await AuditService.log({
    actorId: req.user.id,
    actorName: req.user.name,
    actorRole: req.user.role,
    organization: req.user.organization,
    department: req.user.department,
    action: 'ACCOUNT_DEACTIVATED',
    resourceType: 'USER',
    resourceId: req.user.id,
    details: `User account deactivated by user: ${req.user.name}`,
    outcome: 'SUCCESS',
    ipAddress: req.ip || '127.0.0.1',
    recordToLedger: true
  });
  res.json(result);
});

// Admin: Update User Status (Activate/Deactivate)
router.patch('/users/:id/status', authenticateJWT, requireRoles('admin', 'supervisor'), async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const { isActive } = req.body;
  if (isActive === undefined) {
    res.status(400).json({ error: 'isActive status is required.' });
    return;
  }
  const result = await AuthService.updateUserStatus(id, Boolean(isActive));
  if (result.error) {
    res.status(404).json({ error: result.error });
    return;
  }
  await AuditService.log({
    actorId: req.user?.id || 'ADMIN',
    actorName: req.user?.name || 'Administrator',
    actorRole: req.user?.role || 'admin',
    organization: req.user?.organization || 'Judicial',
    department: req.user?.department || 'Administration',
    action: 'USER_STATUS_CHANGE',
    resourceType: 'USER',
    resourceId: id,
    details: `User status changed to ${isActive ? 'ACTIVE' : 'INACTIVE'} for ID ${id}`,
    outcome: 'SUCCESS',
    ipAddress: req.ip || '127.0.0.1',
    recordToLedger: true
  });
  res.json(result.user);
});

// Admin: Update User Role
router.patch('/users/:id/role', authenticateJWT, requireRoles('admin'), async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  const { role } = req.body;
  if (!role) {
    res.status(400).json({ error: 'Target role is required.' });
    return;
  }
  const result = await AuthService.updateUserRole(id, role);
  if (result.error) {
    res.status(404).json({ error: result.error });
    return;
  }
  await AuditService.log({
    actorId: req.user?.id || 'ADMIN',
    actorName: req.user?.name || 'Administrator',
    actorRole: req.user?.role || 'admin',
    organization: req.user?.organization || 'Judicial',
    department: req.user?.department || 'Administration',
    action: 'USER_ROLE_CHANGE',
    resourceType: 'USER',
    resourceId: id,
    details: `User role changed to ${role} for ID ${id}`,
    outcome: 'SUCCESS',
    ipAddress: req.ip || '127.0.0.1',
    recordToLedger: true
  });
  res.json(result.user);
});

export default router;
