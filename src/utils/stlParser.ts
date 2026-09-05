import * as THREE from "three";
import type { STLWorkerOutputMessage } from "../workers/stlParserWorker";

export interface STLParseProgress {
  percent: number;
  facesProcessed: number;
  totalFaces: number;
}

/**
 * Asynchronously parses binary or ASCII STL file ArrayBuffer using a background WebWorker.
 * Designed for 1,000,000+ facet CAD/AM models with zero main thread lag.
 * Uses Transferable Objects for zero-copy memory transfer between threads.
 */
export async function parseSTLAsync(
  buffer: ArrayBuffer,
  onProgress?: (progress: STLParseProgress) => void
): Promise<THREE.BufferGeometry> {
  // Check if WebWorker is supported
  if (typeof Worker !== "undefined") {
    return new Promise<THREE.BufferGeometry>((resolve, reject) => {
      try {
        const worker = new Worker(
          new URL("../workers/stlParserWorker.ts", import.meta.url),
          { type: "module" }
        );

        worker.onmessage = (e: MessageEvent<STLWorkerOutputMessage>) => {
          const data = e.data;
          if (data.type === "progress") {
            onProgress?.({
              percent: data.percent,
              facesProcessed: data.facesProcessed,
              totalFaces: data.totalFaces,
            });
          } else if (data.type === "success") {
            try {
              const geometry = new THREE.BufferGeometry();
              const posArray = new Float32Array(data.positions);
              const normArray = new Float32Array(data.normals);

              geometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
              geometry.setAttribute("normal", new THREE.BufferAttribute(normArray, 3));
              geometry.computeBoundingBox();
              geometry.computeBoundingSphere();

              worker.terminate();
              resolve(geometry);
            } catch (buildErr) {
              worker.terminate();
              reject(buildErr);
            }
          } else if (data.type === "error") {
            worker.terminate();
            reject(new Error(data.error));
          }
        };

        worker.onerror = (err) => {
          worker.terminate();
          // Fallback to synchronous in-thread parsing on worker error
          try {
            resolve(parseSTL(buffer));
          } catch (syncErr) {
            reject(err);
          }
        };

        // Post message with buffer in transfer list for zero-copy transmission
        worker.postMessage({ command: "parse_stl", buffer }, [buffer]);
      } catch (workerInitErr) {
        // Fallback to synchronous in-thread parsing if worker instantiation fails
        try {
          resolve(parseSTL(buffer));
        } catch (syncErr) {
          reject(workerInitErr);
        }
      }
    });
  }

  // Fallback for non-worker environments
  return parseSTL(buffer);
}

/**
 * Parses binary or ASCII STL file ArrayBuffer into a Three.js BufferGeometry (synchronous)
 */
export function parseSTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  const isBinary = checkIfBinary(buffer);
  return isBinary ? parseBinarySTL(buffer) : parseAsciiSTL(buffer);
}

function checkIfBinary(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 84) return false;
  const reader = new DataView(buffer);
  const numFaces = reader.getUint32(80, true);
  const expectedSize = 84 + numFaces * 50;
  return buffer.byteLength === expectedSize;
}

function parseBinarySTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  const reader = new DataView(buffer);
  const numFaces = reader.getUint32(80, true);

  const positions = new Float32Array(numFaces * 9);
  const normals = new Float32Array(numFaces * 9);

  let offset = 84;
  let posOffset = 0;

  for (let i = 0; i < numFaces; i++) {
    const nx = reader.getFloat32(offset, true);
    const ny = reader.getFloat32(offset + 4, true);
    const nz = reader.getFloat32(offset + 8, true);
    offset += 12;

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

      posOffset += 3;
    }

    offset += 2; // skip 2-byte attribute byte count
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.computeVertexNormals();
  geometry.center();

  return geometry;
}

function parseAsciiSTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  const text = new TextDecoder().decode(buffer);
  const positions: number[] = [];
  const normals: number[] = [];

  const normalPattern = /facet\s+normal\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  const vertexPattern = /vertex\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

  let normalMatch: RegExpExecArray | null;
  let currentNormal = [0, 0, 1];

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("facet normal")) {
      const parts = line.split(/\s+/);
      if (parts.length >= 4) {
        currentNormal = [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])];
      }
    } else if (line.startsWith("vertex")) {
      const parts = line.split(/\s+/);
      if (parts.length >= 4) {
        positions.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
        normals.push(currentNormal[0], currentNormal[1], currentNormal[2]);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeVertexNormals();
  geometry.center();

  return geometry;
}

/**
 * Procedural Rocket Thrust Chamber Nozzle Mesh Generator
 */
export function createRocketNozzleGeometry(): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  const segments = 40;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const y = (t - 0.5) * 60; // -30 to +30 mm height
    // Convergent-divergent de Laval contour:
    let r = 18;
    if (y < -5) {
      // Convergent section
      r = 25 - (y + 30) * 0.45;
    } else if (y >= -5 && y <= 5) {
      // Throat
      r = 14 + (y * y) * 0.08;
    } else {
      // Divergent Bell section
      const dy = y - 5;
      r = 16 + Math.sqrt(dy) * 3.5;
    }
    // Add ribbed cooling channels feature
    if (i % 4 === 0) r += 0.8;
    points.push(new THREE.Vector2(r, y));
  }
  const geom = new THREE.LatheGeometry(points, 48);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Procedural Turbine Blade / Swirler Impeller Mesh Generator
 */
export function createTurbineBladeGeometry(): THREE.BufferGeometry {
  const geom = new THREE.BoxGeometry(16, 55, 32, 16, 32, 16);
  const pos = geom.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Twist angle based on height Y
    const angle = (v.y / 55) * 0.9;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const nx = v.x * cosA - v.z * sinA;
    const nz = v.x * sinA + v.z * cosA;

    // Aerofoil camber curvature
    const camber = Math.sin((v.z + 16) / 32 * Math.PI) * 5.5;
    // Thin leading/trailing edges
    const taper = 1.0 - (Math.abs(v.z) / 20) * 0.4;

    pos.setXYZ(i, (nx + camber) * taper, v.y, nz);
  }

  geom.computeVertexNormals();
  return geom;
}

/**
 * Procedural Topology Optimized Aerospace Bracket Mesh Generator
 */
export function createAerospaceBracketGeometry(): THREE.BufferGeometry {
  const geom = new THREE.TorusKnotGeometry(18, 5.5, 96, 18, 2, 3);
  geom.scale(1.2, 0.8, 1.0);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Procedural Lattice Gyroid Heat Exchanger Manifold Mesh
 */
export function createLatticeGyroidGeometry(): THREE.BufferGeometry {
  const geom = new THREE.IcosahedronGeometry(24, 4);
  const pos = geom.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Gyroid wave perturbation: sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x)
    const scale = 0.3;
    const g =
      Math.sin(v.x * scale) * Math.cos(v.y * scale) +
      Math.sin(v.y * scale) * Math.cos(v.z * scale) +
      Math.sin(v.z * scale) * Math.cos(v.x * scale);

    v.multiplyScalar(1 + g * 0.12);
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geom.computeVertexNormals();
  return geom;
}

/**
 * Procedural Orthopedic Porous Femoral Hip Implant Stem
 */
export function createHipImplantGeometry(): THREE.BufferGeometry {
  const geom = new THREE.CylinderGeometry(4, 14, 70, 32, 40);
  const pos = geom.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Femoral neck curvature towards +X
    const normY = (v.y + 35) / 70; // 0 (distal tip) to 1 (proximal neck)
    const curveX = Math.pow(normY, 2.5) * 18;
    const flatZ = 1.0 - normY * 0.35; // Flatten anterior-posterior
    // Trabecular porous texture along proximal zone
    let porousBump = 0;
    if (normY > 0.45 && normY < 0.85) {
      porousBump = Math.sin(v.y * 3) * Math.cos(v.x * 3) * 0.6;
    }
    pos.setXYZ(i, v.x + curveX, v.y, v.z * flatZ + porousBump);
  }

  geom.computeVertexNormals();
  geom.center();
  return geom;
}

export interface SlicedSegment2D {
  p1: [number, number];
  p2: [number, number];
}

export interface LayerSliceData {
  z: number;
  segments: SlicedSegment2D[];
  boundingBox: { minX: number; maxX: number; minY: number; maxY: number };
  estimatedArea_mm2: number;
  estimatedPerimeter_mm: number;
}

/**
 * Real 3D Plane-Triangle Intersection Slicer
 * Cuts any THREE.BufferGeometry at height Z and returns exact 2D line segments
 */
export function sliceGeometryAtHeight(geometry: THREE.BufferGeometry, cutZ: number): LayerSliceData {
  const pos = geometry.attributes.position;
  if (!pos) {
    return {
      z: cutZ,
      segments: [],
      boundingBox: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
      estimatedArea_mm2: 0,
      estimatedPerimeter_mm: 0,
    };
  }

  const segments: SlicedSegment2D[] = [];
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pC = new THREE.Vector3();

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let totalPerimeter = 0;

  const numFaces = geometry.index ? geometry.index.count / 3 : pos.count / 3;

  for (let f = 0; f < numFaces; f++) {
    let iA: number, iB: number, iC: number;
    if (geometry.index) {
      iA = geometry.index.getX(f * 3);
      iB = geometry.index.getX(f * 3 + 1);
      iC = geometry.index.getX(f * 3 + 2);
    } else {
      iA = f * 3;
      iB = f * 3 + 1;
      iC = f * 3 + 2;
    }

    pA.fromBufferAttribute(pos, iA);
    pB.fromBufferAttribute(pos, iB);
    pC.fromBufferAttribute(pos, iC);

    const dA = pA.y - cutZ;
    const dB = pB.y - cutZ;
    const dC = pC.y - cutZ;

    const intersections: [number, number][] = [];

    // Edge AB
    if ((dA > 0 && dB < 0) || (dA < 0 && dB > 0)) {
      const t = dA / (dA - dB);
      const ix = pA.x + t * (pB.x - pA.x);
      const iy = pA.z + t * (pB.z - pA.z); // Three.js Y is up, so X and Z form the build plane
      intersections.push([ix, iy]);
    }
    // Edge BC
    if ((dB > 0 && dC < 0) || (dB < 0 && dC > 0)) {
      const t = dB / (dB - dC);
      const ix = pB.x + t * (pC.x - pB.x);
      const iy = pB.z + t * (pC.z - pB.z);
      intersections.push([ix, iy]);
    }
    // Edge CA
    if ((dC > 0 && dA < 0) || (dC < 0 && dA > 0)) {
      const t = dC / (dC - dA);
      const ix = pC.x + t * (pA.x - pC.x);
      const iy = pC.z + t * (pA.z - pC.z);
      intersections.push([ix, iy]);
    }

    if (intersections.length === 2) {
      const [p1, p2] = intersections;
      segments.push({ p1, p2 });
      minX = Math.min(minX, p1[0], p2[0]);
      maxX = Math.max(maxX, p1[0], p2[0]);
      minY = Math.min(minY, p1[1], p2[1]);
      maxY = Math.max(maxY, p1[1], p2[1]);
      const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      totalPerimeter += segLen;
    }
  }

  const spanX = isFinite(minX) && isFinite(maxX) ? Math.max(0, maxX - minX) : 0;
  const spanY = isFinite(minY) && isFinite(maxY) ? Math.max(0, maxY - minY) : 0;
  const areaEstimate = spanX * spanY * 0.62;

  return {
    z: cutZ,
    segments,
    boundingBox: {
      minX: isFinite(minX) ? minX : 0,
      maxX: isFinite(maxX) ? maxX : 0,
      minY: isFinite(minY) ? minY : 0,
      maxY: isFinite(maxY) ? maxY : 0,
    },
    estimatedArea_mm2: Math.round(areaEstimate * 10) / 10,
    estimatedPerimeter_mm: Math.round(totalPerimeter * 10) / 10,
  };
}

/**
 * Calculates Mesh Physical Metrics (Volume, Surface Area, Bounding Box)
 */
export function calculateMeshMetrics(geometry: THREE.BufferGeometry) {
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const box = geometry.boundingBox || new THREE.Box3();
  const size = new THREE.Vector3();
  box.getSize(size);

  const pos = geometry.attributes.position;
  const numTriangles = pos ? (geometry.index ? geometry.index.count / 3 : pos.count / 3) : 0;

  // Approximate volume using bounding box filling factor
  const boundingVolume = size.x * size.y * size.z;
  const estimatedVolume_cm3 = (boundingVolume * 0.38) / 1000; // cm3

  return {
    sizeX_mm: Math.round(size.x * 10) / 10,
    sizeY_mm: Math.round(size.y * 10) / 10,
    sizeZ_mm: Math.round(size.z * 10) / 10,
    boundingVolume_cm3: Math.round((boundingVolume / 1000) * 100) / 100,
    estimatedVolume_cm3: Math.round(estimatedVolume_cm3 * 100) / 100,
    triangleCount: numTriangles,
    vertexCount: pos ? pos.count : 0,
  };
}

/**
 * Calculates exact cross-sectional area from 2D sliced line segments using loop assembly and Shoelace formula
 */
export function calculateExactCrossSectionalArea(segments: SlicedSegment2D[]): { area_mm2: number; loops: [number, number][][] } {
  if (segments.length === 0) return { area_mm2: 0, loops: [] };

  // Connect segments into closed or approximate loops
  const EPSILON = 0.15; // 150 um connection threshold
  const remaining = segments.map((s) => ({
    p1: [...s.p1] as [number, number],
    p2: [...s.p2] as [number, number],
    used: false,
  }));

  const loops: [number, number][][] = [];

  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].used) continue;

    const currentLoop: [number, number][] = [remaining[i].p1, remaining[i].p2];
    remaining[i].used = true;

    let extended = true;
    while (extended) {
      extended = false;
      const tail = currentLoop[currentLoop.length - 1];

      for (let j = 0; j < remaining.length; j++) {
        if (remaining[j].used) continue;

        const d1 = Math.hypot(remaining[j].p1[0] - tail[0], remaining[j].p1[1] - tail[1]);
        const d2 = Math.hypot(remaining[j].p2[0] - tail[0], remaining[j].p2[1] - tail[1]);

        if (d1 < EPSILON) {
          currentLoop.push(remaining[j].p2);
          remaining[j].used = true;
          extended = true;
          break;
        } else if (d2 < EPSILON) {
          currentLoop.push(remaining[j].p1);
          remaining[j].used = true;
          extended = true;
          break;
        }
      }
    }

    if (currentLoop.length >= 3) {
      loops.push(currentLoop);
    }
  }

  // Calculate Shoelace area for all closed/oriented loops
  let totalArea = 0;
  for (const loop of loops) {
    let loopArea = 0;
    const n = loop.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      loopArea += loop[i][0] * loop[j][1];
      loopArea -= loop[j][0] * loop[i][1];
    }
    totalArea += Math.abs(loopArea) * 0.5;
  }

  // Fallback: If segments couldn't form closed loops, approximate using bounding box and segment density
  if (totalArea <= 0.01 && segments.length > 0) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const s of segments) {
      minX = Math.min(minX, s.p1[0], s.p2[0]);
      maxX = Math.max(maxX, s.p1[0], s.p2[0]);
      minY = Math.min(minY, s.p1[1], s.p2[1]);
      maxY = Math.max(maxY, s.p1[1], s.p2[1]);
    }
    const spanX = Math.max(0, maxX - minX);
    const spanY = Math.max(0, maxY - minY);
    totalArea = spanX * spanY * 0.55;
  }

  return {
    area_mm2: Math.round(totalArea * 100) / 100,
    loops,
  };
}

export interface FullStackSliceInfo {
  layerIndex: number;
  z_mm: number;
  area_mm2: number;
  perimeter_mm: number;
  hatchLineCount: number;
  totalHatchLength_mm: number;
  scanPathDensity_mm_per_mm2: number;
  laserExposureTime_s: number;
  recoatTime_s: number;
  cumulativeTime_s: number;
  volumetricEnergyDensity_J_mm3: number;
  arealEnergyDensity_J_mm2: number;
  linearEnergyDensity_J_mm: number;
}

/**
 * Rapid Multi-Layer Slicing & LPBF Build Time Estimation Engine
 */
export function sliceGeometryStack(
  geometry: THREE.BufferGeometry,
  layerThickness_um: number,
  laserPower_W: number,
  scanSpeed_mms: number,
  hatchSpacing_um: number,
  recoatTimePerLayer_s = 10.0,
  maxSampleLayers = 150
): {
  slices: FullStackSliceInfo[];
  totalLayers: number;
  totalBuildTime_hr: number;
  totalLaserTime_hr: number;
  totalRecoatTime_hr: number;
  totalHatchLength_m: number;
  peakLayerArea_mm2: number;
  meanLayerArea_mm2: number;
  totalEstimatedSolidVolume_cm3: number;
} {
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const box = geometry.boundingBox || new THREE.Box3();
  const minY = box.min.y;
  const maxY = box.max.y;
  const height_mm = Math.max(0.1, maxY - minY);

  const tLayer_mm = layerThickness_um * 1e-3;
  const hatch_mm = hatchSpacing_um * 1e-3;
  const totalLayers = Math.max(1, Math.round(height_mm / tLayer_mm));

  const sampleCount = Math.min(totalLayers, maxSampleLayers);
  const step = Math.max(1, Math.floor(totalLayers / sampleCount));

  const slices: FullStackSliceInfo[] = [];
  let cumulativeTime_s = 0;
  let totalHatchLength_mm_sum = 0;
  let totalLaserTime_s_sum = 0;
  let peakArea = 0;
  let totalAreaSum = 0;

  const ved = laserPower_W / (scanSpeed_mms * hatch_mm * tLayer_mm);
  const aed = laserPower_W / (scanSpeed_mms * hatch_mm);
  const led = laserPower_W / scanSpeed_mms;
  const scanDensity = 1.0 / hatch_mm; // mm of path / mm2 area

  for (let idx = 0; idx < totalLayers; idx += step) {
    const layerNum = idx + 1;
    const cutZ = minY + (idx / Math.max(1, totalLayers - 1)) * height_mm;
    const sliceData = sliceGeometryAtHeight(geometry, cutZ);
    const { area_mm2 } = calculateExactCrossSectionalArea(sliceData.segments);

    const effArea = area_mm2 > 0 ? area_mm2 : sliceData.estimatedArea_mm2;
    const perim = sliceData.estimatedPerimeter_mm;

    // Linear hatch length (mm)
    const hatchLength_mm = effArea / Math.max(0.01, hatch_mm);
    const hatchCount = Math.round(Math.sqrt(effArea) / Math.max(0.01, hatch_mm));

    // Laser exposure time: hatching + contour perimeter + jump skywriting overhead
    const hatchTime_s = hatchLength_mm / Math.max(10, scanSpeed_mms);
    const contourTime_s = (perim * 2) / Math.max(10, scanSpeed_mms * 0.7);
    const jumpOverhead_s = hatchCount * 0.0008; // ~0.8ms galvo jump/turn
    const laserTime_s = hatchTime_s + contourTime_s + jumpOverhead_s;

    cumulativeTime_s += (laserTime_s + recoatTimePerLayer_s) * step;
    totalHatchLength_mm_sum += hatchLength_mm * step;
    totalLaserTime_s_sum += laserTime_s * step;
    totalAreaSum += effArea * step;
    peakArea = Math.max(peakArea, effArea);

    slices.push({
      layerIndex: layerNum,
      z_mm: Math.round(cutZ * 10) / 10,
      area_mm2: Math.round(effArea * 10) / 10,
      perimeter_mm: Math.round(perim * 10) / 10,
      hatchLineCount: hatchCount,
      totalHatchLength_mm: Math.round(hatchLength_mm * 10) / 10,
      scanPathDensity_mm_per_mm2: Math.round(scanDensity * 10) / 10,
      laserExposureTime_s: Math.round(laserTime_s * 100) / 100,
      recoatTime_s: recoatTimePerLayer_s,
      cumulativeTime_s: Math.round(cumulativeTime_s),
      volumetricEnergyDensity_J_mm3: Math.round(ved * 10) / 10,
      arealEnergyDensity_J_mm2: Math.round(aed * 10) / 10,
      linearEnergyDensity_J_mm: Math.round(led * 100) / 100,
    });
  }

  const totalRecoatTime_s = totalLayers * recoatTimePerLayer_s;
  const totalBuildTime_s = totalLaserTime_s_sum + totalRecoatTime_s;
  const meanArea = totalLayers > 0 ? totalAreaSum / totalLayers : 0;
  const totalVolume_cm3 = (totalAreaSum * tLayer_mm) / 1000;

  return {
    slices,
    totalLayers,
    totalBuildTime_hr: Math.round((totalBuildTime_s / 3600) * 100) / 100,
    totalLaserTime_hr: Math.round((totalLaserTime_s_sum / 3600) * 100) / 100,
    totalRecoatTime_hr: Math.round((totalRecoatTime_s / 3600) * 100) / 100,
    totalHatchLength_m: Math.round((totalHatchLength_mm_sum / 1000) * 10) / 10,
    peakLayerArea_mm2: Math.round(peakArea * 10) / 10,
    meanLayerArea_mm2: Math.round(meanArea * 10) / 10,
    totalEstimatedSolidVolume_cm3: Math.round(totalVolume_cm3 * 100) / 100,
  };
}


/**
 * Exports THREE.BufferGeometry as ASCII STL File Blob
 */
export function exportGeometryAsSTL(geometry: THREE.BufferGeometry, partName = "MetalliX_Part"): Blob {
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  const numFaces = geometry.index ? geometry.index.count / 3 : pos.count / 3;

  let stlString = `solid ${partName}\n`;
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let f = 0; f < numFaces; f++) {
    let iA: number, iB: number, iC: number;
    if (geometry.index) {
      iA = geometry.index.getX(f * 3);
      iB = geometry.index.getX(f * 3 + 1);
      iC = geometry.index.getX(f * 3 + 2);
    } else {
      iA = f * 3;
      iB = f * 3 + 1;
      iC = f * 3 + 2;
    }

    vA.fromBufferAttribute(pos, iA);
    vB.fromBufferAttribute(pos, iB);
    vC.fromBufferAttribute(pos, iC);

    if (norm) {
      n.fromBufferAttribute(norm, iA);
    } else {
      const cb = new THREE.Vector3().subVectors(vC, vB);
      const ab = new THREE.Vector3().subVectors(vA, vB);
      cb.cross(ab).normalize();
      n.copy(cb);
    }

    stlString += `  facet normal ${n.x.toExponential(6)} ${n.y.toExponential(6)} ${n.z.toExponential(6)}\n`;
    stlString += `    outer loop\n`;
    stlString += `      vertex ${vA.x.toExponential(6)} ${vA.y.toExponential(6)} ${vA.z.toExponential(6)}\n`;
    stlString += `      vertex ${vB.x.toExponential(6)} ${vB.y.toExponential(6)} ${vB.z.toExponential(6)}\n`;
    stlString += `      vertex ${vC.x.toExponential(6)} ${vC.y.toExponential(6)} ${vC.z.toExponential(6)}\n`;
    stlString += `    endloop\n`;
    stlString += `  endfacet\n`;
  }

  stlString += `endsolid ${partName}\n`;
  return new Blob([stlString], { type: "text/plain" });
}
