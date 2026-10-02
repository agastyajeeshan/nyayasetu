import { db } from '../db/database.js';
import { CryptoService } from './cryptoService.js';
import { LedgerBlock } from '../types/index.js';

export interface LedgerVerificationResult {
  isValid: boolean;
  totalBlocks: number;
  genesisHash: string;
  latestBlockHash: string;
  checkedAt: string;
  brokenBlockIndex?: number;
  failureReason?: string;
  blocks: {
    blockIndex: number;
    eventType: string;
    resourceType: string;
    resourceId: string;
    timestamp: string;
    blockHash: string;
    isValid: boolean;
  }[];
}

export class LedgerService {
  private static readonly GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * Initializes Genesis Block if ledger is empty
   */
  public static ensureGenesisBlock(): LedgerBlock {
    if (db.ledger_blocks.length === 0) {
      const genesisBlock = this.createBlock({
        eventType: 'GENESIS_BLOCK',
        resourceType: 'SYSTEM',
        resourceId: 'NYAYASETU-GENESIS-2026',
        resourceHash: CryptoService.sha256('NYAYASETU_DMS_GENESIS_ROOT_MHA_NCRB'),
        actorId: 'SYSTEM_ROOT',
        actorName: 'National Crime Records Bureau Root Authority',
        payload: {
          organization: 'Ministry of Home Affairs',
          system: 'NyayaSetu',
          standard: 'MHA-DMS-V1-BLOCKCHAIN-MERKLE-2026',
          genesisTimestamp: new Date().toISOString()
        }
      });
      return genesisBlock;
    }
    return db.ledger_blocks[0];
  }

  /**
   * Appends an immutable block to the cryptographic ledger
   */
  public static createBlock(params: {
    eventType: string;
    resourceType: string;
    resourceId: string;
    resourceHash: string;
    actorId: string;
    actorName: string;
    payload: Record<string, any>;
  }): LedgerBlock {
    const blocks = db.ledger_blocks;
    const blockIndex = blocks.length;
    const previousHash = blockIndex === 0 
      ? this.GENESIS_PREV_HASH 
      : blocks[blockIndex - 1].blockHash;

    const timestamp = new Date().toISOString();

    // Compute Merkle Root for the block payload
    const payloadHashes = [
      params.resourceHash,
      CryptoService.sha256(params.actorId),
      CryptoService.sha256(JSON.stringify(params.payload))
    ];
    const merkleRoot = CryptoService.computeMerkleRoot(payloadHashes);

    // Compute cryptographic block hash
    const blockHeader = `${blockIndex}:${previousHash}:${timestamp}:${params.eventType}:${params.resourceType}:${params.resourceId}:${params.resourceHash}:${params.actorId}:${merkleRoot}`;
    const blockHash = CryptoService.sha256(blockHeader);

    const newBlock: LedgerBlock = {
      blockIndex,
      previousHash,
      timestamp,
      eventType: params.eventType,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      resourceHash: params.resourceHash,
      actorId: params.actorId,
      actorName: params.actorName,
      payload: params.payload,
      merkleRoot,
      blockHash
    };

    blocks.push(newBlock);
    db.save();
    return newBlock;
  }

  /**
   * Recalculates expected block hash given block parameters
   */
  public static calculateExpectedBlockHash(block: LedgerBlock): string {
    const payloadHashes = [
      block.resourceHash,
      CryptoService.sha256(block.actorId),
      CryptoService.sha256(JSON.stringify(block.payload))
    ];
    const computedMerkleRoot = CryptoService.computeMerkleRoot(payloadHashes);

    const blockHeader = `${block.blockIndex}:${block.previousHash}:${block.timestamp}:${block.eventType}:${block.resourceType}:${block.resourceId}:${block.resourceHash}:${block.actorId}:${computedMerkleRoot}`;
    return CryptoService.sha256(blockHeader);
  }

  /**
   * Audits the entire ledger from genesis to tip
   */
  public static verifyLedgerIntegrity(): LedgerVerificationResult {
    const blocks = db.ledger_blocks;
    const checkedAt = new Date().toISOString();

    if (blocks.length === 0) {
      return {
        isValid: true,
        totalBlocks: 0,
        genesisHash: 'NONE',
        latestBlockHash: 'NONE',
        checkedAt,
        blocks: []
      };
    }

    const verifiedBlocksList: LedgerVerificationResult['blocks'] = [];

    for (let i = 0; i < blocks.length; i++) {
      const current = blocks[i];
      
      // 1. Verify previous hash linkage
      const expectedPrevHash = i === 0 ? this.GENESIS_PREV_HASH : blocks[i - 1].blockHash;
      if (current.previousHash !== expectedPrevHash) {
        verifiedBlocksList.push({
          blockIndex: current.blockIndex,
          eventType: current.eventType,
          resourceType: current.resourceType,
          resourceId: current.resourceId,
          timestamp: current.timestamp,
          blockHash: current.blockHash,
          isValid: false
        });

        return {
          isValid: false,
          totalBlocks: blocks.length,
          genesisHash: blocks[0].blockHash,
          latestBlockHash: blocks[blocks.length - 1].blockHash,
          checkedAt,
          brokenBlockIndex: i,
          failureReason: `Hash Chain Link Broken at block #${i}: Previous hash (${current.previousHash.slice(0, 16)}...) does not match block #${i - 1} hash (${expectedPrevHash.slice(0, 16)}...). Tampering detected!`,
          blocks: verifiedBlocksList
        };
      }

      // 2. Verify block's own content cryptographic hash
      const expectedBlockHash = this.calculateExpectedBlockHash(current);
      if (current.blockHash !== expectedBlockHash) {
        verifiedBlocksList.push({
          blockIndex: current.blockIndex,
          eventType: current.eventType,
          resourceType: current.resourceType,
          resourceId: current.resourceId,
          timestamp: current.timestamp,
          blockHash: current.blockHash,
          isValid: false
        });

        return {
          isValid: false,
          totalBlocks: blocks.length,
          genesisHash: blocks[0].blockHash,
          latestBlockHash: blocks[blocks.length - 1].blockHash,
          checkedAt,
          brokenBlockIndex: i,
          failureReason: `Block Data Tampered at block #${i}: Calculated hash (${expectedBlockHash.slice(0, 16)}...) differs from recorded block hash (${current.blockHash.slice(0, 16)}...). Content altered!`,
          blocks: verifiedBlocksList
        };
      }

      verifiedBlocksList.push({
        blockIndex: current.blockIndex,
        eventType: current.eventType,
        resourceType: current.resourceType,
        resourceId: current.resourceId,
        timestamp: current.timestamp,
        blockHash: current.blockHash,
        isValid: true
      });
    }

    return {
      isValid: true,
      totalBlocks: blocks.length,
      genesisHash: blocks[0].blockHash,
      latestBlockHash: blocks[blocks.length - 1].blockHash,
      checkedAt,
      blocks: verifiedBlocksList
    };
  }

  /**
   * Simulates tampering on a specific block for demo/testing purposes
   */
  public static simulateTamper(blockIndex: number, fakePayload: Record<string, any>): boolean {
    if (blockIndex < 0 || blockIndex >= db.ledger_blocks.length) return false;
    db.ledger_blocks[blockIndex].payload = { ...db.ledger_blocks[blockIndex].payload, ...fakePayload, _tampered: true };
    db.save();
    return true;
  }

  /**
   * Repairs any simulated tamper by re-calculating proper hash chain
   */
  public static repairLedger(): boolean {
    const blocks = db.ledger_blocks;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (block.payload._tampered) {
        delete block.payload._tampered;
      }
      block.previousHash = i === 0 ? this.GENESIS_PREV_HASH : blocks[i - 1].blockHash;
      block.blockHash = this.calculateExpectedBlockHash(block);
    }
    db.save();
    return true;
  }
}
