with open('python/lpbf_cfd.py', 'r', encoding='utf-8') as f:
    text = f.read()

bad_fsol = \"\"\"    fsol = foam_header(\"dictionary\", \"fvSolution\", \"system\")
    fsol += \"\"\\\"solvers
{
    \"alpha.metal.*\" { nCorrectors 2; nSubCycles 1; MULESCorr yes; solver smoothSolver; smoother symGaussSeidel; tolerance 1e-8; relTol 0; }
    pcorr { solver PCG; preconditioner DIC; tolerance 1e-5; relTol 0; }
    pcorrFinal { \\\; }
    p_rgh { solver PCG; preconditioner DIC; tolerance 1e-7; relTol 0.01; }
    p_rghFinal { \\\; relTol 0; }
    \"(U|T).*\" { solver smoothSolver; smoother symGaussSeidel; tolerance 1e-6; relTol 0; }
}\"\"\"

good_fsol = \"\"\"    fsol = foam_header(\"dictionary\", \"fvSolution\", \"system\")
    fsol += \"\"\\\"solvers
{
    \"alpha.metal.*\"
    {
        nCorrectors     2;
        nSubCycles      1;
        MULESCorr       yes;
        solver          smoothSolver;
        smoother        symGaussSeidel;
        tolerance       1e-8;
        relTol          0;
    }
    pcorr
    {
        solver          PCG;
        preconditioner  DIC;
        tolerance       1e-5;
        relTol          0;
    }
    pcorrFinal
    {
        \;
    }
    p_rgh
    {
        solver          PCG;
        preconditioner  DIC;
        tolerance       1e-7;
        relTol          0.01;
    }
    p_rghFinal
    {
        \;
        relTol          0;
    }
    \"(U|T).*\"
    {
        solver          smoothSolver;
        smoother        symGaussSeidel;
        tolerance       1e-6;
        relTol          0;
    }
}\"\"\"

if \"p_rghFinal { ; relTol 0; }\" in text:
    text = text.replace('    p_rghFinal { ; relTol 0; }', '    p_rghFinal { \\; relTol 0; }') # Just escape the \$ ? No, Python already interpolated it!

