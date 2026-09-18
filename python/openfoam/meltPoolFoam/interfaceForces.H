#ifndef interfaceForces_H
#define interfaceForces_H

#include "volFields.H"
#include "surfaceFields.H"
#include "fvcGrad.H"
#include "fvcDiv.H"
#include "fvcSnGrad.H"
#include <cmath>

namespace Foam
{

struct InterfaceDiagnostics
{
    scalar dropletPressureInside;
    scalar dropletPressureOutside;
    scalar deltaP_Pa;
    scalar totalMetalVolume_m3;
    scalar initialMetalVolume_m3;
    scalar volumeConservationError;
};

struct MarangoniDiagnostics
{
    scalar maxMarangoniMagnitude_Npm2;   // max |f_Ma| in domain [N/m^3]
    scalar rmsMarangoniMagnitude_Npm2;
    scalar interfaceCellCount;           // cells with |grad(alpha)| > threshold
};

// Compute volumetric Marangoni body force:
//   f_Ma = dSigma/dT * (I - n n) . grad(T) * |grad(alpha1)|
// where n = grad(alpha1)/|grad(alpha1)| is the interface outward normal.
// The |grad(alpha1)| factor concentrates the force at the interface and gives
// correct dimensions [N/m^3] when sigma has units [N/m] and T in [K].
// Guard: skipped in cells where |grad(alpha1)| < interfaceThreshold to avoid
//        noise in bulk fluid far from interface.
inline tmp<volVectorField> computeMarangoniForce
(
    const volScalarField& alpha1,
    const volScalarField& T,
    scalar dSigmaDT,                      // d(sigma)/dT  [N/(m K)]  (negative for metals)
    scalar interfaceThreshold = 1e3        // |grad(alpha)| threshold [1/m] ~ 1/cell_size
)
{
    const fvMesh& mesh = alpha1.mesh();

    tmp<volVectorField> tFma
    (
        new volVectorField
        (
            IOobject
            (
                "fMarangoni",
                mesh.time().name(),
                mesh,
                IOobject::NO_READ,
                IOobject::NO_WRITE
            ),
            mesh,
            dimensionedVector("zero", dimForce/dimVolume, vector::zero)
        )
    );
    volVectorField& Fma = tFma.ref();

    volVectorField gradAlpha(fvc::grad(alpha1));
    volVectorField gradT(fvc::grad(T));

    forAll(alpha1, cellI)
    {
        vector ga = gradAlpha[cellI];
        scalar magGa = mag(ga);

        if (magGa < interfaceThreshold)
        {
            Fma[cellI] = vector::zero;
            continue;
        }

        // Outward-pointing interface normal (metal -> gas)
        vector n = ga / magGa;

        // Tangential temperature gradient: (I - n n) . grad(T)
        vector gT = gradT[cellI];
        vector gT_tang = gT - (n & gT) * n;

        // f_Ma = dSigma/dT * gT_tang * |gradAlpha|  [N/m^3]
        Fma[cellI] = dSigmaDT * gT_tang * magGa;
    }

    return tFma;
}

inline MarangoniDiagnostics evaluateMarangoniDiagnostics
(
    const volVectorField& Fma,
    const volScalarField& alpha1,
    scalar interfaceThreshold = 1e3
)
{
    MarangoniDiagnostics diag;
    diag.maxMarangoniMagnitude_Npm2 = 0.0;
    diag.rmsMarangoniMagnitude_Npm2 = 0.0;
    diag.interfaceCellCount = 0.0;

    volVectorField gradAlpha(fvc::grad(alpha1));

    scalar sumSq = 0.0;
    label N = 0;

    forAll(Fma, cellI)
    {
        if (mag(gradAlpha[cellI]) >= interfaceThreshold)
        {
            scalar m = mag(Fma[cellI]);
            diag.maxMarangoniMagnitude_Npm2 = max(diag.maxMarangoniMagnitude_Npm2, m);
            sumSq += m * m;
            N++;
        }
    }

    diag.interfaceCellCount = scalar(N);
    diag.rmsMarangoniMagnitude_Npm2 = (N > 0) ? Foam::sqrt(sumSq / N) : 0.0;
    return diag;
}

inline InterfaceDiagnostics evaluateInterfaceDiagnostics
(
    const volScalarField& alpha1,
    const volScalarField& p,
    scalar initialVolume = 0.0
)
{
    InterfaceDiagnostics diag;
    const fvMesh& mesh = alpha1.mesh();
    const scalarField& v = mesh.V();
    
    scalar sumPInside = 0.0, sumVInside = 0.0;
    scalar sumPOutside = 0.0, sumVOutside = 0.0;
    scalar totalVol = 0.0;
    
    forAll(alpha1, i)
    {
        scalar a = alpha1[i];
        scalar vol = v[i];
        totalVol += a * vol;
        if (a > 0.95)
        {
            sumPInside += p[i] * vol;
            sumVInside += vol;
        }
        else if (a < 0.05)
        {
            sumPOutside += p[i] * vol;
            sumVOutside += vol;
        }
    }
    
    diag.totalMetalVolume_m3 = totalVol;
    diag.initialMetalVolume_m3 = (initialVolume > 0) ? initialVolume : totalVol;
    diag.volumeConservationError = (diag.initialMetalVolume_m3 > 0)
        ? std::abs(totalVol - diag.initialMetalVolume_m3) / diag.initialMetalVolume_m3
        : 0.0;
        
    diag.dropletPressureInside = (sumVInside > 0) ? (sumPInside / sumVInside) : 0.0;
    diag.dropletPressureOutside = (sumVOutside > 0) ? (sumPOutside / sumVOutside) : 0.0;
    diag.deltaP_Pa = diag.dropletPressureInside - diag.dropletPressureOutside;
    return diag;
}

} // End namespace Foam

#endif
