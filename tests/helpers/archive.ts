import assert from "node:assert/strict";
import { gunzipSync, inflateRawSync } from "node:zlib";

// Real decoders for the hand-written encoders in src/export/archive.ts: the
// tests read the bytes back rather than trusting the writer.

export const readZipEntries = (archive: Uint8Array): Map<string, string> => {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.length);
  let end = archive.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end -= 1;
  assert.ok(end >= 0, "no end of central directory record");

  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const files = new Map<string, string>();

  for (let index = 0; index < count; index += 1) {
    assert.equal(view.getUint32(offset, true), 0x02014b50);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(
      archive.subarray(offset + 46, offset + 46 + nameLength),
    );

    assert.equal(view.getUint32(localOffset, true), 0x04034b50);
    assert.equal(view.getUint16(localOffset + 8, true), 8, "deflate");
    const compressedSize = view.getUint32(localOffset + 18, true);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const body = inflateRawSync(
      Buffer.from(archive.subarray(start, start + compressedSize)),
    );

    files.set(name, body.toString("utf8"));
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return files;
};

export const readTarEntries = (tar: Buffer): Map<string, string> => {
  const files = new Map<string, string>();

  for (let offset = 0; offset + 512 <= tar.length; offset += 512) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;

    assert.equal(header.subarray(257, 262).toString("ascii"), "ustar");
    assert.equal(header.subarray(263, 265).toString("ascii"), "00");
    assert.equal(header.subarray(156, 157).toString("ascii"), "0");

    // The stored checksum must match the header with that field blanked.
    const stored = Number.parseInt(
      header.subarray(148, 154).toString("ascii"),
      8,
    );
    const blanked = Buffer.from(header);
    blanked.fill(0x20, 148, 156);
    const sum = blanked.reduce((total, byte) => total + byte, 0);
    assert.equal(stored, sum);

    const name = header.subarray(0, 100).toString("ascii").replace(/\0+$/, "");
    const size = Number.parseInt(
      header.subarray(124, 136).toString("ascii").replace(/\0+$/, ""),
      8,
    );
    files.set(
      name,
      tar.subarray(offset + 512, offset + 512 + size).toString("utf8"),
    );
    offset += Math.ceil(size / 512) * 512;
  }

  return files;
};

export const readTarGzEntries = (archive: Uint8Array): Map<string, string> =>
  readTarEntries(gunzipSync(Buffer.from(archive)));
