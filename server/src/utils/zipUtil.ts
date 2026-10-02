import zlib from 'zlib';

/**
 * Standard CRC-32 calculation table
 */
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dateToDosTime(date: Date): { time: number; date: number } {
  const d = date || new Date();
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1f);
  const dateVal = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0x0f) << 5) | (d.getDate() & 0x1f);
  return { time, date: dateVal };
}

export interface ZipFileInput {
  name: string;
  data: Buffer | string;
  date?: Date;
}

/**
 * Zero-dependency in-memory PKZIP archive creator
 */
export class ZipBuilder {
  private files: ZipFileInput[] = [];

  public addFile(name: string, data: Buffer | string, date?: Date): this {
    const normalizedName = name.replace(/\\/g, '/').replace(/^\/+/, '');
    this.files.push({
      name: normalizedName,
      data: Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8'),
      date: date || new Date()
    });
    return this;
  }

  public build(): Buffer {
    const localHeaders: Buffer[] = [];
    const centralHeaders: Buffer[] = [];
    let offset = 0;

    for (const file of this.files) {
      const rawData = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, 'utf-8');
      const compressedData = zlib.deflateRawSync(rawData);
      const useCompressed = compressedData.length < rawData.length;
      const finalData = useCompressed ? compressedData : rawData;
      const compressionMethod = useCompressed ? 8 : 0;

      const fileCrc = crc32(rawData);
      const nameBuffer = Buffer.from(file.name, 'utf-8');
      const { time, date } = dateToDosTime(file.date || new Date());

      // 1. Local File Header
      const localHeader = Buffer.alloc(30 + nameBuffer.length);
      localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
      localHeader.writeUInt16LE(20, 4);         // Version needed (2.0)
      localHeader.writeUInt16LE(0x0800, 6);     // General purpose bit flag (UTF-8)
      localHeader.writeUInt16LE(compressionMethod, 8); // Compression method (0 or 8)
      localHeader.writeUInt16LE(time, 10);      // DOS time
      localHeader.writeUInt16LE(date, 12);      // DOS date
      localHeader.writeUInt32LE(fileCrc, 14);   // CRC-32
      localHeader.writeUInt32LE(finalData.length, 18); // Compressed size
      localHeader.writeUInt32LE(rawData.length, 22);   // Uncompressed size
      localHeader.writeUInt16LE(nameBuffer.length, 26);// File name length
      localHeader.writeUInt16LE(0, 28);         // Extra field length
      nameBuffer.copy(localHeader, 30);

      const localFileBlock = Buffer.concat([localHeader, finalData]);
      localHeaders.push(localFileBlock);

      // 2. Central Directory Header
      const centralHeader = Buffer.alloc(46 + nameBuffer.length);
      centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
      centralHeader.writeUInt16LE(20, 4);          // Version made by
      centralHeader.writeUInt16LE(20, 6);          // Version needed
      centralHeader.writeUInt16LE(0x0800, 8);      // General purpose bit flag (UTF-8)
      centralHeader.writeUInt16LE(compressionMethod, 10);
      centralHeader.writeUInt16LE(time, 12);
      centralHeader.writeUInt16LE(date, 14);
      centralHeader.writeUInt32LE(fileCrc, 16);
      centralHeader.writeUInt32LE(finalData.length, 20);
      centralHeader.writeUInt32LE(rawData.length, 24);
      centralHeader.writeUInt16LE(nameBuffer.length, 28);
      centralHeader.writeUInt16LE(0, 30);          // Extra field length
      centralHeader.writeUInt16LE(0, 32);          // File comment length
      centralHeader.writeUInt16LE(0, 34);          // Disk number start
      centralHeader.writeUInt16LE(0, 36);          // Internal file attributes
      centralHeader.writeUInt32LE(0, 38);          // External file attributes
      centralHeader.writeUInt32LE(offset, 42);     // Relative offset of local header
      nameBuffer.copy(centralHeader, 46);

      centralHeaders.push(centralHeader);

      offset += localFileBlock.length;
    }

    const centralDirectoryBlock = Buffer.concat(centralHeaders);
    const centralDirOffset = offset;
    const centralDirSize = centralDirectoryBlock.length;

    // 3. End of Central Directory Record (EOCD)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
    eocd.writeUInt16LE(0, 4);          // Disk number
    eocd.writeUInt16LE(0, 6);          // Disk with central directory
    eocd.writeUInt16LE(this.files.length, 8);  // Total entries on this disk
    eocd.writeUInt16LE(this.files.length, 10); // Total entries overall
    eocd.writeUInt32LE(centralDirSize, 12);    // Size of central directory
    eocd.writeUInt32LE(centralDirOffset, 16);  // Offset of start of central directory
    eocd.writeUInt16LE(0, 20);                 // Comment length

    return Buffer.concat([...localHeaders, centralDirectoryBlock, eocd]);
  }
}
