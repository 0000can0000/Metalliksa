import sys
from pathlib import Path
import re

# 1. Patch lpbf_simulation.py
path = Path("python/lpbf_simulation.py")
content = path.read_text(encoding="utf-8")

s1 = 'use_foam = p["backend"] == "openfoam-thermal" or (p["backend"] == "auto" and (capabilities or {}).get("openfoamThermal"))'
r1 = 'use_foam = p["backend"] == "openfoam-thermal" or (p["backend"] == "auto" and (capabilities or {}).get("openfoamThermal"))\n    use_cfd = p["backend"] == "openfoam-cfd"\n    if use_cfd:\n        fallback = False\n        p["mode"] = "high-fidelity"'

s2 = '    if use_foam:\n        from lpbf_openfoam import thermal\n        thermal_solver = thermal'
r2 = '    if use_foam:\n        from lpbf_openfoam import thermal\n        thermal_solver = thermal\n    elif use_cfd:\n        from lpbf_cfd import cfd_multiphysics\n        thermal_solver = cfd_multiphysics'

if "use_cfd" not in content:
    content = content.replace(s1, r1)
    content = content.replace(s2, r2)
    path.write_text(content, encoding="utf-8")
    print("Patched lpbf_simulation.py")

# 2. Patch lpbf_worker.py
path_worker = Path("python/lpbf_worker.py")
worker_content = path_worker.read_text(encoding="utf-8")
worker_s = 'freeSurfaceSolver=False'
worker_r = 'freeSurfaceSolver=bool(version and (Path(__file__).parent/"openfoam/bin/metalliksaMeltPoolFoam").is_file())'
if worker_s in worker_content:
    worker_content = worker_content.replace(worker_s, worker_r)
    path_worker.write_text(worker_content, encoding="utf-8")
    print("Patched lpbf_worker.py")

# 3. Patch lpbf_cfd.py
cfd_code = """
def setup_cfd_multiphysics_case(p, m, folder):
    import math
    import numpy as np
    from lpbf_simulation import scan_segments
    folder = Path(folder)
    (folder/"system").mkdir(parents=True, exist_ok=True)
    (folder/"constant").mkdir(parents=True, exist_ok=True)
    (folder/"0").mkdir(parents=True, exist_ok=True)
    segments, end = scan_segments(p)
    radius = p["beamDiameter_um"]*.5e-6
    span = p["trackLength_um"]*1e-6+(p["tracks"]-1)*p["hatch_um"]*1e-6+6*radius
    nxy = math.ceil(span/(p["mesh_um"]*1e-6)); dx = span/nxy
    bottom = -math.ceil(max(300e-6, 4*radius)/dx)*dx
    nz = math.ceil((-bottom+p["layers"]*p["layer_um"]*1e-6)/dx)
    if nxy*nxy*nz > 200000: raise ValueError("OpenFOAM CFD cell budget exceeded (>200k cells)")
    z = bottom+(np.arange(nz)+.5)*dx
    counts = [int(np.sum(z < layer*p["layer_um"]*1e-6)) for layer in range(int(p["layers"])+1)]
    if any(b <= a for a,b in zip(counts,counts[1:])):
        raise ValueError("Mesh cannot resolve each powder layer; reduce mesh spacing below layer thickness")
    top = bottom+nz*dx
    corners = [(x, y, zz) for zz in (bottom, top) for x, y in ((-span/2, -span/2), (span/2, -span/2), (span/2, span/2), (-span/2, span/2))]
    vertices = "\\n".join("(%s %s %s)" % point for point in corners)
    mesh = foam_header("dictionary", "blockMeshDict", "system")+f'''convertToMeters 1;
vertices ({vertices});
blocks (hex (0 1 2 3 4 5 6 7) ({nxy} {nxy} {nz}) simpleGrading (1 1 1));
edges ();
boundary ( walls {{ type wall; faces ((0 3 2 1) (4 5 6 7) (0 1 5 4) (1 2 6 5) (2 3 7 6) (3 0 4 7)); }} );
mergePatchPairs ();
'''
    (folder/"system/blockMeshDict").write_text(mesh)
    
    cd = foam_header("dictionary", "controlDict", "system")
    cd += f'''application     metalliksaMeltPoolFoam;
startFrom       startTime;
startTime       0;
stopAt          endTime;
endTime         {end};
deltaT          1e-8;
writeControl    adjustable;
writeInterval   {end/60};
purgeWrite      0;
writeFormat     ascii;
writePrecision  12;
writeCompression off;
timeFormat      general;
timePrecision   12;
runTimeModifiable false;
adjustTimeStep  yes;
maxCo           0.2;
maxAlphaCo      0.2;
maxDeltaT       {p["maxDt_s"]};
'''
    (folder/"system/controlDict").write_text(cd)

    (folder/"system/fvSchemes").write_text(foam_header("dictionary", "fvSchemes", "system") + '''
ddtSchemes { default Euler; }
gradSchemes { default Gauss linear; }
divSchemes { default none; 
    div(rhoPhi,U) Gauss linearUpwind grad(U);
    div(phi,alpha) Gauss vanLeer;
    div(phirb,alpha) Gauss linear;
    div(rhoPhi,T) Gauss upwind;
}
laplacianSchemes { default Gauss linear orthogonal; }
interpolationSchemes { default linear; }
snGradSchemes { default orthogonal; }
''')
    (folder/"system/fvSolution").write_text(foam_header("dictionary", "fvSolution", "system") + '''
solvers {
    "alpha.metal" { solver smoothSolver; smoother symGaussSeidel; tolerance 1e-8; relTol 0; }
    "p_rgh.*" { solver PCG; preconditioner DIC; tolerance 1e-8; relTol 0; }
    "U.*" { solver smoothSolver; smoother symGaussSeidel; tolerance 1e-6; relTol 0; }
    "T.*" { solver smoothSolver; smoother symGaussSeidel; tolerance 1e-6; relTol 0; }
}
PIMPLE { nOuterCorrectors 1; nCorrectors 2; nNonOrthogonalCorrectors 0; }
''')

    (folder/"constant/g").write_text(foam_header("dictionary", "g", "constant") + "dimensions [0 1 -2 0 0 0 0];\\nvalue (0 0 -9.81);\\n")
    (folder/"constant/momentumTransport").write_text(foam_header("dictionary", "momentumTransport", "constant") + "simulationType laminar;\\n")
    (folder/"constant/phaseProperties").write_text(foam_header("dictionary", "phaseProperties", "constant") + "phases (metal gas);\\nsigma 1.52;\\n")
    (folder/"constant/physicalProperties.metal").write_text(foam_header("dictionary", "physicalProperties.metal", "constant") + "viscosityModel constant;\\nnu 7.5e-07;\\nrho 4000;\\n")
    (folder/"constant/physicalProperties.gas").write_text(foam_header("dictionary", "physicalProperties.gas", "constant") + "viscosityModel constant;\\nnu 1.5e-05;\\nrho 1.6;\\n")
    
    tp = foam_header("dictionary", "thermalProperties", "constant")
    tp += f'''
kMetal          30.0;
kGas            0.026;
cpMetal         500.0;
cpGas           1000.0;
solidus_T       {m["solidus_K"]};
liquidus_T      {m["liquidus_K"]};
latentHeat      2.86e5;
Cmush           1e6;

sigma0          1.52;
dSigmaDT        -2.6e-4;
Tref_sigma      {m["liquidus_K"]};
interfaceThreshold 1e3;

active          true;
latentHeatVap   7.4e6;
boiling_T       {m["boiling_K"]};
molarMass       0.046;
evapCoeff       0.82;
P0              101325.0;

laserActive     true;
laserPower      {p["power_W"]*m["absorptivity"]};
laserRadius     {radius};
laserAbsorptivity 1.0;
laserDirection  (0 0 -1);

laserTStart     {len(segments)} ( {" ".join(str(s["start_s"]) for s in segments)} );
laserTEnd       {len(segments)} ( {" ".join(str(s["end_s"]) for s in segments)} );
laserPStart     {len(segments)} ( {" ".join(f'({s["start"][0]} {s["start"][1]} {(s["layer"]+1)*p["layer_um"]*1e-6})' for s in segments)} );
laserPEnd       {len(segments)} ( {" ".join(f'({s["end"][0]} {s["end"][1]} {(s["layer"]+1)*p["layer_um"]*1e-6})' for s in segments)} );
'''
    (folder/"constant/thermalProperties").write_text(tp)

    n_cells = nxy * nxy * nz
    alpha_vals = ["1" if z[k] < p["layer_um"]*1e-6 else "0" for k in range(nz) for j in range(nxy) for i in range(nxy)]
    am = foam_header("volScalarField", "alpha.metal", "0") + f'''
dimensions [0 0 0 0 0 0 0];
internalField nonuniform List<scalar>
{n_cells}
(
{"\\n".join(alpha_vals)}
);
boundaryField
{{
    walls {{ type zeroGradient; }}
}}
'''
    (folder/"0/alpha.metal").write_text(am)
    
    (folder/"0/p_rgh").write_text(foam_header("volScalarField", "p_rgh", "0") + '''
dimensions [1 -1 -2 0 0 0 0];
internalField uniform 0;
boundaryField { walls { type fixedFluxPressure; value uniform 0; } }
''')

    (folder/"0/U").write_text(foam_header("volVectorField", "U", "0") + '''
dimensions [0 1 -1 0 0 0 0];
internalField uniform (0 0 0);
boundaryField { walls { type noSlip; } }
''')

    t0 = p["preheat_C"]+273.15
    (folder/"0/T").write_text(foam_header("volScalarField", "T", "0") + f'''
dimensions [0 0 0 1 0 0 0];
internalField uniform {t0};
boundaryField {{ walls {{ type zeroGradient; }} }}
''')

    (folder/"0/liquidFraction").write_text(foam_header("volScalarField", "liquidFraction", "0") + '''
dimensions [0 0 0 0 0 0 0];
internalField uniform 0;
boundaryField { walls { type zeroGradient; } }
''')

    return dx, segments

def cfd_multiphysics(p, m, report=lambda *args: None, artifact_dir=None):
    if artifact_dir is None:
        import tempfile
        with tempfile.TemporaryDirectory(prefix="metalliksa-cfd-") as tmp:
            return cfd_multiphysics(p, m, report, tmp)
    folder = Path(artifact_dir)/"openfoam-cfd-case"
    dx, segments = setup_cfd_multiphysics_case(p, m, folder)
    
    script = 'source /opt/openfoam14/etc/bashrc; blockMesh -case "$1" && checkMesh -case "$1" && "$2" -case "$1"'
    import subprocess
    BINARY_CFD = Path(__file__).parent/'openfoam/bin/metalliksaMeltPoolFoam'
    child = subprocess.Popen(["bash", "-lc", script, "metalliksa", str(folder.resolve()), str(BINARY_CFD.resolve())],
                             stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    with (folder/"solver.log").open("w") as log:
        for line in child.stdout:
            log.write(line)
            if "Time = " in line:
                try:
                    t_str = line.split("Time = ")[1].strip()
                    t = float(t_str)
                    report(t/segments[-1]["end_s"], "CFD t="+t_str)
                except:
                    pass
        code = child.wait()
    if code:
        raise ValueError("OpenFOAM CFD failed: "+(folder/"solver.log").read_text()[-2500:])
    
    import json
    try:
        diag = json.loads((folder/"cfd-diagnostics.json").read_text())
    except:
        diag = {}
        
    return dict(metrics=dict(), thermalHistory=[], fieldSeries=[],
                fieldOverlapDiagnostics=dict(),
                numericalDiagnostics=diag,
                energyBalance=dict(), discretization=dict(mesh_m=dx), scanPath=segments)

"""

path_cfd = Path("python/lpbf_cfd.py")
cfd_content = path_cfd.read_text(encoding="utf-8")
if "def setup_cfd_multiphysics_case" not in cfd_content:
    cfd_content += "\n" + cfd_code
    path_cfd.write_text(cfd_content, encoding="utf-8")
    print("Patched lpbf_cfd.py")

