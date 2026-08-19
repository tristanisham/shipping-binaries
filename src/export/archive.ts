// Archive writers for the bulk post export.
//
// Both formats are written by hand on top of web standards the Worker runtime
// already has (CompressionStream, TextEncoder, Response), so the export adds
// no runtime dependency and still builds without `nodejs_compat`.

export type ArchiveEntry = {
  // Path inside the archive. Keep it to 100 bytes or fewer: that is the ustar
  // name field, and `archiveEntryName` enforces it.
  name: string;
  data: Uint8Array;
};

const textEncoder = new TextEncoder();

// ustar stores a name in 100 bytes, so that is the ceiling for both formats.
const MAX_ENTRY_NAME_LENGTH = 100;

export const archiveEntryName = (base: string, extension: string): string => {
  const safe = base.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") ||
    "post";
  return safe.slice(0, MAX_ENTRY_NAME_LENGTH - extension.length) + extension;
};

export const encodeUtf8 = (value: string): Uint8Array =>
  textEncoder.encode(value);

const concat = (chunks: readonly Uint8Array[]): Uint8Array => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
};

const compress = async (
  data: Uint8Array,
  format: "deflate-raw" | "gzip",
): Promise<Uint8Array> => {
  // The copy re-homes the bytes on a plain ArrayBuffer, which is what
  // BodyInit accepts.
  const body = new Response(new Uint8Array(data)).body;
  if (!body) return data;
  const compressed = body.pipeThrough(new CompressionStream(format));
  return new Uint8Array(await new Response(compressed).arrayBuffer());
};

let crcTable: Uint32Array | undefined;

const crc32 = (data: Uint8Array): number => {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      crcTable[index] = value >>> 0;
    }
  }

  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (crcTable[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

// MS-DOS packs the modification time into two 16-bit fields, with two-second
// resolution and years counted from 1980.
const dosDateTime = (date: Date): { date: number; time: number } => ({
  date: ((date.getUTCFullYear() - 1980) << 9) |
    ((date.getUTCMonth() + 1) << 5) |
    date.getUTCDate(),
  time: (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) |
    (date.getUTCSeconds() >> 1),
});

export const ZIP_CONTENT_TYPE = "application/zip";
export const TAR_GZ_CONTENT_TYPE = "application/gzip";

export const createZip = async (
  entries: readonly ArchiveEntry[],
  modifiedAt: Date = new Date(),
): Promise<Uint8Array> => {
  const stamp = dosDateTime(modifiedAt);
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encodeUtf8(entry.name);
    const deflated = await compress(entry.data, "deflate-raw");
    const checksum = crc32(entry.data);

    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true); // version needed: 2.0 (deflate)
    localView.setUint16(6, 0x0800, true); // UTF-8 names
    localView.setUint16(8, 8, true); // deflate
    localView.setUint16(10, stamp.time, true);
    localView.setUint16(12, stamp.date, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, deflated.length, true);
    localView.setUint32(22, entry.data.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    local.set(name, 30);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true); // version made by
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 8, true);
    centralView.setUint16(12, stamp.time, true);
    centralView.setUint16(14, stamp.date, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, deflated.length, true);
    centralView.setUint32(24, entry.data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);

    locals.push(local, deflated);
    centrals.push(central);
    offset += local.length + deflated.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  return concat([...locals, ...centrals, end]);
};

const TAR_BLOCK_SIZE = 512;

const writeAscii = (
  block: Uint8Array,
  offset: number,
  value: string,
): void => {
  block.set(encodeUtf8(value), offset);
};

const writeOctal = (
  block: Uint8Array,
  offset: number,
  width: number,
  value: number,
): void => {
  // Numeric ustar fields are zero-padded octal followed by a NUL.
  writeAscii(
    block,
    offset,
    value.toString(8).padStart(width - 1, "0").slice(-(width - 1)),
  );
};

const tarHeader = (
  entry: ArchiveEntry,
  modifiedAt: Date,
): Uint8Array => {
  const header = new Uint8Array(TAR_BLOCK_SIZE);
  writeAscii(header, 0, entry.name);
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, entry.data.length);
  writeOctal(header, 136, 12, Math.floor(modifiedAt.getTime() / 1000));
  header.fill(0x20, 148, 156); // checksum field counts as spaces
  writeAscii(header, 156, "0"); // regular file
  writeAscii(header, 257, "ustar");
  writeAscii(header, 263, "00");

  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeOctal(header, 148, 7, checksum);
  header[154] = 0;
  header[155] = 0x20;

  return header;
};

export const createTar = (
  entries: readonly ArchiveEntry[],
  modifiedAt: Date = new Date(),
): Uint8Array => {
  const blocks: Uint8Array[] = [];

  for (const entry of entries) {
    blocks.push(tarHeader(entry, modifiedAt));
    blocks.push(entry.data);
    const remainder = entry.data.length % TAR_BLOCK_SIZE;
    if (remainder > 0) {
      blocks.push(new Uint8Array(TAR_BLOCK_SIZE - remainder));
    }
  }

  // Two zero blocks close the archive.
  blocks.push(new Uint8Array(TAR_BLOCK_SIZE * 2));
  return concat(blocks);
};

export const createTarGz = async (
  entries: readonly ArchiveEntry[],
  modifiedAt: Date = new Date(),
): Promise<Uint8Array> => compress(createTar(entries, modifiedAt), "gzip");
