import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Line } from '@react-three/drei';
import { Leva, useControls } from 'leva';
import * as THREE from 'three';

// Define the interface for the backend response
interface RayPath {
  points: [number, number, number][];
  powers: number[];
}

interface KeyholeMesh {
  vertices: number[];
  indices: number[];
}

interface RaytracingResult {
  status: string;
  solve_time_ms: number;
  total_absorbed_W: number;
  absorption_efficiency: number;
  mesh: KeyholeMesh;
  ray_paths: RayPath[];
}

// Global UI Component
export const KeyholeRaytracingLab: React.FC = () => {
  const [result, setResult] = useState<RaytracingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // 1. Leva UI Controls (CAD-like panel on the top right)
  const params = useControls('Keyhole Laser Parameters', {
    power_W: { value: 250.0, min: 50, max: 1000, step: 10, label: 'Laser Power (W)' },
    beam_radius_um: { value: 50.0, min: 20, max: 150, step: 1, label: 'Beam Radius (µm)' },
    keyhole_depth_um: { value: 120.0, min: 10, max: 300, step: 5, label: 'Keyhole Depth (µm)' },
    base_absorption: { value: 0.35, min: 0.05, max: 0.9, step: 0.01, label: 'Base Absorption' },
    max_bounces: { value: 5, min: 1, max: 15, step: 1, label: 'Max Bounces' },
  });

  // 2. Fetch data from Python Backend (NVIDIA Warp)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:5000/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `raytrace-${Date.now()}`,
            method: 'keyhole-raytracing',
            payload: params
          })
        });
        const json = await response.json();
        if (json.data?.status === 'success') {
          setResult(json.data);
        }
      } catch (e) {
        console.error("Failed to fetch raytracing data from Warp:", e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [params]);

  // 3. Prepare 3D Geometry
  const geometry = useMemo(() => {
    if (!result?.mesh) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(result.mesh.vertices, 3));
    geo.setIndex(result.mesh.indices);
    geo.computeVertexNormals();
    return geo;
  }, [result?.mesh]);

  return (
    <div className="relative w-full h-screen bg-gray-950 text-white font-sans overflow-hidden">
      {/* Leva takes care of its own UI panel */}
      
      {/* Overlay Dashboard */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-4 pointer-events-none">
        <div className="bg-gray-900/80 backdrop-blur border border-gray-700 p-6 rounded-xl shadow-2xl">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
            NVIDIA Warp Ray Tracing
          </h1>
          <p className="text-gray-400 text-sm mt-1">GPU Accelerated Keyhole Light Trapping</p>
          
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Efficiency</div>
              <div className="text-4xl font-light text-emerald-400">
                {result ? (result.absorption_efficiency * 100).toFixed(1) : '--'}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Absorbed Power</div>
              <div className="text-4xl font-light text-orange-400">
                {result ? result.total_absorbed_W.toFixed(0) : '--'}<span className="text-lg">W</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-800 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Solve Time: <span className="text-gray-300 font-mono">{result ? result.solve_time_ms.toFixed(1) : '--'} ms</span>
            </div>
            {loading && <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />}
          </div>
        </div>
      </div>

      {/* R3F 3D Canvas */}
      <Canvas camera={{ position: [0.0003, 0.0003, 0.0002], fov: 45, near: 0.000001, far: 0.01 }}>
        <color attach="background" args={['#030712']} />
        
        {/* Lights */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[1, 1, 1]} intensity={1.5} />
        
        {/* Scene Environment */}
        <Environment preset="city" />
        
        {/* Orbit Controls */}
        <OrbitControls target={[0, 0, -0.00005]} makeDefault />
        
        {/* Keyhole Mesh */}
        {geometry && (
          <mesh geometry={geometry}>
            <meshStandardMaterial 
              color="#3b82f6" 
              wireframe={false} 
              transparent 
              opacity={0.8}
              roughness={0.2}
              metalness={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
        
        {/* Laser Rays */}
        {result?.ray_paths.map((path, idx) => {
          // Flatten points for the Line component
          const flatPoints = path.points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
          
          // Generate vertex colors based on power (white/yellow -> red -> dark)
          const colors = path.powers.map(p => {
            const ratio = p / params.power_W;
            return new THREE.Color().setHSL(0.1 * ratio, 1.0, 0.1 + 0.4 * ratio);
          });
          
          return (
            <Line
              key={idx}
              points={flatPoints}
              color="white"
              vertexColors={colors.map(c => [c.r, c.g, c.b] as [number, number, number])}
              lineWidth={1.5}
              transparent
              opacity={0.6}
            />
          );
        })}

        {/* Origin Grid Helper scaled for micrometers */}
        <gridHelper args={[0.001, 20, '#1f2937', '#111827']} rotation={[Math.PI/2, 0, 0]} />
      </Canvas>
    </div>
  );
};
