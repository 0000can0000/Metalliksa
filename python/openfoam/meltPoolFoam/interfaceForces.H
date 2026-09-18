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
