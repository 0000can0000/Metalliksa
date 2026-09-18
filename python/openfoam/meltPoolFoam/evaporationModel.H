#ifndef evaporationModel_H
#define evaporationModel_H

#include "volFields.H"
#include "surfaceFields.H"

namespace Foam
{

class EvaporationModel
{
    const fvMesh& mesh_;
    bool active_;

public:
    EvaporationModel(const fvMesh& mesh, const dictionary& dict)
    :
        mesh_(mesh),
        active_(dict.lookupOrDefault<bool>("active", false))
    {}

    bool active() const { return active_; }

    // Phase 1 stub: recoil pressure and mass loss are inactive until Phase 5 qualification
    tmp<surfaceScalarField> recoilStress() const
    {
        return tmp<surfaceScalarField>
        (
            new surfaceScalarField
            (
                IOobject("recoilStress", mesh_.time().name(), mesh_),
                mesh_,
                dimensionedScalar("zero", dimPressure, 0)
            )
        );
    }
};

} // End namespace Foam

#endif
