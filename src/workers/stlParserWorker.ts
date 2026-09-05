/**
 * Dedicated WebWorker for high-performance non-blocking parsing of massive CAD/AM STL files.
 * Capable of parsing binary STL files with 1,000,000+ facets without UI freeze or browser lag.
 * Utilizes Transferable Objects (ArrayBuffer ownership transfer) for zero-copy IPC.
 */

export interface STLWorkerInputMessage {
  command: "parse_stl";
  buffer: ArrayBuffer;
}

export interface STLWorkerProgressMessage {
  type: "progress";
  percent: number;
  facesProcessed: number;
  totalFaces: number;
}

export interface STLWorkerSuccessMessage {
  type: "success";
  numFaces: number;
  positions: ArrayBuffer;
  normals: ArrayBuffer;
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number];
  };
  processingTimeMs: number;
}

export interface STLWorkerErrorMessage {
  type: "error";
  error: string;
}

export type STLWorkerOutputMessage =
  | STLWorkerProgressMessage
  | STLWorkerSuccessMessage
  | STLWorkerErrorMessage;

self.onmessage = (e: MessageEvent<STLWorkerInputMessage>) => {
  const { command, buffer } = e.data;
  if (command !== "parse_stl" || !buffer) {
    self.postMessage({ type: "error", error: "Invalid worker command or empty buffer." } as STLWorkerErrorMessage);
    return;
  }

  const startTime = performance.now();

  try {
    const isBinary = checkIfBinary(buffer);
    if (isBinary) {
      parseBinarySTLInWorker(buffer, startTime);
    } else {
      parseAsciiSTLInWorker(buffer, startTime);
    }
  } catch (err: any) {
    self.postMessage({
      type: "error",
      error: err?.message || "Failed to parse STL file in worker.",
    } as STLWorkerErrorMessage);
  }
};

function checkIfBinary(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 84) return false;
  const reader = new DataView(buffer);
  const numFaces = reader.getUint32(80, true);
  const expectedSize = 84 + numFaces * 50;
  return buffer.byteLength === expectedSize;
}

function parseBinarySTLInWorker(buffer: ArrayBuffer, startTime: number) {
  const reader = new DataView(buffer);
  const numFaces = reader.getUint32(80, true);

  if (numFaces === 0) {
    throw new Error("STL file specifies 0 facets.");
  }

  // Pre-allocate typed arrays
  const positions = new Float32Array(numFaces * 9);
  const normals = new Float32Array(numFaces * 9);

  let offset = 84;
  let posOffset = 0;

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  // Report progress every ~100,000 facets for massive files
  const reportStep = Math.max(50000, Math.floor(numFaces / 10));

  for (let i = 0; i < numFaces; i++) {
    // Normal vector
    const nx = reader.getFloat32(offset, true);
    const ny = reader.getFloat32(offset + 4, true);
    const nz = reader.getFloat32(offset + 8, true);
    offset += 12;

    // 3 Vertices (9 floats)
    for (let j = 0; j < 3; j++) {
      const vx = reader.getFloat32(offset, true);
      const vy = reader.getFloat32(offset + 4, true);
      const vz = reader.getFloat32(offset + 8, true);
      offset += 12;

      positions[posOffset] = vx;
      positions[posOffset + 1] = vy;
      positions[posOffset + 2] = vz;

      normals[posOffset] = nx;
      normals[posOffset + 1] = ny;
      normals[posOffset + 2] = nz;

      // Track bounding box
      if (vx < minX) minX = vx;
      if (vx > maxX) maxX = vx;
      if (vy < minY) minY = vy;
      if (vy > maxY) maxY = vy;
      if (vz < minZ) minZ = vz;
      if (vz > maxZ) maxZ = vz;

      posOffset += 3;
    }

    offset += 2; // skip 2-byte attribute byte count

    if (i % reportStep === 0 || i === numFaces - 1) {
      self.postMessage({
        type: "progress",
        percent: Math.round(((i + 1) / numFaces) * 100),
        facesProcessed: i + 1,
        totalFaces: numFaces,
      } as STLWorkerProgressMessage);
    }
  }

  // Center the geometry around origin
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;

  for (let i = 0; i < positions.length; i += 3) {
    positions[i] -= cx;
    positions[i + 1] -= cy;
    positions[i + 2] -= cz;
  }

  const processingTimeMs = Math.round(performance.now() - startTime);

  // Transfer ownership of Float32Array buffers with zero-copy
  (self as any).postMessage(
    {
      type: "success",
      numFaces,
      positions: positions.buffer,
      normals: normals.buffer,
      bounds: {
        min: [minX - cx, minY - cy, minZ - cz],
        max: [maxX - cx, maxY - cy, maxZ - cz],
        size: [maxX - minX, maxY - minY, maxZ - minZ],
      },
      processingTimeMs,
    } as STLWorkerSuccessMessage,
    [positions.buffer, normals.buffer]
  );
}

function parseAsciiSTLInWorker(buffer: ArrayBuffer, startTime: number) {
  const text = new TextDecoder().decode(buffer);
  const posList: number[] = [];
  const normList: number[] = [];

  let currentNormal = [0, 0, 1];
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;

  const lines = text.split(/\r?\n/);
  const totalLines = lines.length;
  const reportStep = Math.max(10000, Math.floor(totalLines / 10));

  for (let i = 0; i < totalLines; i++) {
    const line = lines[i].trim();
    if (line.startsWith("facet normal")) {
      const parts = line.split(/\s+/);
      if (parts.length >= 4) {
        currentNormal = [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])];
      }
    } else if (line.startsWith("vertex")) {
      const parts = line.split(/\s+/);
      if (parts.length >= 4) {
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);

        posList.push(x, y, z);
        normList.push(currentNormal[0], currentNormal[1], currentNormal[2]);

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }

    if (i % reportStep === 0) {
      self.postMessage({
        type: "progress",
        percent: Math.round(((i + 1) / totalLines) * 100),
        facesProcessed: Math.floor(posList.length / 9),
        totalFaces: Math.floor(totalLines / 7),
      } as STLWorkerProgressMessage);
    }
  }

  const positions = new Float32Array(posList);
  const normals = new Float32Array(normList);
  const numFaces = Math.floor(positions.length / 9);

  // Center
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;

  for (let i = 0; i < positions.length; i += 3) {
    positions[i] -= cx;
    positions[i + 1] -= cy;
    positions[i + 2] -= cz;
  }

  const processingTimeMs = Math.round(performance.now() - startTime);

  (self as any).postMessage(
    {
      type: "success",
      numFaces,
      positions: positions.buffer,
      normals: normals.buffer,
      bounds: {
        min: [minX - cx, minY - cy, minZ - cz],
        max: [maxX - cx, maxY - cy, maxZ - cz],
        size: [maxX - minX, maxY - minY, maxZ - minZ],
      },
      processingTimeMs,
    } as STLWorkerSuccessMessage,
    [positions.buffer, normals.buffer]
  );
}
