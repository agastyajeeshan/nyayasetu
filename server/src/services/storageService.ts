import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { CryptoService } from './cryptoService.js';

export interface StorageSaveResult {
  storedFileName: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256Hash: string;
  isEncrypted: boolean;
  encryptionKeyId?: string;
  malwareScanStatus: 'CLEAN' | 'SUSPICIOUS' | 'QUARANTINED';
}

export class StorageService {
  private static allowedMimeTypes = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/json'
  ]);

  private static allowedExtensions = new Set([
    '.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png', '.webp', '.txt', '.csv', '.xlsx', '.json'
  ]);

  /**
   * Validates file metadata before saving
   */
  public static validateFile(originalName: string, mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
    const ext = path.extname(originalName).toLowerCase();
    
    if (!this.allowedExtensions.has(ext)) {
      return { valid: false, error: `Invalid file extension '${ext}'. Allowed: ${Array.from(this.allowedExtensions).join(', ')}` };
    }

    if (sizeBytes > config.maxFileSizeMB * 1024 * 1024) {
      return { valid: false, error: `File size (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of ${config.maxFileSizeMB} MB.` };
    }

    return { valid: true };
  }

  /**
   * Mock Malware Scanner Hook
   */
  public static scanForMalware(buffer: Buffer, fileName: string): 'CLEAN' | 'SUSPICIOUS' | 'QUARANTINED' {
    const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024));
    if (content.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE') || fileName.toLowerCase().includes('malware') || fileName.toLowerCase().includes('virus')) {
      return 'QUARANTINED';
    }
    if (content.includes('<script>') || content.includes('cmd.exe') || content.includes('powershell')) {
      return 'SUSPICIOUS';
    }
    return 'CLEAN';
  }

  /**
   * Saves a document buffer into secure object storage with AES-256 envelope encryption
   */
  public static async saveFile(params: {
    buffer: Buffer;
    originalFileName: string;
    mimeType: string;
    documentId: string;
    versionNumber: number;
    encryptAtRest?: boolean;
  }): Promise<StorageSaveResult> {
    const ext = path.extname(params.originalFileName).toLowerCase() || '.bin';
    const storedFileName = `${params.documentId}_v${params.versionNumber}_${Date.now()}${ext}`;
    const targetPath = path.join(config.storageDir, storedFileName);

    // 1. Compute plain SHA-256 hash
    const sha256Hash = CryptoService.sha256(params.buffer);

    // 2. Malware scan
    const malwareScanStatus = this.scanForMalware(params.buffer, params.originalFileName);

    // 3. Encrypt if requested
    const shouldEncrypt = params.encryptAtRest !== false;
    let dataToWrite = params.buffer;
    let encryptionKeyId: string | undefined;

    if (shouldEncrypt) {
      const dek = CryptoService.sha256(`${config.encryptionMasterKey}:${storedFileName}`);
      const encrypted = CryptoService.encryptAesGcm(params.buffer, dek);
      
      // Store payload envelope with header: [IV(24)][AUTHTAG(32)][CIPHERTEXT]
      const envelope = Buffer.concat([
        Buffer.from(encrypted.ivHex, 'hex'),
        Buffer.from(encrypted.authTagHex, 'hex'),
        encrypted.cipherText
      ]);
      dataToWrite = envelope;
      encryptionKeyId = `NYAYASETU-KMS-${params.documentId.slice(0, 8)}`;
    }

    await fs.promises.writeFile(targetPath, dataToWrite);

    return {
      storedFileName,
      originalFileName: params.originalFileName,
      mimeType: params.mimeType,
      fileSizeBytes: params.buffer.length,
      sha256Hash,
      isEncrypted: shouldEncrypt,
      encryptionKeyId,
      malwareScanStatus
    };
  }

  /**
   * Reads and decrypts file buffer for authorized view/download
   */
  public static async readFile(storedFileName: string, isEncrypted: boolean): Promise<Buffer> {
    const targetPath = path.join(config.storageDir, storedFileName);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`File '${storedFileName}' not found in storage.`);
    }

    const rawBuffer = await fs.promises.readFile(targetPath);

    if (!isEncrypted) {
      return rawBuffer;
    }

    // Decrypt envelope: 12 bytes IV + 16 bytes AuthTag + CipherText
    const iv = rawBuffer.subarray(0, 12).toString('hex');
    const authTag = rawBuffer.subarray(12, 28).toString('hex');
    const cipherText = rawBuffer.subarray(28);

    const dek = CryptoService.sha256(`${config.encryptionMasterKey}:${storedFileName}`);
    return CryptoService.decryptAesGcm(cipherText, dek, iv, authTag);
  }

  /**
   * Recomputes real SHA-256 hash from storage and compares with expected hash
   */
  public static async verifyFileIntegrity(storedFileName: string, isEncrypted: boolean, expectedHash: string): Promise<{
    matches: boolean;
    computedHash: string;
    expectedHash: string;
    fileSizeBytes: number;
    verifiedAt: string;
    tamperDetails?: string;
  }> {
    try {
      const decryptedBuffer = await this.readFile(storedFileName, isEncrypted);
      const computedHash = CryptoService.sha256(decryptedBuffer);

      return {
        matches: computedHash.toLowerCase() === expectedHash.toLowerCase(),
        computedHash,
        expectedHash,
        fileSizeBytes: decryptedBuffer.length,
        verifiedAt: new Date().toISOString()
      };
    } catch (err: any) {
      // Decryption failed or AuthTag mismatch => Tampering detected!
      return {
        matches: false,
        computedHash: 'CORRUPTED_OR_TAMPERED_CIPHERTEXT',
        expectedHash,
        fileSizeBytes: 0,
        verifiedAt: new Date().toISOString(),
        tamperDetails: `Cryptographic Authentication Failed: ${err.message || 'Encrypted envelope altered on disk'}`
      };
    }
  }

  /**
   * Simulates binary corruption on disk to demonstrate tamper detection
   */
  public static async simulateBinaryTamper(storedFileName: string): Promise<boolean> {
    const targetPath = path.join(config.storageDir, storedFileName);
    if (!fs.existsSync(targetPath)) return false;

    const data = await fs.promises.readFile(targetPath);
    // Invert the last byte
    data[data.length - 1] = data[data.length - 1] ^ 0xFF;
    await fs.promises.writeFile(targetPath, data);
    return true;
  }
}
