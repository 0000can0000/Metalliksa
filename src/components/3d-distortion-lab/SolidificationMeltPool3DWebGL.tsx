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
  Play,
  Pause,
  ChevronRight,
  TrendingUp,
  GitFork,
  Radio,
  Share2,
} from "lucide-react";
import { AlloySolidificationData } from "./SolidificationFrontCETLab";

export interface SolidificationMeltPool3DProps {
  alloy: AlloySolidificationData;
  laserPower_W: number;
  scanSpeed_mms: number;
  beamDiameter_um: number;
  bedPreheat_C: number;
  layerThickness_um: number;
  hatchSpacing_um: number;
  effectiveN0_m3: number;
  onProbeChange?: (theta_deg: number, G: number, R: number, coolingRate: number) => void;
}

export type WebGL3DViewMode =
  | "cooling-rate-gxr"
  | "thermal-gradient-g"
  | "solidification-rate-r"
  | "cet-morphology"
  | "porosity-defects"
  | "temperature-field";

export type ClippingSliceMode = "none" | "quarter-cut" | "longitudinal-xz" | "transverse-yz" | "top-xy";

export interface SimulatedPore {
  id: number;
  x_um: number;
  y_um: number;
  z_um: number;
  radius_um: number;
  type: "keyhole" | "lack_of_fusion" | "gas_entrapment";
  mechanism: string;
  formationRisk: number; // 0 to 1
}

export const SolidificationMeltPool3DWebGL: React.FC<SolidificationMeltPool3DProps> = ({
  alloy,
  laserPower_W,
  scanSpeed_mms,
  beamDiameter_um,
  bedPreheat_C,
  layerThickness_um,
  hatchSpacing_um,
  effectiveN0_m3,
  onProbeChange,
}) => {
  // 3D Canvas Mount
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const animationReqRef = useRef<number | null>(null);

  // UI & Visualization State
  const [active3DMode, setActive3DMode] = useState<WebGL3DViewMode>("cooling-rate-gxr");
  const [clippingMode, setClippingMode] = useState<ClippingSliceMode>("quarter-cut");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [animSpeed, setAnimSpeed] = useState<number>(1.0);
  const [scanProgress, setScanProgress] = useState<number>(0.5); // 0 to 1
  const [showPores, setShowPores] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showWireframe, setShowWireframe] = useState<boolean>(false);
  const [showPowderBed, setShowPowderBed] = useState<boolean>(true);
  const [selectedPore, setSelectedPore] = useState<SimulatedPore | null>(null);
  const [sliceOffset_um, setSliceOffset_um] = useState<number>(0);

  // Camera preset view triggers
  const [cameraViewPreset, setCameraViewPreset] = useState<"iso" | "top" | "side" | "front">("iso");

  // Interactive Orbit State (Mouse dragging)
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rotationEulerRef = useRef<{ x: number; y: number }>({ x: 0.5, y: -0.6 });
  const zoomLevelRef = useRef<number>(280);

  // ---------------------------------------------------------------------------
  // 1. PHYSICAL MELT POOL & POROSITY SIMULATION KERNEL
  // ---------------------------------------------------------------------------
  const physicsData = useMemo(() => {
    const P = laserPower_W;
    const v = scanSpeed_mms * 1e-3; // m/s
    const r0 = (beamDiameter_um / 2) * 1e-6; // m
    const rho = alloy.density_kg_m3;
    const cp = alloy.specificHeat_J_kgK;
    const k = alloy.thermalConductivity_W_mK;
    const alpha = k / (rho * cp);
    const T0 = bedPreheat_C;
    const Tliq = alloy.liquidusTemp_C;
    const Tsol = alloy.solidusTemp_C;
    const eta = alloy.absorptivity;

    // Normalized Enthalpy H* = (eta * P) / (rho * cp * (Tliq - T0) * sqrt(pi * alpha * v * r0^3))
    const denom = rho * cp * (Tliq - T0) * Math.sqrt(Math.PI * alpha * v * Math.pow(r0, 3));
    const normalizedEnthalpy = (eta * P) / Math.max(1e-9, denom);

    // Dynamic Melt Pool Dimensions (um)
    const effectivePower = normalizedEnthalpy > 6.0 ? (1.0 - Math.pow(1.0 - eta, 2.2)) * P : eta * P;
    const width_m = Math.sqrt(
      Math.max(1e-12, (8.0 / (Math.PI * Math.E)) * (effectivePower / (rho * cp * Math.max(50.0, Tliq - T0) * v))) +
        Math.pow(beamDiameter_um * 1e-6, 2)
    );
    const width_um = width_m * 1e6;

    let depth_um: number;
    let regime: "Conduction" | "Transition" | "Keyhole";
    let keyholeDepth_um = 0;

    if (normalizedEnthalpy < 5.5) {
      depth_um = width_um * 0.44;
      regime = "Conduction";
    } else if (normalizedEnthalpy > 10.5) {
      depth_um = width_um * (0.85 + 0.09 * (normalizedEnthalpy - 10.5));
      keyholeDepth_um = depth_um * 0.48;
      regime = "Keyhole";
    } else {
      depth_um = width_um * (0.44 + 0.08 * (normalizedEnthalpy - 5.5));
      regime = "Transition";
    }

    const length_um = width_um * (1.6 + 0.45 * Math.min(5.0, (v * width_m) / (2.0 * alpha)));
    const semiFront_um = width_um * 0.45;
    const semiRear_um = length_um - semiFront_um;

    // Peak Centerline Temperature
    const peakTemp_C = T0 + (eta * P) / (Math.PI * Math.SQRT2 * k * r0 * (1 + (v * r0) / (2 * alpha)));

    // CET Model thresholds
    const hunt_n = alloy.huntExponent_n;
    const aCET = alloy.huntConstant_aCET;
    const K_col = aCET * Math.pow(effectiveN0_m3 / 1e11, hunt_n / 3.0);
    const K_eq = K_col * 0.08;

    // -------------------------------------------------------------------------
    // 2. 3D SPATIAL POROSITY GENERATION ENGINE
    // -------------------------------------------------------------------------
    const pores: SimulatedPore[] = [];
    let poreIdCounter = 1;

    // A) Keyhole Collapse Pores (Vapor cavity instability at root)
    if (regime === "Keyhole" || normalizedEnthalpy > 9.5) {
      const keyholeRisk = Math.min(1.0, (normalizedEnthalpy - 9.0) / 7.0);
      const numKeyholePores = Math.max(1, Math.round(keyholeRisk * 12));
      for (let i = 0; i < numKeyholePores; i++) {
        const xOffset = -semiRear_um * (0.15 + (i / numKeyholePores) * 0.7);
        const yOffset = (Math.random() - 0.5) * (width_um * 0.15);
        const zDepth = -(depth_um * (0.75 + Math.random() * 0.22));
        const poreRadius = 4.0 + Math.random() * 12.0 * keyholeRisk;
        pores.push({
          id: poreIdCounter++,
          x_um: xOffset,
          y_um: yOffset,
          z_um: zDepth,
          radius_um: poreRadius,
          type: "keyhole",
          mechanism: "Vapor depression tip collapse & gas plume trapping at melt pool root",
          formationRisk: keyholeRisk,
        });
      }
    }

    // B) Lack-of-Fusion (LOF) Pores (Insufficient overlap or under-penetration)
    const hatchOverlapRatio = width_um / Math.max(1, hatchSpacing_um);
    const depthPenetrationRatio = depth_um / Math.max(1, layerThickness_um);
    const lofRisk = Math.max(
      0,
      Math.max(1.15 - hatchOverlapRatio, 1.25 - depthPenetrationRatio) * 1.8
    );

    if (lofRisk > 0.05) {
      const numLofPores = Math.max(1, Math.round(lofRisk * 15));
      for (let i = 0; i < numLofPores; i++) {
        // Inter-track cusps located at +/- hatch / 2 and at substrate layer interface
        const isLeftTrack = Math.random() > 0.5;
        const yBase = isLeftTrack ? -hatchSpacing_um * 0.5 : hatchSpacing_um * 0.5;
        const xOffset = -semiRear_um * (0.3 + Math.random() * 0.6);
        const yOffset = yBase + (Math.random() - 0.5) * 12;
        const zDepth = -(layerThickness_um * (0.85 + Math.random() * 0.3));
        const poreRadius = 8.0 + Math.random() * 20.0 * lofRisk;
        pores.push({
          id: poreIdCounter++,
          x_um: xOffset,
          y_um: yOffset,
          z_um: zDepth,
          radius_um: poreRadius,
          type: "lack_of_fusion",
          mechanism: "Incomplete inter-hatch overlap / unmelted powder cusp void",
          formationRisk: lofRisk,
        });
      }
    }

    // C) Gas Entrapment / Spherical Marangoni Pores
    const gasRisk = 0.12 + (v > 1.4 ? 0.25 : 0.05);
    const numGasPores = 4;
    for (let i = 0; i < numGasPores; i++) {
      const xOffset = -semiRear_um * (0.2 + Math.random() * 0.7);
      const yOffset = (Math.random() - 0.5) * (width_um * 0.6);
      const zDepth = -(depth_um * (0.2 + Math.random() * 0.5));
      const poreRadius = 2.5 + Math.random() * 5.0;
      pores.push({
        id: poreIdCounter++,
        x_um: xOffset,
        y_um: yOffset,
        z_um: zDepth,
        radius_um: poreRadius,
        type: "gas_entrapment",
        mechanism: "Argon shield gas entrapment during rapid Marangoni convective eddies",
        formationRisk: gasRisk,
      });
    }

    // Density estimate (%)
    const totalPoreVolume_um3 = pores.reduce((sum, p) => sum + (4 / 3) * Math.PI * Math.pow(p.radius_um, 3), 0);
    const trackVolume_um3 = width_um * depth_um * length_um * 0.5;
    const porosityFraction = Math.min(0.08, totalPoreVolume_um3 / Math.max(1, trackVolume_um3));
    const relativeDensity_pct = (1.0 - porosityFraction) * 100;

    return {
      P,
      v,
      r0,
      alpha,
      T0,
      Tliq,
      Tsol,
      width_um,
      depth_um,
      length_um,
      semiFront_um,
      semiRear_um,
      keyholeDepth_um,
      peakTemp_C,
      regime,
      normalizedEnthalpy,
      K_col,
      K_eq,
      pores,
      relativeDensity_pct,
      hatchOverlapRatio,
      depthPenetrationRatio,
    };
  }, [
    alloy,
    laserPower_W,
    scanSpeed_mms,
    beamDiameter_um,
    bedPreheat_C,
    layerThickness_um,
    hatchSpacing_um,
    effectiveN0_m3,
  ]);

  // ---------------------------------------------------------------------------
  // 3. COLOR PALETTE GENERATION ACCORDING TO VIEW MODE
  // ---------------------------------------------------------------------------
  const getColorForPoint = useCallback(
    (
      x_um: number,
      y_um: number,
      z_um: number,
      theta: number,
      mode: WebGL3DViewMode
    ): THREE.Color => {
      const {
        v,
        alpha,
        Tliq,
        Tsol,
        T0,
        peakTemp_C,
        semiFront_um,
        semiRear_um,
        width_um,
        depth_um,
        K_col,
        K_eq,
      } = physicsData;

      // Distance from laser heat center
      const dist_um = Math.sqrt(x_um * x_um + y_um * y_um + z_um * z_um);
      const dist_m = Math.max(1e-7, dist_um * 1e-6);

      // Local front velocity R = v * cos(theta)
      const R_growth = Math.max(1e-4, v * Math.cos(theta));

      // Local Thermal Gradient G (K/m)
      const G_mag = ((Tliq - T0) / dist_m) * (1.0 + (v * dist_m) / (2 * alpha));

      // Cooling rate (K/s)
      const coolingRate = G_mag * R_growth;

      // Hunt CET Morphology
      const huntVal = Math.pow(G_mag, alloy.huntExponent_n) / R_growth;

      if (mode === "cooling-rate-gxr") {
        // Logarithmic colormap from 1e4 K/s (dark blue) to 5e6 K/s (bright yellow/white)
        const logVal = Math.log10(Math.max(1e3, coolingRate));
        const norm = Math.min(1, Math.max(0, (logVal - 4.0) / 2.8)); // 0 = 10^4, 1 = 10^6.8
        const col = new THREE.Color();
        if (norm < 0.25) {
          col.setRGB(0.1, 0.2 + norm * 2.5, 0.9);
        } else if (norm < 0.5) {
          col.setRGB(0.1, 0.8, 0.8 - (norm - 0.25) * 3);
        } else if (norm < 0.75) {
          col.setRGB(0.2 + (norm - 0.5) * 3.2, 0.9, 0.1);
        } else {
          col.setRGB(1.0, 0.9 - (norm - 0.75) * 1.5, (norm - 0.75) * 3.5);
        }
        return col;
      }

      if (mode === "thermal-gradient-g") {
        // Gradient G from 1e5 to 1e7 K/m (Cyan to Magenta)
        const logG = Math.log10(Math.max(1e4, G_mag));
        const normG = Math.min(1, Math.max(0, (logG - 5.0) / 2.2));
        const col = new THREE.Color();
        col.setHSL(0.55 - normG * 0.55, 1.0, 0.5);
        return col;
      }

      if (mode === "solidification-rate-r") {
        // R from 0 (Base = deep violet) to v (Tail = bright emerald)
        const normR = Math.min(1, Math.max(0, R_growth / Math.max(1e-4, v)));
        const col = new THREE.Color();
        col.setHSL(0.75 - normR * 0.45, 0.9, 0.5);
        return col;
      }

      if (mode === "cet-morphology") {
        // Columnar (Rose), Mixed (Blue), Equiaxed (Green)
        if (huntVal >= K_col) {
          return new THREE.Color(0xf43f5e); // Columnar red-rose
        } else if (huntVal <= K_eq) {
          return new THREE.Color(0x10b981); // Equiaxed green
        } else {
          return new THREE.Color(0x3b82f6); // Mixed blue
        }
      }

      if (mode === "temperature-field") {
        // Local temperature interpolation
        const normDist = Math.min(1, dist_um / (width_um * 1.2));
        const localTemp = Tliq + (peakTemp_C - Tliq) * (1 - normDist);
        const normT = Math.min(1, Math.max(0, (localTemp - T0) / (peakTemp_C - T0)));
        const col = new THREE.Color();
        if (normT > 0.8) col.setRGB(1.0, 1.0, 0.8);
        else if (normT > 0.5) col.setRGB(1.0, 0.6, 0.1);
        else if (normT > 0.25) col.setRGB(0.9, 0.1, 0.1);
        else col.setRGB(0.3, 0.1, 0.4);
        return col;
      }

      // Default
      return new THREE.Color(0x38bdf8);
    },
    [physicsData, alloy]
  );

  // ---------------------------------------------------------------------------
  // 4. THREE.JS SCENE INITIALIZATION & MESH GENERATION
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 700;
    const height = container.clientHeight || 480;

    // Scene & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 4000);
    camera.position.set(240, 180, 240);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Root Group for Mouse Controls
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    rootGroupRef.current = rootGroup;

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffeedd, 1.3);
    dirLight1.position.set(200, 300, 150);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(-200, -100, -150);
    scene.add(dirLight2);

    // Setup Clipping Planes
    const clippingPlanes: THREE.Plane[] = [];
    if (clippingMode === "quarter-cut") {
      // Cut out +Y and +X quadrant to expose melt pool interior
      clippingPlanes.push(new THREE.Plane(new THREE.Vector3(0, 0, -1), sliceOffset_um));
    } else if (clippingMode === "longitudinal-xz") {
      clippingPlanes.push(new THREE.Plane(new THREE.Vector3(0, 0, 1), -sliceOffset_um));
    } else if (clippingMode === "transverse-yz") {
      clippingPlanes.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), -sliceOffset_um));
    } else if (clippingMode === "top-xy") {
      clippingPlanes.push(new THREE.Plane(new THREE.Vector3(0, -1, 0), sliceOffset_um));
    }

    // -------------------------------------------------------------------------
    // A) Build Substrate & Powder Bed Grid
    // -------------------------------------------------------------------------
    const substrateSize = 350;
    const substrateGeom = new THREE.BoxGeometry(substrateSize, 25, substrateSize);
    const substrateMat = new THREE.MeshStandardMaterial({
      color: 0x161e2e,
      roughness: 0.8,
      metalness: 0.6,
      clippingPlanes,
      clipShadows: true,
    });
    const substrateMesh = new THREE.Mesh(substrateGeom, substrateMat);
    substrateMesh.position.set(0, -12.5 - layerThickness_um, 0);
    rootGroup.add(substrateMesh);

    // Substrate Top Grid Helper
    const gridHelper = new THREE.GridHelper(substrateSize, 18, 0x0284c7, 0x1e293b);
    gridHelper.position.set(0, -layerThickness_um, 0);
    rootGroup.add(gridHelper);

    // Powder Bed Top Layer
    if (showPowderBed) {
      const powderGeom = new THREE.BoxGeometry(substrateSize * 0.95, layerThickness_um, substrateSize * 0.95);
      const powderMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.95,
        metalness: 0.1,
        transparent: true,
        opacity: 0.45,
        clippingPlanes,
      });
      const powderMesh = new THREE.Mesh(powderGeom, powderMat);
      powderMesh.position.set(0, -layerThickness_um * 0.5, 0);
      rootGroup.add(powderMesh);
    }

    // Coordinate Axes (X: Red/Scan, Y: Green/Hatch, Z: Blue/Build)
    const axesGroup = new THREE.Group();
    const axisLen = 60;
    const makeAxisArrow = (dir: THREE.Vector3, color: number, label: string) => {
      const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(-140, 2, -140), axisLen, color, 8, 4);
      axesGroup.add(arrow);
    };
    makeAxisArrow(new THREE.Vector3(1, 0, 0), 0xf43f5e, "Scan X");
    makeAxisArrow(new THREE.Vector3(0, 0, 1), 0x10b981, "Hatch Y");
    makeAxisArrow(new THREE.Vector3(0, 1, 0), 0x38bdf8, "Build Z");
    rootGroup.add(axesGroup);

    // -------------------------------------------------------------------------
    // B) Parametric 3D Melt Pool Mesh Construction
    // -------------------------------------------------------------------------
    const { semiFront_um, semiRear_um, width_um, depth_um, keyholeDepth_um, regime } = physicsData;
    const b_um = width_um * 0.5;

    // Discretize 3D Melt Pool Hull (Semi-ellipsoid front + teardrop rear)
    const uSegments = 40; // Around perimeter (theta)
    const vSegments = 24; // From surface to pool bottom (phi)

    const meltVertices: number[] = [];
    const meltColors: number[] = [];
    const meltIndices: number[] = [];

    // Construct vertices
    for (let j = 0; j <= vSegments; j++) {
      const vNorm = j / vSegments; // 0 (surface) to 1 (bottom tip)
      const phi = (vNorm * Math.PI) / 2; // 0 to pi/2
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      // Depth contour
      let z_depth = -depth_um * sinPhi;
      if (regime === "Keyhole" && vNorm > 0.6) {
        // Deepen keyhole root
        z_depth -= keyholeDepth_um * Math.pow((vNorm - 0.6) / 0.4, 2);
      }

      for (let i = 0; i <= uSegments; i++) {
        const uNorm = i / uSegments; // 0 to 1
        const theta = uNorm * 2 * Math.PI; // 0 to 2pi
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        let x_pos = 0;
        let y_pos = 0;

        if (cosTheta >= 0) {
          // Front hemisphere cap
          x_pos = semiFront_um * cosTheta * cosPhi;
          y_pos = b_um * sinTheta * cosPhi;
        } else {
          // Rear elongated teardrop tail
          const tailDecay = Math.pow(Math.max(0, 1 - Math.abs(cosTheta) * cosPhi), 0.35);
          x_pos = -semiRear_um * Math.abs(cosTheta) * cosPhi;
          y_pos = b_um * sinTheta * cosPhi * (0.35 + 0.65 * tailDecay);
        }

        meltVertices.push(x_pos, z_depth, y_pos);

        // Compute Vertex Color based on Active Mode
        const vertColor = getColorForPoint(x_pos, y_pos, z_depth, theta, active3DMode);
        meltColors.push(vertColor.r, vertColor.g, vertColor.b);
      }
    }

    // Build faces
    for (let j = 0; j < vSegments; j++) {
      for (let i = 0; i < uSegments; i++) {
        const p1 = j * (uSegments + 1) + i;
        const p2 = p1 + 1;
        const p3 = (j + 1) * (uSegments + 1) + i;
        const p4 = p3 + 1;

        meltIndices.push(p1, p3, p2);
        meltIndices.push(p2, p3, p4);
      }
    }

    const meltGeom = new THREE.BufferGeometry();
    meltGeom.setAttribute("position", new THREE.Float32BufferAttribute(meltVertices, 3));
    meltGeom.setAttribute("color", new THREE.Float32BufferAttribute(meltColors, 3));
    meltGeom.setIndex(meltIndices);
    meltGeom.computeVertexNormals();

    const meltMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.35,
      metalness: 0.45,
      side: THREE.DoubleSide,
      wireframe: showWireframe,
      clippingPlanes,
      clipShadows: true,
    });

    const meltPoolMesh = new THREE.Mesh(meltGeom, meltMat);
    rootGroup.add(meltPoolMesh);

    // -------------------------------------------------------------------------
    // C) Solidified Deposition Track (Behind the moving melt pool)
    // -------------------------------------------------------------------------
    const trackLen = 140;
    const trackGeom = new THREE.CylinderGeometry(b_um, b_um, trackLen, 24, 1, false, 0, Math.PI);
    trackGeom.rotateZ(Math.PI / 2);
    trackGeom.rotateY(Math.PI / 2);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.6,
      metalness: 0.5,
      clippingPlanes,
    });
    const trackMesh = new THREE.Mesh(trackGeom, trackMat);
    trackMesh.position.set(-semiRear_um - trackLen / 2, 0, 0);
    rootGroup.add(trackMesh);

    // -------------------------------------------------------------------------
    // D) Laser Beam Cone & Illumination Spot
    // -------------------------------------------------------------------------
    const beamHeight = 90;
    const beamGeom = new THREE.ConeGeometry(beamDiameter_um * 0.5, beamHeight, 24, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const beamMesh = new THREE.Mesh(beamGeom, beamMat);
    beamMesh.position.set(0, beamHeight / 2, 0);
    rootGroup.add(beamMesh);

    // Laser Center Bright Ray
    const laserRayGeom = new THREE.CylinderGeometry(1.2, 1.2, beamHeight, 12);
    const laserRayMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const laserRayMesh = new THREE.Mesh(laserRayGeom, laserRayMat);
    laserRayMesh.position.set(0, beamHeight / 2, 0);
    rootGroup.add(laserRayMesh);

    // Hotspot Glowing Disc on Top Surface
    const spotGeom = new THREE.CircleGeometry(beamDiameter_um * 0.6, 24);
    spotGeom.rotateX(-Math.PI / 2);
    const spotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
    });
    const spotMesh = new THREE.Mesh(spotGeom, spotMat);
    spotMesh.position.set(0, 0.5, 0);
    rootGroup.add(spotMesh);

    // -------------------------------------------------------------------------
    // E) Solidification Front Vector Glyphs (G and R arrows)
    // -------------------------------------------------------------------------
    if (showVectors) {
      const vectorGroup = new THREE.Group();
      const numSamplePoints = 8;
      for (let s = 1; s <= numSamplePoints; s++) {
        const thetaNorm = (s / (numSamplePoints + 1)) * (Math.PI / 2); // 0 to pi/2
        const sampleX = -semiRear_um * Math.cos(thetaNorm) * 0.85;
        const sampleZ = -depth_um * Math.sin(thetaNorm) * 0.85;
        const sampleY = b_um * Math.sin(thetaNorm) * 0.4;

        // Growth Velocity R vector (pointing inward normal to front)
        const dirR = new THREE.Vector3(-Math.cos(thetaNorm), Math.sin(thetaNorm), 0).normalize();
        const arrowR = new THREE.ArrowHelper(dirR, new THREE.Vector3(sampleX, sampleZ, sampleY), 22, 0x10b981, 6, 3);
        vectorGroup.add(arrowR);

        // Thermal Gradient G vector (pointing toward laser heat source)
        const dirG = new THREE.Vector3(-sampleX, -sampleZ, -sampleY).normalize();
        const arrowG = new THREE.ArrowHelper(dirG, new THREE.Vector3(sampleX, sampleZ, sampleY), 26, 0xf43f5e, 6, 3);
        vectorGroup.add(arrowG);
      }
      rootGroup.add(vectorGroup);
    }

    // -------------------------------------------------------------------------
    // F) 3D Spatial Porosity Defect Spheres Overlay
    // -------------------------------------------------------------------------
    if (showPores && physicsData.pores.length > 0) {
      const poreGroup = new THREE.Group();
      physicsData.pores.forEach((pore) => {
        const sphereGeom = new THREE.SphereGeometry(Math.max(2.5, pore.radius_um), 14, 14);
        let poreColor = 0xf43f5e; // Keyhole red
        if (pore.type === "lack_of_fusion") poreColor = 0xf59e0b; // LOF amber
        if (pore.type === "gas_entrapment") poreColor = 0x06b6d4; // Gas cyan

        const sphereMat = new THREE.MeshStandardMaterial({
          color: poreColor,
          emissive: poreColor,
          emissiveIntensity: 0.45,
          roughness: 0.2,
          metalness: 0.8,
          clippingPlanes,
        });

        const poreMesh = new THREE.Mesh(sphereGeom, sphereMat);
        poreMesh.position.set(pore.x_um, pore.z_um, pore.y_um);
        poreGroup.add(poreMesh);
      });
      rootGroup.add(poreGroup);
    }

    // -------------------------------------------------------------------------
    // G) Camera & Animation Loop
    // -------------------------------------------------------------------------
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth || 700;
      const h = container.clientHeight || 480;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Render loop
    let lastTime = performance.now();
    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      if (isPlaying && rootGroupRef.current) {
        // Continuous smooth laser translation effect
        setScanProgress((prev) => {
          const next = prev + delta * 0.3 * animSpeed;
          return next > 1.0 ? 0.0 : next;
        });
      }

      // Apply Interactive Mouse Rotation
      if (rootGroupRef.current) {
        rootGroupRef.current.rotation.x = rotationEulerRef.current.x;
        rootGroupRef.current.rotation.y = rotationEulerRef.current.y;
      }

      if (cameraRef.current) {
        cameraRef.current.position.setLength(zoomLevelRef.current);
        cameraRef.current.lookAt(0, -15, 0);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animationReqRef.current = requestAnimationFrame(animate);
    };

    animationReqRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationReqRef.current) cancelAnimationFrame(animationReqRef.current);
      renderer.dispose();
      container.innerHTML = "";
    };
  }, [
    physicsData,
    active3DMode,
    clippingMode,
    sliceOffset_um,
    showPores,
    showVectors,
    showWireframe,
    showPowderBed,
    layerThickness_um,
    beamDiameter_um,
    getColorForPoint,
    isPlaying,
    animSpeed,
  ]);

  // ---------------------------------------------------------------------------
  // 5. MOUSE INTERACTION (DRAGGING, ZOOM, RESET)
  // ---------------------------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    rotationEulerRef.current.y += deltaX * 0.008;
    rotationEulerRef.current.x += deltaY * 0.008;

    // Constrain pitch
    rotationEulerRef.current.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, rotationEulerRef.current.x));

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    zoomLevelRef.current += e.deltaY * 0.2;
    zoomLevelRef.current = Math.max(80, Math.min(650, zoomLevelRef.current));
  };

  const applyCameraPreset = (preset: "iso" | "top" | "side" | "front") => {
    setCameraViewPreset(preset);
    if (preset === "iso") {
      rotationEulerRef.current = { x: 0.5, y: -0.6 };
      zoomLevelRef.current = 280;
    } else if (preset === "top") {
      rotationEulerRef.current = { x: Math.PI / 2 - 0.05, y: 0 };
      zoomLevelRef.current = 260;
    } else if (preset === "side") {
      rotationEulerRef.current = { x: 0, y: -Math.PI / 2 };
      zoomLevelRef.current = 260;
    } else if (preset === "front") {
      rotationEulerRef.current = { x: 0, y: 0 };
      zoomLevelRef.current = 260;
    }
  };

  return (
    <div className="bg-[#090e18] border border-[#1e2d46] rounded-2xl p-4 shadow-2xl space-y-4">
      {/* HEADER: TITLE, BADGES, PROCESS MODE */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>3D WebGL Melt Pool &amp; Solidification Front Evolution</span>
              </h3>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                WebGL 2.0 Real-Time
              </span>
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                  physicsData.regime === "Keyhole"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : physicsData.regime === "Transition"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}
              >
                {physicsData.regime} Regime (H*={physicsData.normalizedEnthalpy.toFixed(1)})
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive 3D isothermal mesh displaying local cooling rate G×R, thermal gradient vectors, and embedded
              porosity defects.
            </p>
          </div>
        </div>

        {/* Action Controls (Reset View, Camera Presets) */}
        <div className="flex items-center gap-1.5">
          {(["iso", "top", "side", "front"] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => applyCameraPreset(preset)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition ${
                cameraViewPreset === preset
                  ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/50"
                  : "bg-[#050810] text-slate-400 border border-slate-800 hover:text-slate-200"
              }`}
            >
              {preset.toUpperCase()}
            </button>
          ))}
          <button
            type="button"
            onClick={() => applyCameraPreset("iso")}
            className="p-1.5 rounded-lg bg-[#050810] border border-slate-800 text-slate-400 hover:text-cyan-400"
            title="Reset Camera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* TOP CONTROL STRIP: DISPLAY FIELD MODES & CLIPPING SLICES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#050810] p-3 rounded-xl border border-slate-800/80">
        {/* Field Color Modes */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <Eye className="w-3 h-3 text-cyan-400" />
            <span>3D Field Scalar Overlay:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "cooling-rate-gxr", label: "Cooling Rate (G × R)", color: "text-yellow-300" },
              { id: "thermal-gradient-g", label: "Gradient (G)", color: "text-rose-300" },
              { id: "solidification-rate-r", label: "Velocity (R)", color: "text-emerald-300" },
              { id: "cet-morphology", label: "Hunt CET Grain", color: "text-purple-300" },
              { id: "porosity-defects", label: "Porosity Defects", color: "text-rose-400" },
              { id: "temperature-field", label: "Temperature (T)", color: "text-amber-300" },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setActive3DMode(mode.id as WebGL3DViewMode)}
                className={`py-1 px-2 rounded-lg text-[10px] font-mono font-bold transition ${
                  active3DMode === mode.id
                    ? "bg-cyan-500/20 text-white border border-cyan-400/50 shadow-sm"
                    : "bg-[#090e18] text-slate-400 border border-slate-800 hover:text-slate-200"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Slicing / Clipping Mode */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Scissors className="w-3 h-3 text-pink-400" />
              <span>Slicing / Cutaway Plane:</span>
            </span>
            {clippingMode !== "none" && (
              <span className="text-[9px] text-pink-300 font-mono">Offset: {sliceOffset_um} µm</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "none", label: "Full 3D" },
              { id: "quarter-cut", label: "Quarter Cut" },
              { id: "longitudinal-xz", label: "Longitudinal (X-Z)" },
              { id: "transverse-yz", label: "Transverse (Y-Z)" },
              { id: "top-xy", label: "Top Surface (X-Y)" },
            ].map((clip) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => setClippingMode(clip.id as ClippingSliceMode)}
                className={`py-1 px-2 rounded-lg text-[10px] font-mono font-bold transition ${
                  clippingMode === clip.id
                    ? "bg-pink-500/20 text-pink-200 border border-pink-400/50"
                    : "bg-[#090e18] text-slate-400 border border-slate-800 hover:text-slate-200"
                }`}
              >
                {clip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3D WEBGL INTERACTIVE CANVAS */}
      <div className="relative w-full h-[460px] rounded-xl overflow-hidden border border-slate-800 bg-[#060913]">
        <div
          ref={mountRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        />

        {/* OVERLAY HUD: REAL-TIME METRICS & SOLIDIFICATION ANISOTROPY */}
        <div className="absolute top-3 left-3 bg-[#050810]/85 backdrop-blur-md border border-slate-800 p-3 rounded-xl text-[11px] font-mono space-y-1.5 shadow-xl max-w-xs pointer-events-none">
          <div className="text-xs font-bold text-white flex items-center justify-between border-b border-slate-800 pb-1">
            <span className="text-cyan-300">{alloy.name}</span>
            <span className="text-slate-400">P={laserPower_W}W | v={scanSpeed_mms}mm/s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Melt Dimensions:</span>
            <span className="text-amber-300 font-bold">
              W={Math.round(physicsData.width_um)} µm | D={Math.round(physicsData.depth_um)} µm | L=
              {Math.round(physicsData.length_um)} µm
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Peak Pool Temp:</span>
            <span className="text-rose-400 font-bold">{Math.round(physicsData.peakTemp_C)} °C</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Relative Density:</span>
            <span
              className={`font-bold ${
                physicsData.relativeDensity_pct > 99.5
                  ? "text-emerald-400"
                  : physicsData.relativeDensity_pct > 98.0
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {physicsData.relativeDensity_pct.toFixed(2)} % (
              {physicsData.relativeDensity_pct > 99.5 ? "Dense" : "Porous"})
            </span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-800">
            <span className="text-slate-400">Porosity Defects:</span>
            <span className="text-pink-300 font-bold">{physicsData.pores.length} Detected Pores</span>
          </div>
        </div>

        {/* OVERLAY HUD: COLORBAR LEGEND */}
        <div className="absolute top-3 right-3 bg-[#050810]/85 backdrop-blur-md border border-slate-800 p-2.5 rounded-xl text-[10px] font-mono space-y-1.5 shadow-xl pointer-events-none">
          <div className="font-bold text-white">
            {active3DMode === "cooling-rate-gxr"
              ? "Cooling Rate G×R (K/s)"
              : active3DMode === "thermal-gradient-g"
              ? "Gradient G (K/m)"
              : active3DMode === "solidification-rate-r"
              ? "Velocity R (m/s)"
              : active3DMode === "cet-morphology"
              ? "Hunt CET Phase"
              : "Defect Class"}
          </div>
          {active3DMode === "cet-morphology" ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
                <span className="text-slate-300">Columnar Epitaxial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                <span className="text-slate-300">Mixed CET Transition</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span className="text-slate-300">Equiaxed Refined</span>
              </div>
            </div>
          ) : active3DMode === "porosity-defects" ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]" />
                <span className="text-slate-300">Keyhole Collapse Pores</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                <span className="text-slate-300">Lack-of-Fusion Voids</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" />
                <span className="text-slate-300">Gas Entrapment Bubbles</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="w-28 h-2.5 rounded bg-gradient-to-r from-blue-600 via-emerald-500 via-amber-400 to-rose-500" />
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>Low</span>
                <span>Median</span>
                <span>Peak</span>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM FLOATING CONTROLS: ANIMATION PLAYBACK & TOGGLES */}
        <div className="absolute bottom-3 left-3 right-3 bg-[#050810]/90 backdrop-blur-md border border-slate-800/90 px-4 py-2.5 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30"
              title={isPlaying ? "Pause Laser" : "Play Laser"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span>Speed:</span>
              {[0.5, 1.0, 2.0].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setAnimSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded text-[9px] ${
                    animSpeed === spd
                      ? "bg-cyan-500/30 text-cyan-200 font-bold border border-cyan-400/40"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-[10px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showPores}
                onChange={(e) => setShowPores(e.target.checked)}
                className="accent-pink-500"
              />
              <span>3D Pores</span>
            </label>
            <label className="flex items-center gap-1 text-[10px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showVectors}
                onChange={(e) => setShowVectors(e.target.checked)}
                className="accent-emerald-500"
              />
              <span>G &amp; R Vectors</span>
            </label>
            <label className="flex items-center gap-1 text-[10px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showWireframe}
                onChange={(e) => setShowWireframe(e.target.checked)}
                className="accent-cyan-500"
              />
              <span>Wireframe</span>
            </label>
            <label className="flex items-center gap-1 text-[10px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showPowderBed}
                onChange={(e) => setShowPowderBed(e.target.checked)}
                className="accent-purple-500"
              />
              <span>Powder Bed</span>
            </label>
          </div>
        </div>
      </div>

      {/* DEFECT & POROSITY SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-[#050810] border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Keyhole Porosity</span>
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                physicsData.regime === "Keyhole"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-emerald-500/20 text-emerald-300"
              }`}
            >
              {physicsData.regime === "Keyhole" ? "HIGH RISK" : "SUPPRESSED"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Depth-to-width ratio:{" "}
            <span className="text-rose-300 font-bold">
              {(physicsData.depth_um / Math.max(1, physicsData.width_um)).toFixed(2)}
            </span>{" "}
            (Threshold &gt; 0.85). Knudsen recoil pressure creates deep vapor cavity.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-[#050810] border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Lack of Fusion (LoF)</span>
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                physicsData.hatchOverlapRatio < 1.15 || physicsData.depthPenetrationRatio < 1.25
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-300"
              }`}
            >
              {physicsData.hatchOverlapRatio < 1.15 ? "OVERLAP GAP" : "SAFE BONDING"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Hatch overlap: <span className="text-amber-300 font-bold">{physicsData.hatchOverlapRatio.toFixed(2)}x</span> |
            Depth penetration:{" "}
            <span className="text-amber-300 font-bold">{physicsData.depthPenetrationRatio.toFixed(2)}x</span> layer.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-[#050810] border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-cyan-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gas Entrapment Pores</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300">
              SPHERICAL VOIDS
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Marangoni surface shear drags ambient argon shield gas into the molten convection vortex before freezing.
          </p>
        </div>
      </div>
    </div>
  );
};
