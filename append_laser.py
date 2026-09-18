import os
from pathlib import Path

content = '''

# ---------------------------------------------------------------------------
# Phase 4: Laser model case setup
# ---------------------------------------------------------------------------

def setup_laser_case(
    case_dir,
    lx: float = 100e-6,
    ly: float = 100e-6,
    nx: int = 20,
    ny: int = 20,
    end_time: float = 2e-7,
    dt: float = 5e-8,
    laser_power: float = 100.0,
    laser_radius: float = 20e-6,
    t_start: float = 0.0,
    t_end: float = 2e-7,
    p_start: tuple = (20e-6, 50e-6, 0.0),
    p_end: tuple = (80e-6, 50e-6, 0.0),
):
    """Set up a 2D laser verification case."""
    c_dir = Path(case_dir)

    os.makedirs(c_dir / "0", exist_ok=True)
    os.makedirs(c_dir / "constant", exist_ok=True)
    os.makedirs(c_dir / "system", exist_ok=True)

    dz = lx / nx

    bm = foam_header("dictionary", "blockMeshDict", "system")
    bm += f"""convertToMeters 1;
vertices
(
    (0    0    0)
    ({lx} 0    0)
    ({lx} {ly} 0)
    (0    {ly} 0)
    (0    0    {dz})
    ({lx} 0    {dz})
    ({lx} {ly} {dz})
    (0    {ly} {dz})
);
blocks
(
    hex (0 1 2 3 4 5 6 7) ({nx} {ny} 1) simpleGrading (1 1 1)
);
edges ();
boundary
(
    walls
    {{
        type wall;
        faces ((0 1 5 4) (1 2 6 5) (2 3 7 6) (3 0 4 7));
    }}
    frontAndBack
    {{
        type empty;
        faces ((0 3 2 1) (4 5 6 7));
    }}
);
"""
    (c_dir / "system" / "blockMeshDict").write_text(bm, encoding="utf-8")

    cd = foam_header("dictionary", "controlDict", "system")
    cd += f"""application     metalliksaMeltPoolFoam;
startFrom       startTime;
startTime       0;
stopAt          endTime;
endTime         {end_time};
deltaT          {dt};
writeControl    timeStep;
writeInterval   1;
purgeWrite      0;
writeFormat     ascii;
writePrecision  8;
writeCompression off;
timeFormat      general;
timePrecision   6;
runTimeModifiable true;
"""
    (c_dir / "system" / "controlDict").write_text(cd, encoding="utf-8")

    fs = foam_header("dictionary", "fvSchemes", "system")
    fs += """ddtSchemes { default Euler; }
gradSchemes { default Gauss linear; }
divSchemes
{
    div(phi,alpha) Gauss interfaceCompression vanLeer 1;
    div(rhoPhi,U) Gauss linearUpwind grad(U);
    div(((rho*nuEff)*dev2(T(grad(U))))) Gauss linear;
    div(rhoCpPhi,T) Gauss upwind;
}
laplacianSchemes { default Gauss linear uncorrected; }
interpolationSchemes { default linear; }
snGradSchemes { default uncorrected; }
"""
    (c_dir / "system" / "fvSchemes").write_text(fs, encoding="utf-8")

    fsol = foam_header("dictionary", "fvSolution", "system")
    fsol += """solvers
{
    "alpha.metal.*" { nCorrectors 2; nSubCycles 1; MULESCorr yes; solver smoothSolver; smoother symGaussSeidel; tolerance 1e-8; relTol 0; }
    pcorr { solver PCG; preconditioner DIC; tolerance 1e-5; relTol 0; }
    pcorrFinal { ; }
    p_rgh { solver PCG; preconditioner DIC; tolerance 1e-7; relTol 0.01; }
    p_rghFinal { ; relTol 0; }
    "(U|T).*" { solver smoothSolver; smoother symGaussSeidel; tolerance 1e-6; relTol 0; }
}
PIMPLE
{
    momentumPredictor no;
    nOuterCorrectors 1;
    nCorrectors 2;
    nNonOrthogonalCorrectors 0;
    pRefCell 0;
    pRefValue 0;
    p_rghRefCell 0;
    p_rghRefValue 0;
}
"""
    (c_dir / "system" / "fvSolution").write_text(fsol, encoding="utf-8")

    pp = foam_header("dictionary", "phaseProperties", "constant")
    pp += "phases (metal gas);\\nsigma 1.7;\\n"
    (c_dir / "constant" / "phaseProperties").write_text(pp, encoding="utf-8")

    pm = foam_header("dictionary", "physicalProperties.metal", "constant")
    pm += "viscosityModel constant;\\nnu 7.5e-07;\\nrho 7900;\\n"
    (c_dir / "constant" / "physicalProperties.metal").write_text(pm, encoding="utf-8")

    pg = foam_header("dictionary", "physicalProperties.gas", "constant")
    pg += "viscosityModel constant;\\nnu 1.5e-05;\\nrho 1.2;\\n"
    (c_dir / "constant" / "physicalProperties.gas").write_text(pg, encoding="utf-8")

    mt = foam_header("dictionary", "momentumTransport", "constant")
    mt += "simulationType laminar;\\n"
    (c_dir / "constant" / "momentumTransport").write_text(mt, encoding="utf-8")

    g_str = foam_header("dictionary", "g", "constant")
    g_str += "dimensions [acceleration];\\nvalue (0 0 0);\\n"
    (c_dir / "constant" / "g").write_text(g_str, encoding="utf-8")

    tp = foam_header("dictionary", "thermalProperties", "constant")
    tp += f"""kMetal          30.0;
kGas            0.026;
cpMetal         500.0;
cpGas           1000.0;
solidus_T       1650.0;
liquidus_T      1700.0;
latentHeat      2.7e5;
Cmush           1e6;

laserActive     true;
laserPower      {laser_power};
laserRadius     {laser_radius};
laserAbsorptivity 1.0;
laserDirection  (0 -1 0);
laserTStart     1({t_start});
laserTEnd       1({t_end});
laserPStart     1({p_start[0]} {p_start[1]} {p_start[2]});
laserPEnd       1({p_end[0]} {p_end[1]} {p_end[2]});
"""
    (c_dir / "constant" / "thermalProperties").write_text(tp, encoding="utf-8")

    n_cells = nx * ny
    half_ny = ny // 2
    alpha_vals = ["1" if j < half_ny else "0" for j in range(ny) for i in range(nx)]
    
    am = foam_header("volScalarField", "alpha.metal", "0")
    am += f"""dimensions [];
internalField nonuniform List<scalar>
{n_cells}
(
{"\\n".join(alpha_vals)}
);
boundaryField
{{
    walls {{ type zeroGradient; }}
    frontAndBack {{ type empty; }}
}}
"""
    (c_dir / "0" / "alpha.metal").write_text(am, encoding="utf-8")

    prgh = foam_header("volScalarField", "p_rgh", "0")
    prgh += """dimensions [pressure];
internalField uniform 0;
boundaryField
{
    walls { type fixedFluxPressure; value uniform 0; }
    frontAndBack { type empty; }
}
"""
    (c_dir / "0" / "p_rgh").write_text(prgh, encoding="utf-8")

    uf = foam_header("volVectorField", "U", "0")
    uf += """dimensions [velocity];
internalField uniform (0 0 0);
boundaryField
{
    walls { type noSlip; }
    frontAndBack { type empty; }
}
"""
    (c_dir / "0" / "U").write_text(uf, encoding="utf-8")

    tf = foam_header("volScalarField", "T", "0")
    tf += """dimensions [temperature];
internalField uniform 300;
boundaryField
{
    walls { type zeroGradient; }
    frontAndBack { type empty; }
}
"""
    (c_dir / "0" / "T").write_text(tf, encoding="utf-8")

    lff = foam_header("volScalarField", "liquidFraction", "0")
    lff += """dimensions [];
internalField uniform 0;
boundaryField
{
    walls { type zeroGradient; }
    frontAndBack { type empty; }
}
"""
    (c_dir / "0" / "liquidFraction").write_text(lff, encoding="utf-8")
'''

with open('python/lpbf_cfd.py', 'a', encoding='utf-8') as f:
    f.write(content)

