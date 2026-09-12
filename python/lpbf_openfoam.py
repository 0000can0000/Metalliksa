"""OpenFOAM 14 case generation and field-derived results. Thermal capability only."""
import math
import os
from pathlib import Path
import subprocess
import tempfile
import numpy as np
from lpbf_material_registry import enthalpy_table, property_at
from lpbf_evidence import thermal_audits

BINARY = Path(__file__).parent/"openfoam/bin/metalliksaThermal"
HEADER = 'FoamFile { version 2.0; format ascii; class dictionary; object %s; }\n'


def generate_case(p, m, folder):
    from lpbf_simulation import scan_segments
    folder = Path(folder); (folder/"system").mkdir(parents=True, exist_ok=True)
    (folder/"constant").mkdir(exist_ok=True)
    segments, end = scan_segments(p)
    radius = p["beamDiameter_um"]*.5e-6
    span = p["trackLength_um"]*1e-6+(p["tracks"]-1)*p["hatch_um"]*1e-6+6*radius
    nxy = math.ceil(span/(p["mesh_um"]*1e-6)); dx = span/nxy
    bottom = -math.ceil(max(300e-6, 4*radius)/dx)*dx
    nz = math.ceil((-bottom+p["layers"]*p["layer_um"]*1e-6)/dx)
    if nxy*nxy*nz > 600000: raise ValueError("OpenFOAM thermal cell budget exceeded")
    z = bottom+(np.arange(nz)+.5)*dx
    counts = [int(np.sum(z < layer*p["layer_um"]*1e-6)) for layer in range(int(p["layers"])+1)]
    if any(b <= a for a,b in zip(counts,counts[1:])):
        raise ValueError("Mesh cannot resolve each powder layer; reduce mesh spacing below layer thickness")
    top = bottom+nz*dx
    corners = [(x, y, z) for z in (bottom, top) for x, y in ((-span/2, -span/2), (span/2, -span/2), (span/2, span/2), (-span/2, span/2))]
    vertices = "\n".join("(%s %s %s)" % point for point in corners)
    mesh = HEADER % "blockMeshDict"+f'''convertToMeters 1;
vertices ({vertices});
blocks (hex (0 1 2 3 4 5 6 7) ({nxy} {nxy} {nz}) simpleGrading (1 1 1));
edges ();
boundary ( walls {{ type wall; faces ((0 3 2 1) (4 5 6 7) (0 1 5 4) (1 2 6 5) (2 3 7 6) (3 0 4 7)); }} );
mergePatchPairs ();
'''
    (folder/"system/blockMeshDict").write_text(mesh)
    (folder/"system/controlDict").write_text(HEADER % "controlDict"+f"application metalliksaThermal; startFrom startTime; startTime 0; stopAt endTime; endTime {end}; deltaT {p['maxDt_s']}; writeControl timeStep; writeInterval 1; writeFormat ascii; writePrecision 12; runTimeModifiable false;\n")
    (folder/"system/fvSchemes").write_text(HEADER % "fvSchemes"+"ddtSchemes { default Euler; } gradSchemes { default Gauss linear; } divSchemes { default none; } laplacianSchemes { default Gauss linear orthogonal; } interpolationSchemes { default linear; } snGradSchemes { default orthogonal; }\n")
    (folder/"system/fvSolution").write_text(HEADER % "fvSolution"+"solvers {}\n")
    tt, hh = enthalpy_table(m)
    table = np.column_stack([tt, hh, *[property_at(m, tt, i) for i in (1, 2, 3, 4)]])
    config = [end, p["maxDt_s"], p["preheat_C"]+273.15, m["solidus_K"], m["liquidus_K"], m["boiling_K"],
              p["power_W"]*m["absorptivity"], radius, p["layer_um"]*1e-6,
              p["packingFraction"], p["powderConductivityRatio"], p["convection_W_m2K"], m["emissivity"], dx, p["speed_mm_s"]*1e-3]
    with (folder/"thermalInput.dat").open("w") as stream:
        stream.write(" ".join(map(str, config))+"\n"+str(len(table))+"\n")
        np.savetxt(stream, table, fmt="%.17g")
        stream.write(str(len(segments))+"\n")
        for s in segments:
            stream.write(" ".join(map(str, [s["start_s"], s["end_s"], *s["start"], *s["end"], (s["layer"]+1)*p["layer_um"]*1e-6]))+"\n")
    return dx, segments


def thermal(p, m, report=lambda *args: None, artifact_dir=None):
    if os.name == "nt" or not BINARY.is_file():
        raise ValueError("OpenFOAM thermal executable unavailable in worker; build with wmake in WSL")
    if artifact_dir is None:
        with tempfile.TemporaryDirectory(prefix="metalliksa-thermal-") as tmp:
            return thermal(p, m, report, tmp)
    folder = Path(artifact_dir)/"openfoam-case"
    dx, segments = generate_case(p, m, folder)
    # Shell program is constant; all paths are separate positional arguments.
    script = 'source /opt/openfoam14/etc/bashrc; blockMesh -case "$1" && checkMesh -case "$1" && "$2" -case "$1"'
    child = subprocess.Popen(["bash", "-lc", script, "metalliksa", str(folder.resolve()), str(BINARY.resolve())],
                             stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    with (folder/"solver.log").open("w") as log:
        for line in child.stdout:
            log.write(line)
            if line.startswith("THERMAL_PROGRESS"):
                report(float(line.split()[1]), line.strip())
        code = child.wait()
        child.stdout.close()
    if code:
        raise ValueError("OpenFOAM thermal failed: "+(folder/"solver.log").read_text()[-2500:])
    coords = np.loadtxt(folder/"coordinates.csv", delimiter=",")
    samples = np.loadtxt(folder/"snapshots.dat", ndmin=2)
    if not np.isfinite(samples).all() or samples.shape[1] != len(coords)+14:
        raise ValueError("Invalid OpenFOAM field output")
    from lpbf_evidence import FieldRecorder
    recorder = FieldRecorder(artifact_dir, coords[:, :3], dx, m, p)
    history, best = [], dict(width_um=0., depth_um=0., length_um=0., volume_um3=0., crossSectionArea_um2=0.)
    xs = np.unique(coords[:, 0]); ever = np.zeros(len(coords), bool); remelt = ever.copy(); previous = ever.copy()
    for row in samples:
        t, ei, eo, stored, dt, steps, surface, peak = row[:8]; T = row[14:]
        recorder.record(t, T, surface)
        melt = (T >= m["liquidus_K"]) & (coords[:, 2] < surface)
        remelt |= melt&ever&~previous; ever |= melt; previous = melt
        history.append(dict(time_s=t, peak_K=float(T.max()), storedEnergy_J=stored, inputEnergy_J=ei, lossEnergy_J=eo))
        if melt.any():
            layer = max(s["layer"] for s in segments if s["start_s"] <= t)
            angle = math.radians(p["scanAngle_deg"]+layer*p["layerRotation_deg"])
            x, y, z = coords[melt, :3].T
            g = dict(length_um=float(np.ptp(x*math.cos(angle)+y*math.sin(angle))+dx*(abs(math.cos(angle))+abs(math.sin(angle))))*1e6,
                     width_um=float(np.ptp(-x*math.sin(angle)+y*math.cos(angle))+dx*(abs(math.cos(angle))+abs(math.sin(angle))))*1e6,
                     depth_um=float(surface-z.min()+dx/2)*1e6, volume_um3=float(coords[melt, 3].sum())*1e18,
                     crossSectionArea_um2=float(max(np.sum(melt&(coords[:, 0] == xx)) for xx in xs))*dx*dx*1e12)
            if g["volume_um3"] > best["volume_um3"]:
                best = g
                np.savez_compressed(Path(artifact_dir)/"peak-field.npz", coordinates_m=coords[:, :3], T_K=T, liquid_fraction=np.clip((T-m["solidus_K"])/(m["liquidus_K"]-m["solidus_K"]),0,1)*(coords[:,2]<surface), time_s=t)
    row = samples[-1]; balance = abs(row[1]-row[2]-row[3])/max(row[1], 1e-12)
    if balance > .01: raise ValueError("OpenFOAM energy balance failed")
    w = best["width_um"]*1e-6
    alpha = float(property_at(m, m["liquidus_K"], 2)/(property_at(m, m["liquidus_K"], 1)*property_at(m, m["liquidus_K"], 3)))
    best.update(peakTemperature_K=float(row[7]), thermalGradient_K_m=float(row[8]/row[11]) if row[11] else None,
                solidificationRate_m_s=float(row[9]/row[11]) if row[11] else None,
                coolingRate_K_s=float(row[10]/row[11]) if row[11] else None,
                keyholeDepth_um=None, recoilPressure_Pa=None,
                marangoniNumber=abs(m["dGamma_dT"])*max(0, row[7]-m["liquidus_K"])*w/(float(property_at(m, row[7], 4))*alpha),
                pecletNumber=p["speed_mm_s"]*.001*w/alpha, aspectRatio=best["depth_um"]/best["width_um"] if w else None,
                trackOverlapRatio=max(0.,1-p["hatch_um"]/best["width_um"]) if w else 0.,
                remeltingRatio=float(row[13]/row[12]) if row[12] else 0.)
    return dict(metrics=best, thermalHistory=history, fieldSeries=recorder.finish(), scanPath=segments,
                energyBalance=dict(input_J=float(row[1]), losses_J=float(row[2]), stored_J=float(row[3]), relativeError=float(balance)),
                discretization=dict(cells=len(coords), mesh_m=dx, minimumDt_s=float(row[4]), meanDt_s=float(row[0]/row[5]), steps=int(row[5])),
                **thermal_audits(coords[:,:3],coords[:,3],p,m,np.clip((samples[-1,14:]-m["solidus_K"])/(m["liquidus_K"]-m["solidus_K"]),0,1)),
                fieldHistory="openfoam-case/snapshots.dat", extractionNote="Dimensions sampled at ~60 times. G/R/cooling are crossing-cell means over every timestep; remelting tracked every step.")
