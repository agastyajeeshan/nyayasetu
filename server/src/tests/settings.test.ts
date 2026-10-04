import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { PostgresService } from '../db/postgres.js';
import { UserRepository } from '../repositories/userRepository.js';
import { AuthService } from '../services/authService.js';
import { CryptoService } from '../services/cryptoService.js';

describe('NyayaSetu Settings & Security Suite (PostgreSQL Persistence)', () => {
  before(async () => {
    const conn = await PostgresService.testConnection();
    assert.strictEqual(conn.connected, true, 'PostgreSQL connection must be active for tests');
    await PostgresService.initializeSchema();
  });

  const testUserId = 'USR-IO-01';

  test('01. Profile update persists valid fields correctly in PostgreSQL', async () => {
    const updatedName = 'Inspector Vikramaditya Verma (Updated)';
    const updatedPhone = '+91 98111 22233';
    const updatedDept = 'Special Cyber Investigation Cell';

    const res = await AuthService.updateProfile(testUserId, {
      name: updatedName,
      phone: updatedPhone,
      department: updatedDept
    });

    assert.ok(res.user, 'Update profile must return user object');
    assert.strictEqual(res.user.name, updatedName, 'Name must be updated');
    assert.strictEqual(res.user.phone, updatedPhone, 'Phone must be updated');
    assert.strictEqual(res.user.department, updatedDept, 'Department must be updated');

    // Verify in PostgreSQL directly
    const pgUser = await UserRepository.findById(testUserId);
    assert.strictEqual(pgUser?.name, updatedName);
    assert.strictEqual(pgUser?.phone, updatedPhone);

    // Revert back to original Inspector Rajesh Verma demo record
    await AuthService.updateProfile(testUserId, {
      name: 'Inspector Rajesh Verma',
      phone: '+91 98101 23456',
      department: 'Crime Branch Special Cell'
    });
  });

  test('02. Change password validates current password and updates salt/hash in PostgreSQL', async () => {
    const changeRes = await AuthService.changePassword(testUserId, 'NyayaSetu@2026!', 'NewSecurePass@2026!', '127.0.0.1');
    assert.ok(changeRes.success, 'Password change must succeed with valid credentials');
    assert.ok(changeRes.passwordChangedAt, 'Password change must record timestamp');

    // Verify new password is valid via CryptoService against PostgreSQL
    const pgUser = await UserRepository.findById(testUserId);
    assert.ok(pgUser, 'User must exist');
    const isValidNew = CryptoService.verifyPassword('NewSecurePass@2026!', pgUser.salt, pgUser.passwordHash);
    assert.strictEqual(isValidNew, true, 'New password must verify with updated salt and hash');

    // Invalid current password must fail
    const failRes = await AuthService.changePassword(testUserId, 'WrongPassword123!', 'AnotherPass@2026!', '127.0.0.1');
    assert.ok(failRes.error, 'Invalid current password must return error');

    // Reset password back for other tests
    await AuthService.changePassword(testUserId, 'NewSecurePass@2026!', 'NyayaSetu@2026!', '127.0.0.1');
  });

  test('03. Multi-Factor Authentication toggling updates user record in PostgreSQL', async () => {
    const resTrue = await AuthService.toggleMfa(testUserId, true);
    assert.strictEqual(resTrue.user?.mfaEnabled, true, 'MFA should be enabled');

    const resFalse = await AuthService.toggleMfa(testUserId, false);
    assert.strictEqual(resFalse.user?.mfaEnabled, false, 'MFA should be disabled');
  });

  test('04. Face verification enrollment registers biometric digest in PostgreSQL', async () => {
    const mockTemplateHash = 'BIO-SHA256-TEST-EVIDENCE-FIPS140';
    const enrollRes = await AuthService.enrollFace(testUserId, mockTemplateHash);
    assert.ok(enrollRes.success, 'Face enrollment must succeed');
    assert.ok(enrollRes.faceEnrolledAt, 'Must record enrollment date');

    const pgUser = await UserRepository.findById(testUserId);
    assert.strictEqual(pgUser?.faceEnrolled, true, 'User faceEnrolled must be true');
    assert.strictEqual(pgUser?.faceTemplateHash, mockTemplateHash, 'User template hash must match');
  });

  test('05. Face verification removal requires password re-authentication', async () => {
    // Attempt removal with wrong password
    const failRes = await AuthService.removeFace(testUserId, 'IncorrectPassword');
    assert.ok(failRes.error, 'Face removal must fail with wrong password');

    // Attempt removal with valid password
    const successRes = await AuthService.removeFace(testUserId, 'NyayaSetu@2026!');
    assert.ok(successRes.success, 'Face removal must succeed with valid password');

    const pgUser = await UserRepository.findById(testUserId);
    assert.strictEqual(pgUser?.faceEnrolled, false, 'Face enrolled must be false');
    assert.strictEqual(pgUser?.faceTemplateHash, undefined, 'Face template hash must be cleared');
  });

  test('06. Notification preferences update and persist correctly in PostgreSQL', async () => {
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

    const res = await AuthService.updateNotificationPreferences(testUserId, prefs);
    assert.ok(res.success, 'Preferences update must succeed');
    assert.strictEqual(res.notificationPreferences?.documentSharing, false);
    assert.strictEqual(res.notificationPreferences?.suspiciousAccess, false);
    assert.strictEqual(res.notificationPreferences?.integrityAlerts, true);

    const pgUser = await UserRepository.findById(testUserId);
    assert.strictEqual(pgUser?.notificationPreferences?.documentSharing, false);
  });

  test('07. Admin user status toggle and role update work properly in PostgreSQL', async () => {
    // Toggle active status
    const statusRes = await AuthService.updateUserStatus('USR-AUD-01', false);
    assert.strictEqual(statusRes.user?.isActive, false, 'User must be deactivated');

    const reactivateRes = await AuthService.updateUserStatus('USR-AUD-01', true);
    assert.strictEqual(reactivateRes.user?.isActive, true, 'User must be reactivated');

    // Update user role
    const roleRes = await AuthService.updateUserRole('USR-AUD-01', 'supervisor');
    assert.strictEqual(roleRes.user?.role, 'supervisor', 'User role must be updated');

    // Revert role
    await AuthService.updateUserRole('USR-AUD-01', 'auditor');
  });
});
