import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { db } from '../db/database.js';
import { seedDatabase } from '../db/seed.js';
import { AuthService } from '../services/authService.js';
import { CryptoService } from '../services/cryptoService.js';

describe('NyayaSetu Settings & Security Suite', () => {
  before(async () => {
    await seedDatabase();
  });

  const testUserId = 'USR-IO-01';

  test('01. Profile update persists valid fields correctly', () => {
    const updatedName = 'Inspector Vikramaditya Verma (Updated)';
    const updatedPhone = '+91 98111 22233';
    const updatedDept = 'Special Cyber Investigation Cell';

    const res = AuthService.updateProfile(testUserId, {
      name: updatedName,
      phone: updatedPhone,
      department: updatedDept
    });

    assert.ok(res.user, 'Update profile must return user object');
    assert.strictEqual(res.user.name, updatedName, 'Name must be updated');
    assert.strictEqual(res.user.phone, updatedPhone, 'Phone must be updated');
    assert.strictEqual(res.user.department, updatedDept, 'Department must be updated');

    // Verify in db
    const dbUser = db.users.find(u => u.id === testUserId);
    assert.strictEqual(dbUser?.name, updatedName);
    assert.strictEqual(dbUser?.phone, updatedPhone);

    // Revert back to original Inspector Rajesh Verma demo record
    AuthService.updateProfile(testUserId, {
      name: 'Inspector Rajesh Verma',
      phone: '+91 98101 23456',
      department: 'Crime Branch Special Cell'
    });
  });

  test('02. Change password validates current password and updates salt/hash', () => {
    // Current valid password for demo user is NyayaSetu@2026! or password
    const changeRes = AuthService.changePassword(testUserId, 'NyayaSetu@2026!', 'NewSecurePass@2026!', '127.0.0.1');
    assert.ok(changeRes.success, 'Password change must succeed with valid credentials');
    assert.ok(changeRes.passwordChangedAt, 'Password change must record timestamp');

    // Verify new password is valid via CryptoService
    const dbUser = db.users.find(u => u.id === testUserId);
    assert.ok(dbUser, 'User must exist');
    const isValidNew = CryptoService.verifyPassword('NewSecurePass@2026!', dbUser.salt, dbUser.passwordHash);
    assert.strictEqual(isValidNew, true, 'New password must verify with updated salt and hash');

    // Invalid current password must fail
    const failRes = AuthService.changePassword(testUserId, 'WrongPassword123!', 'AnotherPass@2026!', '127.0.0.1');
    assert.ok(failRes.error, 'Invalid current password must return error');

    // Reset password back for other tests
    AuthService.changePassword(testUserId, 'NewSecurePass@2026!', 'NyayaSetu@2026!', '127.0.0.1');
  });

  test('03. Multi-Factor Authentication toggling updates user record', () => {
    const resTrue = AuthService.toggleMfa(testUserId, true);
    assert.strictEqual(resTrue.user?.mfaEnabled, true, 'MFA should be enabled');

    const resFalse = AuthService.toggleMfa(testUserId, false);
    assert.strictEqual(resFalse.user?.mfaEnabled, false, 'MFA should be disabled');
  });

  test('04. Face verification enrollment registers biometric digest', () => {
    const mockTemplateHash = 'BIO-SHA256-TEST-EVIDENCE-FIPS140';
    const enrollRes = AuthService.enrollFace(testUserId, mockTemplateHash);
    assert.ok(enrollRes.success, 'Face enrollment must succeed');
    assert.ok(enrollRes.faceEnrolledAt, 'Must record enrollment date');

    const dbUser = db.users.find(u => u.id === testUserId);
    assert.strictEqual(dbUser?.faceEnrolled, true, 'User faceEnrolled must be true');
    assert.strictEqual(dbUser?.faceTemplateHash, mockTemplateHash, 'User template hash must match');
  });

  test('05. Face verification removal requires password re-authentication', () => {
    // Attempt removal with wrong password
    const failRes = AuthService.removeFace(testUserId, 'IncorrectPassword');
    assert.ok(failRes.error, 'Face removal must fail with wrong password');

    // Attempt removal with valid password
    const successRes = AuthService.removeFace(testUserId, 'NyayaSetu@2026!');
    assert.ok(successRes.success, 'Face removal must succeed with valid password');

    const dbUser = db.users.find(u => u.id === testUserId);
    assert.strictEqual(dbUser?.faceEnrolled, false, 'Face enrolled must be false');
    assert.strictEqual(dbUser?.faceTemplateHash, undefined, 'Face template hash must be cleared');
  });

  test('06. Notification preferences update and persist correctly', () => {
    const prefs = {
      caseActivity: true,
      evidenceCustody: true,
      integrityAlerts: true,
      documentSharing: false,
      documentReviews: true,
      documentAlerts: true,
      failedLogins: true,
      faceFailures: true,
      suspiciousAccess: false
    };

    const res = AuthService.updateNotificationPreferences(testUserId, prefs);
    assert.ok(res.success, 'Preferences update must succeed');
    assert.strictEqual(res.notificationPreferences?.documentSharing, false);
    assert.strictEqual(res.notificationPreferences?.suspiciousAccess, false);
    assert.strictEqual(res.notificationPreferences?.integrityAlerts, true);

    const dbUser = db.users.find(u => u.id === testUserId);
    assert.strictEqual(dbUser?.notificationPreferences?.documentSharing, false);
  });

  test('07. Admin user status toggle and role update work properly', () => {
    // Toggle active status
    const statusRes = AuthService.updateUserStatus('USR-AUD-01', false);
    assert.strictEqual(statusRes.user?.isActive, false, 'User must be deactivated');

    const reactivateRes = AuthService.updateUserStatus('USR-AUD-01', true);
    assert.strictEqual(reactivateRes.user?.isActive, true, 'User must be reactivated');

    // Update user role
    const roleRes = AuthService.updateUserRole('USR-AUD-01', 'supervisor');
    assert.strictEqual(roleRes.user?.role, 'supervisor', 'User role must be updated');

    // Revert role
    AuthService.updateUserRole('USR-AUD-01', 'auditor');
  });
});
