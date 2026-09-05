import { create } from "zustand";
import type { BufferGeometry } from "three";
import { bufferGeometryToSlicerTriangles } from "../physics/lpbfBuildMesh";

export interface LpbfLiveBuildMesh {
  name: string;
  triangles: number[][][];
  nativeTriangleCount: number;
  usedTriangleCount: number;
}

interface LpbfBuildMeshStore {
  mesh: LpbfLiveBuildMesh | null;
  setFromGeometry: (name: string, geom: BufferGeometry) => void;
  clearMesh: () => void;
}

/**
 * Session-only Build Job CAD. Not persisted — STL buffers are too large for localStorage.
 * cadAssetName on the specimen store is the filename only.
 */
export const useLpbfBuildMeshStore = create<LpbfBuildMeshStore>((set) => ({
  mesh: null,
  setFromGeometry: (name, geom) => {
    const extracted = bufferGeometryToSlicerTriangles(geom);
    if (extracted.usedTriangleCount === 0) {
      set({ mesh: null });
      return;
    }
    set({
      mesh: {
        name,
        triangles: extracted.triangles,
        nativeTriangleCount: extracted.nativeTriangleCount,
        usedTriangleCount: extracted.usedTriangleCount,
      },
    });
  },
  clearMesh: () => set({ mesh: null }),
}));
