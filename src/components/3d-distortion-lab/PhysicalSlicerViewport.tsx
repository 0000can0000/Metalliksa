import React, { useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, GizmoHelper, GizmoViewport, Outlines } from "@react-three/drei";

export function PhysicalSlicerViewport({
  geometry,
  currentLayerZ,
  meshMetrics,
}: {
  geometry: THREE.BufferGeometry;
  currentLayerZ: number;
  meshMetrics: any;
}) {
  const solidClipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), currentLayerZ), [currentLayerZ]);
  const ghostClipPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -currentLayerZ), [currentLayerZ]);

  return (
    <Canvas
      camera={{ position: [65, 55, 75], fov: 45 }}
      gl={{ localClippingEnabled: true, antialias: true, alpha: true }}
      className="w-full h-full bg-[#050811] cursor-grab active:cursor-grabbing"
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[50, 80, 50]} intensity={1.2} color="#ffffff" />
      <Environment preset="city" />

      {/* Base Grid */}
      <Grid
        position={[0, -meshMetrics.sizeY_mm / 2 - 1, 0]}
        infiniteGrid
        fadeDistance={200}
        sectionColor="#0284c7"
        cellColor="#1e293b"
      />

      {/* Solid Metal Part (Below Layer) */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#0ea5e9"
          roughness={0.2}
          metalness={0.8}
          side={THREE.DoubleSide}
          clippingPlanes={[solidClipPlane]}
        />
      </mesh>

      {/* Ghost Part (Above Layer) */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#38bdf8"
          roughness={0.4}
          metalness={0.1}
          transparent
          opacity={0.15}
          wireframe
          clippingPlanes={[ghostClipPlane]}
        />
      </mesh>

      {/* Slicing Plane Glowing Visualizer */}
      <mesh position={[0, currentLayerZ, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[150, 150]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.25} depthWrite={false} side={THREE.DoubleSide} />
        <Outlines thickness={0.05} color="#06b6d4" />
      </mesh>

      <OrbitControls makeDefault dampingFactor={0.05} autoRotate autoRotateSpeed={1.0} />
      <GizmoHelper alignment="bottom-right" margin={[40, 40]}>
        <GizmoViewport labelColor="white" axisHeadScale={1} />
      </GizmoHelper>
    </Canvas>
  );
}
