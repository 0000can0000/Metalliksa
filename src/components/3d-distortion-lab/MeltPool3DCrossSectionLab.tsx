import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import {
  Flame,
  Activity,
  Layers,
  Zap,
  Sliders,
  Sparkles,
  Maximize2,
  Minimize2,
  Info,
  RotateCcw,
  Compass,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Download,
  Crosshair,
  Grid,
  Cpu,
  RefreshCw,
  Box,
  Eye,
  Scissors,
  ArrowRight,
  TrendingDown,
  Waves,
  Sun,
  ShieldCheck,
} from "lucide-react";
import {
  pythonComputationService,
  PythonLPBFResult,
} from "../../services/pythonComputationService";

export interface MeltPool3DCrossSectionProps {
  initialPower_W?: number;
  initialSpeed_mms?: number;
  initialBeamDiameter_um?: number;
  initialPreheat_C?: number;
  initialLayer_um?: number;
  initialHatch_um?: number;
  initialMaterial?: string;
  onParametersChange?: (params: {
    laserPower_W: number;
    scanSpeed_mm_s: number;
    beamDiameter_um: number;
    preheatTemp_C: number;
    layerThickness_um: number;
    hatchSpacing_um: number;
    material: string;
  }) => void;
}

export type SlicingPlane = "longitudinal-xz" | "transverse-yz" | "top-xy" | "isometric-3d" | "quarter-cutaway";

export const MeltPool3DCrossSectionLab: React.FC<MeltPool3DCrossSectionProps> = ({
  initialPower_W = 285,
  initialSpeed_mms = 960,
  initialBeamDiameter_um = 80,
  initialPreheat_C = 80,
  initialLayer_um = 40,
  initialHatch_um = 110,
  initialMaterial = "Inconel 718",
  onParametersChange,
}) => {
  // Laser & Process Parameters
  const [laserPower_W, setLaserPower_W] = useState<number>(initialPower_W);
  const [scanSpeed_mms, setScanSpeed_mms] = useState<number>(initialSpeed_mms);
  const [beamDiameter_um, setBeamDiameter_um] = useState<number>(initialBeamDiameter_um);
  const [preheatTemp_C, setPreheatTemp_C] = useState<number>(initialPreheat_C);
  const [layerThickness_um, setLayerThickness_um] = useState<number>(initialLayer_um);
  const [hatchSpacing_um, setHatchSpacing_um] = useState<number>(initialHatch_um);
  const [selectedMaterial, setSelectedMaterial] = useState<string>(initialMaterial);
  const [laserWavelength, setLaserWavelength] = useState<"IR_1064nm" | "Green_515nm" | "Blue_450nm">("IR_1064nm");

  // 3D Visualization Controls
  const [slicingPlane, setSlicingPlane] = useState<SlicingPlane>("quarter-cutaway");
  const [sliceCutOffset, setSliceCutOffset] = useState<number>(0); // -100 to +100 um
  const [showIsotherms, setShowIsotherms] = useState<boolean>(true);
  const [showPowderBed, setShowPowderBed] = useState<boolean>(true);
  const [showLaserRays, setShowLaserRays] = useState<boolean>(true);
  const [showMarangoniVectors, setShowMarangoniVectors] = useState<boolean>(true);
  const [wireframeMode, setWireframeMode] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // Python Engine State
  const [pyResult, setPyResult] = useState<PythonLPBFResult | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Three.js Mount Ref
  const threeMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Execute Python Solver
  const solvePhysics = useCallback(async () => {
    setIsSolving(true);
    setErrorMsg(null);
    try {
      const res = await pythonComputationService.solveLPBFThermalPhysics({
        material: selectedMaterial,
        laserPower_W,
        scanSpeed_mm_s: scanSpeed_mms,
        beamDiameter_um,
        preheatTemp_C,
        layerThickness_um,
        hatchSpacing_um,
        laserWavelength,
      });
      setPyResult(res);

      if (onParametersChange) {
        onParametersChange({
          laserPower_W,
          scanSpeed_mm_s: scanSpeed_mms,
          beamDiameter_um,
          preheatTemp_C,
          layerThickness_um,
          hatchSpacing_um,
          material: selectedMaterial,
        });
      }
    } catch (err: any) {
      console.warn("Python LPBF Thermal Solver Error:", err);
      setErrorMsg(err.message || "Failed to execute Python thermal solver.");
    } finally {
      setIsSolving(false);
    }
  }, [
    selectedMaterial,
    laserPower_W,
    scanSpeed_mms,
    beamDiameter_um,
    preheatTemp_C,
    layerThickness_um,
    hatchSpacing_um,
    laserWavelength,
    onParametersChange,
  ]);

  // Debounced execution on parameter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      solvePhysics();
    }, 200);
    return () => clearTimeout(timer);
  }, [solvePhysics]);

  // Regime classification values
  const regimeInfo = useMemo(() => {
    const enthalpy = pyResult?.processParameters?.normalizedEnthalpy || (laserPower_W * 0.45) / (8190 * 435 * 1250 * Math.sqrt(Math.PI * 3e-6 * (scanSpeed_mms * 1e-3) * Math.pow(beamDiameter_um * 0.5e-6, 3)));
    const d_over_w = pyResult?.meltPoolGeometry?.depthToWidthRatio_D_over_W || 0.45;
    const isKeyhole = enthalpy > 11.0 || d_over_w > 0.95;
    const isTransition = enthalpy >= 5.5 && enthalpy <= 11.0 && !isKeyhole;
    const isConduction = enthalpy < 5.5;

    let modeName = "Conduction Regime (Stable)";
    let badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    let desc = "Stable, semi-circular melt pool. Shallow depth, minimal vapor recoil pressure, and zero keyhole porosity risk.";
    let keyRisk = "Low (ASTM F3055 Compliant)";

    if (isKeyhole) {
      modeName = "Keyhole Regime (Vapor Depression)";
      badgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)]";
      desc = "Knudsen recoil pressure (P_recoil) depresses melt surface, opening a deep vapor depression. Entrapped vapor bubbles at the bottom lead to keyhole pores.";
      keyRisk = "HIGH (Keyhole Porosity Danger)";
    } else if (isTransition) {
      modeName = "Transition Mode";
      badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";
      desc = "Intermediate stage between conduction and deep penetration. Mild vapor pressure depression with increased penetration depth.";
      keyRisk = "Moderate / Near Threshold";
    }

    return {
      enthalpy: parseFloat(enthalpy.toFixed(2)),
      d_over_w: parseFloat(d_over_w.toFixed(2)),
      isKeyhole,
      isTransition,
      isConduction,
      modeName,
      badgeColor,
      desc,
      keyRisk,
    };
  }, [pyResult, laserPower_W, scanSpeed_mms, beamDiameter_um]);

  // Three.js 3D Melt Pool Cross-Section Scene Builder
  useEffect(() => {
    if (!threeMountRef.current) return;
    const container = threeMountRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 3000);
    camera.position.set(240, 160, 260);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 2. Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xffeedd, 1.4);
    dirLight1.position.set(200, 300, 150);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.7);
    dirLight2.position.set(-200, -100, -150);
    scene.add(dirLight2);

    // 3. Root Object Group for Rotational Orbiting
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    controlsGroupRef.current = rootGroup;

    // Set camera target
    camera.lookAt(0, -15, 0);

    // Melt Pool Parameters in Microns (Scaled 1 um = 1 Three unit for convenience)
    const geom = pyResult?.meltPoolGeometry;
    const af = geom?.goldakParameters?.semiAxis_af_front_um || (beamDiameter_um * 0.9);
    const ar = geom?.goldakParameters?.semiAxis_ar_rear_um || (beamDiameter_um * 2.8);
    const b = geom?.goldakParameters?.semiAxis_b_halfwidth_um || (beamDiameter_um * 0.75);
    const c = geom?.goldakParameters?.semiAxis_c_depth_um || (layerThickness_um * 1.8);
    const d_kh = geom?.keyholeVaporCavityDepth_um || 0;
    const isKeyhole = regimeInfo.isKeyhole;

    // Slicing Plane Clipping setup
    const localClippingPlanes: THREE.Plane[] = [];
    if (slicingPlane === "longitudinal-xz") {
      // Cut off Y > sliceCutOffset
      localClippingPlanes.push(new THREE.Plane(new THREE.Vector3(0, 0, 1), -sliceCutOffset));
    } else if (slicingPlane === "transverse-yz") {
      // Cut off X > sliceCutOffset
      localClippingPlanes.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), -sliceCutOffset));
    } else if (slicingPlane === "top-xy") {
      // Cut off Z (depth)
      localClippingPlanes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), sliceCutOffset));
    } else if (slicingPlane === "quarter-cutaway") {
      // Cut front quarter (X > 0 and Z > 0)
      localClippingPlanes.push(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
    }

    // 4. Substrate & Powder Bed Block
    const blockWidth = 360;
    const blockLength = 480;
    const blockHeight = 160;

    // Solid Substrate Base Mesh
    const substrateGeom = new THREE.BoxGeometry(blockLength, blockHeight, blockWidth);
    const substrateMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.35,
      clippingPlanes: localClippingPlanes,
      clipShadows: true,
    });
    const substrateMesh = new THREE.Mesh(substrateGeom, substrateMat);
    substrateMesh.position.set(0, -blockHeight / 2, 0);
    rootGroup.add(substrateMesh);

    // Substrate Edge Wireframe
    const subEdges = new THREE.EdgesGeometry(substrateGeom);
    const subLineMat = new THREE.LineBasicMaterial({ color: 0x1e293b });
    const subLine = new THREE.LineSegments(subEdges, subLineMat);
    subLine.position.set(0, -blockHeight / 2, 0);
    rootGroup.add(subLine);

    // 5. Powder Layer Top Sheet (z = -layerThickness)
    if (showPowderBed) {
      const powderThickness = layerThickness_um;
      const powderGeom = new THREE.BoxGeometry(blockLength, powderThickness, blockWidth);
      const powderMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.95,
        metalness: 0.1,
        transparent: true,
        opacity: 0.65,
        clippingPlanes: localClippingPlanes,
      });
      const powderMesh = new THREE.Mesh(powderGeom, powderMat);
      powderMesh.position.set(0, -powderThickness / 2, 0);
      rootGroup.add(powderMesh);

      // Powder Layer Boundary Line
      const layerLineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-blockLength / 2, -powderThickness, -blockWidth / 2),
        new THREE.Vector3(blockLength / 2, -powderThickness, -blockWidth / 2),
        new THREE.Vector3(blockLength / 2, -powderThickness, blockWidth / 2),
        new THREE.Vector3(-blockLength / 2, -powderThickness, blockWidth / 2),
      ]);
      const layerLineMat = new THREE.LineBasicMaterial({ color: 0xfbbf24 });
      const layerLine = new THREE.LineLoop(layerLineGeom, layerLineMat);
      rootGroup.add(layerLine);
    }

    // 6. 3D GOLDAK DOUBLE ELLIPSOID MELT POOL MESH GENERATION
    // Construct parametric Goldak solid geometry
    const radialSegs = 48;
    const heightSegs = 36;
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Parametric mesh: theta (0 to PI/2 down from surface), phi (0 to 2PI around scan axis)
    for (let j = 0; j <= heightSegs; j++) {
      const theta = (j / heightSegs) * (Math.PI / 2); // 0 (surface) to PI/2 (bottom apex)
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let i = 0; i <= radialSegs; i++) {
        const phi = (i / radialSegs) * Math.PI * 2;
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);

        // Goldak scaling: x >= 0 uses af, x < 0 uses ar
        const isFront = cosPhi >= 0;
        const a_axis = isFront ? af : ar;

        // Coordinates: X = scan axis, Y = depth down (negative), Z = transverse width
        const x = sinTheta * cosPhi * a_axis;
        const y = -cosTheta * c; // depth downward
        const z = sinTheta * sinPhi * b;

        vertices.push(x, y, z);

        // Temperature Colormap assignment:
        // Core = bright incandescent solar (Keyhole / liquid center), Rim = liquidus gold -> amber mushy
        const rNorm = Math.sqrt(Math.pow(x / a_axis, 2) + Math.pow(z / b, 2) + Math.pow(y / c, 2));
        const color = new THREE.Color();

        if (isKeyhole && rNorm < 0.35 && y > -d_kh) {
          // Intense white-cyan plasma inside keyhole
          color.setRGB(0.95, 0.98, 1.0);
        } else if (rNorm < 0.65) {
          // High temperature molten metal (Radiant Red-Orange / Gold)
          color.setRGB(1.0, 0.45 + (1 - rNorm) * 0.4, 0.05 + (1 - rNorm) * 0.3);
        } else if (rNorm <= 1.0) {
          // Mushy Zone Front (Solidus to Liquidus)
          color.setRGB(0.98, 0.58, 0.15);
        } else {
          // Heat Affected Zone (HAZ)
          color.setRGB(0.4, 0.2, 0.6);
        }

        colors.push(color.r, color.g, color.b);
      }
    }

    // Grid triangles
    for (let j = 0; j < heightSegs; j++) {
      for (let i = 0; i < radialSegs; i++) {
        const a = j * (radialSegs + 1) + i;
        const b_idx = (j + 1) * (radialSegs + 1) + i;
        const c_idx = (j + 1) * (radialSegs + 1) + (i + 1);
        const d_idx = j * (radialSegs + 1) + (i + 1);

        indices.push(a, b_idx, d_idx);
        indices.push(b_idx, c_idx, d_idx);
      }
    }

    const meltPoolGeom = new THREE.BufferGeometry();
    meltPoolGeom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    meltPoolGeom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    meltPoolGeom.setIndex(indices);
    meltPoolGeom.computeVertexNormals();

    const meltPoolMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.3,
      metalness: 0.8,
      wireframe: wireframeMode,
      side: THREE.DoubleSide,
      clippingPlanes: localClippingPlanes,
      clipShadows: true,
    });

    const meltPoolMesh = new THREE.Mesh(meltPoolGeom, meltPoolMat);
    rootGroup.add(meltPoolMesh);

    // 7. KEYHOLE VAPOR DEPRESSION CAVITY MESH (If in Keyhole or Transition mode)
    if (d_kh > 5 || isKeyhole) {
      const khDepth = Math.max(d_kh, isKeyhole ? c * 0.75 : c * 0.4);
      const khRadius = beamDiameter_um * 0.35;

      const keyholeConeGeom = new THREE.ConeGeometry(khRadius, khDepth, 32, 16, true);
      keyholeConeGeom.rotateX(Math.PI); // Point down
      keyholeConeGeom.translate(0, -khDepth / 2, 0);

      const keyholeMat = new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xef4444,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.9,
        side: THREE.DoubleSide,
        clippingPlanes: localClippingPlanes,
      });

      const keyholeMesh = new THREE.Mesh(keyholeConeGeom, keyholeMat);
      rootGroup.add(keyholeMesh);

      // Trapped Keyhole Bubble / Porosity Sphere at the cavity root
      if (isKeyhole) {
        const bubbleGeom = new THREE.SphereGeometry(khRadius * 0.55, 16, 16);
        const bubbleMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.8,
          roughness: 0.1,
          wireframe: true,
          clippingPlanes: localClippingPlanes,
        });
        const bubbleMesh = new THREE.Mesh(bubbleGeom, bubbleMat);
        bubbleMesh.position.set(-af * 0.4, -khDepth * 1.05, 0);
        rootGroup.add(bubbleMesh);
      }
    }

    // 8. LASER BEAM & MULTI-REFLECTION OPTICAL RAYS
    if (showLaserRays) {
      // Main Laser Cylinder Beam
      const r_beam = beamDiameter_um / 2;
      const beamHeight = 180;
      const beamGeom = new THREE.CylinderGeometry(r_beam * 0.8, r_beam, beamHeight, 32, 1, true);
      beamGeom.translate(0, beamHeight / 2, 0);

      const beamMat = new THREE.MeshBasicMaterial({
        color: laserWavelength === "Green_515nm" ? 0x10b981 : laserWavelength === "Blue_450nm" ? 0x38bdf8 : 0xf43f5e,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      });
      const beamMesh = new THREE.Mesh(beamGeom, beamMat);
      rootGroup.add(beamMesh);

      // Central Laser Core Line
      const coreGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, beamHeight, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const coreMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
      });
      const coreLine = new THREE.Line(coreGeom, coreMat);
      rootGroup.add(coreLine);

      // Keyhole Multi-Reflection Ray-Tracing Bounce Lines
      if (isKeyhole && d_kh > 5) {
        const rayPoints = [
          new THREE.Vector3(0, 50, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(-r_beam * 0.5, -d_kh * 0.4, 0),
          new THREE.Vector3(r_beam * 0.3, -d_kh * 0.7, 0),
          new THREE.Vector3(-r_beam * 0.1, -d_kh * 0.95, 0),
        ];
        const rayGeom = new THREE.BufferGeometry().setFromPoints(rayPoints);
        const rayLineMat = new THREE.LineBasicMaterial({
          color: 0xfde047,
          linewidth: 2,
        });
        const rayLine = new THREE.Line(rayGeom, rayLineMat);
        rootGroup.add(rayLine);
      }
    }

    // 9. MARANGONI CONVECTION STREAMLINE VORTICES
    if (showMarangoniVectors) {
      const vortexMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 });

      // Left Surface Outward Vortex Loop
      const vortexCurve1 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 5),
        new THREE.Vector3(-af * 0.2, -5, b * 0.4),
        new THREE.Vector3(-af * 0.5, -c * 0.35, b * 0.7),
        new THREE.Vector3(-af * 0.7, -c * 0.55, b * 0.3),
        new THREE.Vector3(-af * 0.4, -c * 0.3, 5),
      ], true);
      const vGeom1 = new THREE.BufferGeometry().setFromPoints(vortexCurve1.getPoints(32));
      const vLine1 = new THREE.Line(vGeom1, vortexMat);
      rootGroup.add(vLine1);

      // Right Surface Outward Vortex Loop
      const vortexCurve2 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, -5),
        new THREE.Vector3(-af * 0.2, -5, -b * 0.4),
        new THREE.Vector3(-af * 0.5, -c * 0.35, -b * 0.7),
        new THREE.Vector3(-af * 0.7, -c * 0.55, -b * 0.3),
        new THREE.Vector3(-af * 0.4, -c * 0.3, -5),
      ], true);
      const vGeom2 = new THREE.BufferGeometry().setFromPoints(vortexCurve2.getPoints(32));
      const vLine2 = new THREE.Line(vGeom2, vortexMat);
      rootGroup.add(vLine2);
    }

    // 10. SCAN VELOCITY VECTOR ARROW
    const scanDir = new THREE.Vector3(1, 0, 0);
    const scanOrigin = new THREE.Vector3(af + 25, 0, 0);
    const scanArrow = new THREE.ArrowHelper(scanDir, scanOrigin, 60, 0x10b981, 14, 8);
    rootGroup.add(scanArrow);

    // 11. Coordinate Axes Helper & Floor Grid
    const grid = new THREE.GridHelper(blockLength, 20, 0x0284c7, 0x1e293b);
    grid.position.y = -blockHeight;
    rootGroup.add(grid);

    // Mouse Interaction / Orbit Dragging
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !controlsGroupRef.current) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      controlsGroupRef.current.rotation.y += deltaX * 0.008;
      controlsGroupRef.current.rotation.x += deltaY * 0.008;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      const fov = cameraRef.current.fov + e.deltaY * 0.04;
      cameraRef.current.fov = Math.max(15, Math.min(85, fov));
      cameraRef.current.updateProjectionMatrix();
    };

    const domElement = renderer.domElement;
    domElement.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    domElement.addEventListener("wheel", handleWheel, { passive: false });

    // Render Animation Loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      if (autoRotate && controlsGroupRef.current) {
        controlsGroupRef.current.rotation.y += 0.006;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Clean up
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      domElement.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      domElement.removeEventListener("wheel", handleWheel);
      renderer.dispose();
    };
  }, [
    pyResult,
    slicingPlane,
    sliceCutOffset,
    showIsotherms,
    showPowderBed,
    showLaserRays,
    showMarangoniVectors,
    wireframeMode,
    autoRotate,
    laserPower_W,
    scanSpeed_mms,
    beamDiameter_um,
    layerThickness_um,
    hatchSpacing_um,
    laserWavelength,
    regimeInfo,
  ]);

  // Preset Configurations
  const applyPreset = (preset: "conduction-safe" | "transition-deep" | "keyhole-danger" | "lack-of-fusion") => {
    if (preset === "conduction-safe") {
      setLaserPower_W(220);
      setScanSpeed_mms(1100);
      setBeamDiameter_um(80);
      setLayerThickness_um(40);
      setHatchSpacing_um(100);
    } else if (preset === "transition-deep") {
      setLaserPower_W(320);
      setScanSpeed_mms(900);
      setBeamDiameter_um(80);
      setLayerThickness_um(40);
      setHatchSpacing_um(105);
    } else if (preset === "keyhole-danger") {
      setLaserPower_W(480);
      setScanSpeed_mms(450);
      setBeamDiameter_um(65);
      setLayerThickness_um(40);
      setHatchSpacing_um(120);
    } else if (preset === "lack-of-fusion") {
      setLaserPower_W(140);
      setScanSpeed_mms(1600);
      setBeamDiameter_um(100);
      setLayerThickness_um(60);
      setHatchSpacing_um(150);
    }
  };

  // Export Goldak FEA DFLUX Card
  const exportGoldakCard = () => {
    if (!pyResult) return;
    const geom = pyResult.meltPoolGeometry;
    const params = pyResult.processParameters;
    const goldak = geom.goldakParameters;

    const feaCard = `** -------------------------------------------------------------
** METALLIX LPBF GOLDAK HEAT SOURCE CAE EXPORT CARD
** Material: ${pyResult.material} (Base: ${pyResult.baseMetal})
** Laser Power: ${params.laserPower_W} W | Scan Speed: ${params.scanSpeed_mm_s} mm/s
** Beam Diameter: ${params.beamDiameter_um} um | Wavelength: ${pyResult.laserWavelength}
** Volumetric Energy Density (VED): ${params.volumetricEnergyDensity_J_mm3} J/mm3
** Normalized Enthalpy (ΔH/hs): ${params.normalizedEnthalpy} (${geom.regime})
** -------------------------------------------------------------
*DFLUX, USER
*GOLDAK_DOUBLE_ELLIPSOID
** Semi-Axes in meters (SI Units):
** a_front (m), a_rear (m), b_halfwidth (m), c_depth (m), Q_total (W), eta_eff
 ${(goldak.semiAxis_af_front_um * 1e-6).toExponential(4)}, ${(goldak.semiAxis_ar_rear_um * 1e-6).toExponential(4)}, ${(goldak.semiAxis_b_halfwidth_um * 1e-6).toExponential(4)}, ${(goldak.semiAxis_c_depth_um * 1e-6).toExponential(4)}, ${params.laserPower_W}, ${params.effectiveAbsorptivity}
** Solidification Kinetics:
** G_avg: ${pyResult.solidificationKinetics.thermalGradient_G_K_m} K/m
** R_solid: ${pyResult.solidificationKinetics.solidificationRate_R_m_s} m/s
** Cooling Rate: ${pyResult.solidificationKinetics.coolingRate_K_s} K/s
** Primary Spacing (PDAS): ${pyResult.solidificationKinetics.primaryDendriteArmSpacing_PDAS_um} um
** -------------------------------------------------------------`;

    const blob = new Blob([feaCard], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Goldak_LPBF_CrossSection_${pyResult.material.replace(/\s+/g, "_")}_${params.laserPower_W}W.inp`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* HEADER BAR & REGIME STATUS */}
      <div className="p-4 rounded-2xl bg-[#090e18] border border-[#1e2d46] space-y-3 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.35)] border border-amber-400/40">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  3D Cross-Sectional Melt Pool Geometry &amp; Conduction-Keyhole Transition Studio
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-sky-400" />
                  Python HPC Solver
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Volumetric 3D Goldak double-ellipsoid, Knudsen recoil vapor keyhole cavity, and Marangoni convection cross-sections.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={solvePhysics}
              disabled={isSolving}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition shadow-[0_0_15px_rgba(2,132,199,0.3)] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSolving ? "animate-spin" : ""}`} />
              <span>{isSolving ? "Computing..." : "Re-Solve (Python)"}</span>
            </button>

            <button
              type="button"
              onClick={exportGoldakCard}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#050810] hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
              title="Export Abaqus / Ansys DFLUX Card"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Goldak CAE (.inp)</span>
            </button>
          </div>
        </div>

        {/* Dynamic Transition Banner */}
        <div className={`p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${regimeInfo.badgeColor}`}>
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 font-bold text-xs">
                <span>{regimeInfo.modeName}</span>
                <span className="text-[10px] opacity-80">(Normalized Enthalpy ΔH/h_s = {regimeInfo.enthalpy})</span>
              </div>
              <p className="text-[11px] opacity-90 mt-0.5 font-sans leading-relaxed">
                {regimeInfo.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className="text-[10px] opacity-75 block">D/W Ratio:</span>
              <strong className="text-xs">{regimeInfo.d_over_w}</strong>
            </div>
            <div className="text-right border-l border-current/30 pl-2">
              <span className="text-[10px] opacity-75 block">Risk Status:</span>
              <strong className="text-xs">{regimeInfo.keyRisk}</strong>
            </div>
          </div>
        </div>

        {/* Presets Quick Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
          <span className="text-[10px] text-slate-400">Regime Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset("conduction-safe")}
            className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] transition"
          >
            ✅ Stable Conduction
          </button>
          <button
            type="button"
            onClick={() => applyPreset("transition-deep")}
            className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] transition"
          >
            ⚠️ Transition Mode
          </button>
          <button
            type="button"
            onClick={() => applyPreset("keyhole-danger")}
            className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] transition"
          >
            🚨 Critical Keyhole Cavity
          </button>
          <button
            type="button"
            onClick={() => applyPreset("lack-of-fusion")}
            className="px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] transition"
          >
            ⚡ Lack of Fusion
          </button>
        </div>
      </div>

      {/* PARAMETER SLIDERS */}
      <div className="p-3.5 rounded-xl bg-[#090e18] border border-[#162032] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Material */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400">Alloy Material</label>
          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value)}
            className="w-full bg-[#050810] text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:border-sky-500 outline-none"
          >
            <option value="Inconel 718">Inconel 718 (Ni-Cr-Fe)</option>
            <option value="Ti-6Al-4V">Ti-6Al-4V Grade 5</option>
            <option value="316L Stainless Steel">316L Stainless Steel</option>
            <option value="AlSi10Mg">AlSi10Mg (Al-Si)</option>
            <option value="CoCrMo">CoCrMo (Bio/Aero)</option>
            <option value="Scalmalloy (Al-Mg-Sc-Zr)">Scalmalloy (Sc-Zr)</option>
            <option value="Hastelloy X">Hastelloy X (Ni-Cr)</option>
            <option value="Pure Copper (Cu-OF)">Pure Copper (Cu-OF)</option>
          </select>
        </div>

        {/* Laser Power */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Power (P)</span>
            <span className="text-rose-400 font-bold">{laserPower_W} W</span>
          </div>
          <input
            type="range"
            min={80}
            max={600}
            step={10}
            value={laserPower_W}
            onChange={(e) => setLaserPower_W(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
        </div>

        {/* Scan Speed */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Speed (v)</span>
            <span className="text-emerald-400 font-bold">{scanSpeed_mms} mm/s</span>
          </div>
          <input
            type="range"
            min={200}
            max={2500}
            step={25}
            value={scanSpeed_mms}
            onChange={(e) => setScanSpeed_mms(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Beam Diameter */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Beam Diameter (d)</span>
            <span className="text-sky-400 font-bold">{beamDiameter_um} μm</span>
          </div>
          <input
            type="range"
            min={40}
            max={150}
            step={5}
            value={beamDiameter_um}
            onChange={(e) => setBeamDiameter_um(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Layer Thickness */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Layer Thickness (t)</span>
            <span className="text-amber-400 font-bold">{layerThickness_um} μm</span>
          </div>
          <input
            type="range"
            min={20}
            max={80}
            step={5}
            value={layerThickness_um}
            onChange={(e) => setLayerThickness_um(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Hatch Spacing */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Hatch Spacing (h)</span>
            <span className="text-purple-400 font-bold">{hatchSpacing_um} μm</span>
          </div>
          <input
            type="range"
            min={50}
            max={180}
            step={5}
            value={hatchSpacing_um}
            onChange={(e) => setHatchSpacing_um(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* Laser Wavelength */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400">Laser Source</label>
          <select
            value={laserWavelength}
            onChange={(e) => setLaserWavelength(e.target.value as any)}
            className="w-full bg-[#050810] text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:border-sky-500 outline-none"
          >
            <option value="IR_1064nm">IR Fiber (1064 nm)</option>
            <option value="Green_515nm">Green (515 nm - Cu/Al)</option>
            <option value="Blue_450nm">Blue (450 nm)</option>
          </select>
        </div>
      </div>

      {/* 3D VIEWPORT & SLICING CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: 3D WebGL Canvas Viewport (8 Cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="p-3 rounded-2xl bg-[#090e18] border border-[#162032] space-y-3">
            {/* Viewport Slicing Mode Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-1 bg-[#050810] p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSlicingPlane("quarter-cutaway")}
                  className={`px-2.5 py-1 rounded-lg text-xs transition ${
                    slicingPlane === "quarter-cutaway"
                      ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Quarter Cutaway (3/4)
                </button>
                <button
                  type="button"
                  onClick={() => setSlicingPlane("longitudinal-xz")}
                  className={`px-2.5 py-1 rounded-lg text-xs transition ${
                    slicingPlane === "longitudinal-xz"
                      ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Longitudinal Plane (X-Z)
                </button>
                <button
                  type="button"
                  onClick={() => setSlicingPlane("transverse-yz")}
                  className={`px-2.5 py-1 rounded-lg text-xs transition ${
                    slicingPlane === "transverse-yz"
                      ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Transverse Plane (Y-Z)
                </button>
                <button
                  type="button"
                  onClick={() => setSlicingPlane("top-xy")}
                  className={`px-2.5 py-1 rounded-lg text-xs transition ${
                    slicingPlane === "top-xy"
                      ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Top Surface (X-Y)
                </button>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setShowMarangoniVectors(!showMarangoniVectors)}
                  className={`px-2 py-1 rounded-lg border transition ${
                    showMarangoniVectors ? "bg-amber-500/10 text-amber-300 border-amber-500/30" : "bg-slate-900 text-slate-500 border-slate-800"
                  }`}
                >
                  Marangoni Vortices
                </button>
                <button
                  type="button"
                  onClick={() => setShowLaserRays(!showLaserRays)}
                  className={`px-2 py-1 rounded-lg border transition ${
                    showLaserRays ? "bg-rose-500/10 text-rose-300 border-rose-500/30" : "bg-slate-900 text-slate-500 border-slate-800"
                  }`}
                >
                  Laser &amp; Ray Reflections
                </button>
                <button
                  type="button"
                  onClick={() => setWireframeMode(!wireframeMode)}
                  className={`px-2 py-1 rounded-lg border transition ${
                    wireframeMode ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" : "bg-slate-900 text-slate-500 border-slate-800"
                  }`}
                >
                  Mesh Wireframe
                </button>
                <button
                  type="button"
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`px-2 py-1 rounded-lg border transition ${
                    autoRotate ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" : "bg-slate-900 text-slate-500 border-slate-800"
                  }`}
                >
                  Auto Rotate
                </button>
              </div>
            </div>

            {/* 3D WebGL Canvas */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#060913]">
              <div
                ref={threeMountRef}
                className="w-full h-[440px] cursor-grab active:cursor-grabbing"
              />

              {/* Slicing Offset Slider Overlay */}
              {slicingPlane !== "quarter-cutaway" && (
                <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-[#090e18]/90 backdrop-blur-md border border-slate-700/70 flex items-center gap-3">
                  <Scissors className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-[11px] text-slate-300 shrink-0">Section Plane Shift:</span>
                  <input
                    type="range"
                    min={-120}
                    max={120}
                    step={2}
                    value={sliceCutOffset}
                    onChange={(e) => setSliceCutOffset(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                  <span className="text-[11px] text-sky-300 font-bold font-mono w-16 text-right">
                    {sliceCutOffset > 0 ? `+${sliceCutOffset}` : sliceCutOffset} μm
                  </span>
                </div>
              )}

              {/* Floating Legend */}
              <div className="absolute top-3 left-3 p-2.5 rounded-xl bg-[#090e18]/90 backdrop-blur-md border border-slate-700/60 text-[10px] space-y-1 pointer-events-none">
                <div className="font-bold text-slate-200">Thermal Phase Envelopes</div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-gradient-to-r from-rose-500 to-amber-500" />
                  <span className="text-slate-300">Liquid Melt Pool (T &ge; T_L)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                  <span className="text-slate-300">Mushy Solidification Front (T_S &le; T &lt; T_L)</span>
                </div>
                {regimeInfo.isKeyhole && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-rose-600 animate-pulse" />
                    <span className="text-rose-300 font-bold">Keyhole Vapor Depression (T &gt; T_boil)</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-purple-500" />
                  <span className="text-slate-300">Heat-Affected Zone (HAZ)</span>
                </div>
              </div>

              {/* Interactive Help */}
              <div className="absolute top-3 right-3 p-2 rounded-xl bg-[#090e18]/80 backdrop-blur-md border border-slate-800 text-[9px] text-slate-400 pointer-events-none">
                Drag with mouse to rotate 360° • Scroll wheel to zoom
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Physics Readouts & Solidification Diagnostics (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Melt Pool Physical Dimensions */}
          <div className="p-3.5 rounded-xl bg-[#090e18] border border-[#162032] space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold text-white">Melt Pool Dimensions</h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                Goldak 3D
              </span>
            </div>

            {pyResult && (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-3 gap-2 p-2 bg-[#050810] rounded-xl border border-slate-800">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block">Length (L)</span>
                    <strong className="text-sm text-sky-300">{pyResult.meltPoolGeometry.length_um} μm</strong>
                  </div>
                  <div className="text-center border-x border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Width (W)</span>
                    <strong className="text-sm text-emerald-300">{pyResult.meltPoolGeometry.width_um} μm</strong>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block">Depth (D)</span>
                    <strong className="text-sm text-amber-300">{pyResult.meltPoolGeometry.depth_um} μm</strong>
                  </div>
                </div>

                <div className="space-y-1 text-[11px] text-slate-300">
                  <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Depth-to-Width Ratio (D/W):</span>
                    <span className="font-bold text-white">{pyResult.meltPoolGeometry.depthToWidthRatio_D_over_W}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Aspect Ratio (L/W):</span>
                    <span className="font-bold text-white">{pyResult.meltPoolGeometry.aspectRatio_L_over_W}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Keyhole Cavity Depth:</span>
                    <span className="font-bold text-rose-400">{pyResult.meltPoolGeometry.keyholeVaporCavityDepth_um} μm</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Peak Temperature (T_peak):</span>
                    <span className="font-bold text-amber-300">{pyResult.hydrodynamicsAndRecoil.peakTemperature_C} °C</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Knudsen Recoil Pressure:</span>
                    <span className="font-bold text-rose-300">{pyResult.hydrodynamicsAndRecoil.knudsenRecoilPressure_kPa} kPa</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-400">Volumetric Energy Density (VED):</span>
                    <span className="font-bold text-sky-400">{pyResult.processParameters.volumetricEnergyDensity_J_mm3} J/mm³</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Solidification Kinetics & Microstructure */}
          <div className="p-3.5 rounded-xl bg-[#090e18] border border-[#162032] space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white">Solidification Kinetics &amp; Microstructure</h4>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Hunt CET
              </span>
            </div>

            {pyResult && (
              <div className="space-y-1.5 text-[11px] text-slate-300">
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Thermal Gradient (G):</span>
                  <span className="font-bold text-white">{pyResult.solidificationKinetics.thermalGradient_G_K_um} K/μm</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Solidification Rate (R):</span>
                  <span className="font-bold text-emerald-400">{pyResult.solidificationKinetics.solidificationRate_R_mm_s} mm/s</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Cooling Rate (dT/dt = G·R):</span>
                  <span className="font-bold text-cyan-400">{pyResult.solidificationKinetics.coolingRate_K_s.toExponential(2)} K/s</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Primary Dendrite Arm Spacing (PDAS):</span>
                  <span className="font-bold text-purple-300">{pyResult.solidificationKinetics.primaryDendriteArmSpacing_PDAS_um} μm</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Predicted Microstructure:</span>
                  <span className="font-bold text-emerald-300">{pyResult.solidificationKinetics.microstructureMorphology}</span>
                </div>
              </div>
            )}
          </div>

          {/* Multi-Defect Overlap Diagnostics */}
          <div className="p-3.5 rounded-xl bg-[#090e18] border border-[#162032] space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold text-white">Defect &amp; Porosity Criteria</h4>
              </div>
            </div>

            {pyResult && (
              <div className="space-y-1.5 text-[10px]">
                <div className="flex items-center justify-between p-1.5 bg-[#050810] rounded-lg border border-slate-800">
                  <span className="text-slate-300">Lack of Fusion (LoF):</span>
                  <span className={`font-bold ${pyResult.defectDiagnostics.lackOfFusionStatus === "Pass" ? "text-emerald-400" : "text-rose-400"}`}>
                    {pyResult.defectDiagnostics.lackOfFusionRisk}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-[#050810] rounded-lg border border-slate-800">
                  <span className="text-slate-300">Keyhole Porosity:</span>
                  <span className={`font-bold ${regimeInfo.isKeyhole ? "text-rose-400" : "text-emerald-400"}`}>
                    {pyResult.defectDiagnostics.keyholePorosityRisk}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-[#050810] rounded-lg border border-slate-800">
                  <span className="text-slate-300">Balling Instability:</span>
                  <span className="font-bold text-slate-200">{pyResult.defectDiagnostics.ballingInstabilityRisk}</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-[#050810] rounded-lg border border-slate-800">
                  <span className="text-slate-300">Effective Residual Stress:</span>
                  <span className="font-bold text-amber-300">{pyResult.defectDiagnostics.effectiveResidualStress_MPa} MPa</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
