#ifndef laserModel_H
#define laserModel_H

#include "volFields.H"
#include "surfaceFields.H"

namespace Foam
{

class LaserModel
{
    const fvMesh& mesh_;
    bool active_;

public:
    LaserModel(const fvMesh& mesh, const dictionary& dict)
    :
        mesh_(mesh),
        active_(dict.lookupOrDefault<bool>("active", false))
    {}

    bool active() const { return active_; }

    // Phase 1 stub: moving interface laser flux is inactive until Phase 4 qualification
    tmp<volScalarField> heatSource() const
    {
        return tmp<volScalarField>
        (
            new volScalarField
            (
                IOobject("laserHeatSource", mesh_.time().name(), mesh_),
                mesh_,
                dimensionedScalar("zero", dimPower/dimVolume, 0)
            )
        );
    }
};

} // End namespace Foam

#endif
