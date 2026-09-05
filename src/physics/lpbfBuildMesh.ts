import type { BufferGeometry } from "three";

/** Cap JSON payload size for the Python slicer (express limit is 50 MB). */
export const MAX_LPBF_SLICER_TRIANGLES = 12000;

export interface SlicerTriangleMesh {
  triangles: number[][][];
  nativeTriangleCount: number;
  usedTriangleCount: number;
}

/**
 * Extract facet vertices from a Three.js BufferGeometry.
 * Uniform stride so large STLs are not biased to the first facets in the file.
 */
export function bufferGeometryToSlicerTriangles(geom: BufferGeometry): SlicerTriangleMesh {
  const pos = geom.attributes.position;
  if (!pos || pos.count < 3) {
    return { triangles: [], nativeTriangleCount: 0, usedTriangleCount: 0 };
  }

  const nativeTriangleCount = Math.floor(pos.count / 3);
  const stride = Math.max(1, Math.ceil(nativeTriangleCount / MAX_LPBF_SLICER_TRIANGLES));
  const triangles: number[][][] = [];

  for (let i = 0; i < nativeTriangleCount; i += stride) {
    const i3 = i * 3;
    triangles.push([
      [pos.getX(i3), pos.getY(i3), pos.getZ(i3)],
      [pos.getX(i3 + 1), pos.getY(i3 + 1), pos.getZ(i3 + 1)],
      [pos.getX(i3 + 2), pos.getY(i3 + 2), pos.getZ(i3 + 2)],
    ]);
  }

  return {
    triangles,
    nativeTriangleCount,
    usedTriangleCount: triangles.length,
  };
}
