#ifndef laserModel_H
#define laserModel_H

#include "volFields.H"
#include "surfaceFields.H"
#include "fvcGrad.H"
#include "dictionary.H"
#include "List.H"
#include <cmath>

namespace Foam
{

class LaserModel
{
    const fvMesh& mesh_;
    bool active_;
    scalar power_;           // [W]
    scalar radius_;          // [m]
    scalar absorptivity_;    // dimensionless
    vector direction_;       // unit vector pointing towards metal
    scalar interfaceThreshold_; // [1/m]

    List<scalar> tStart_;
    List<scalar> tEnd_;
    List<vector> pStart_;
    List<vector> pEnd_;

public:
    LaserModel(const fvMesh& mesh, const dictionary& dict)
    :
        mesh_(mesh),
        active_(dict.lookupOrDefault<bool>("laserActive", false)),
        power_(dict.lookupOrDefault<scalar>("laserPower", 0.0)),
        radius_(dict.lookupOrDefault<scalar>("laserRadius", 1e-4)),
        absorptivity_(dict.lookupOrDefault<scalar>("laserAbsorptivity", 1.0)),
        direction_(dict.lookupOrDefault<vector>("laserDirection", vector(0, -1, 0))),
        interfaceThreshold_(dict.lookupOrDefault<scalar>("interfaceThreshold", 1e3))
    {
        if (active_ && dict.found("laserTStart"))
        {
            dict.lookup("laserTStart") >> tStart_;
            dict.lookup("laserTEnd") >> tEnd_;
            dict.lookup("laserPStart") >> pStart_;
            dict.lookup("laserPEnd") >> pEnd_;
        }
        direction_ /= (mag(direction_) + VSMALL);
    }

    bool active() const { return active_; }

    void read(const dictionary& dict)
    {
        active_ = dict.lookupOrDefault<bool>("laserActive", active_);
        power_ = dict.lookupOrDefault<scalar>("laserPower", power_);
        radius_ = dict.lookupOrDefault<scalar>("laserRadius", radius_);
        absorptivity_ = dict.lookupOrDefault<scalar>("laserAbsorptivity", absorptivity_);
        direction_ = dict.lookupOrDefault<vector>("laserDirection", direction_);
        direction_ /= (mag(direction_) + VSMALL);
        interfaceThreshold_ = dict.lookupOrDefault<scalar>("interfaceThreshold", interfaceThreshold_);
        
        if (active_ && dict.found("laserTStart"))
        {
            dict.lookup("laserTStart") >> tStart_;
            dict.lookup("laserTEnd") >> tEnd_;
            dict.lookup("laserPStart") >> pStart_;
            dict.lookup("laserPEnd") >> pEnd_;
        }
    }

    vector laserCenter(scalar t) const
    {
        forAll(tStart_, i)
        {
            if (t >= tStart_[i] && t <= tEnd_[i])
            {
                scalar f = (t - tStart_[i]) / max(tEnd_[i] - tStart_[i], VSMALL);
                return pStart_[i] + f * (pEnd_[i] - pStart_[i]);
            }
        }
        if (tStart_.size() > 0) return pStart_[0];
        return vector::zero;
    }

    bool isLaserOn(scalar t) const
    {
        forAll(tStart_, i)
        {
            if (t >= tStart_[i] && t <= tEnd_[i])
            {
                return true;
            }
        }
        return false;
    }

    tmp<volScalarField> heatSource(const volScalarField& alpha1) const
    {
        tmp<volScalarField> tHeatSource
        (
            new volScalarField
            (
                IOobject
                (
                    "laserHeatSource",
                    mesh_.time().name(),
                    mesh_,
                    IOobject::NO_READ,
                    IOobject::NO_WRITE
                ),
                mesh_,
                dimensionedScalar("zero", dimPower/dimVolume, 0.0)
            )
        );
        volScalarField& QL = tHeatSource.ref();

        if (!active_ || !isLaserOn(mesh_.time().value()))
        {
            return tHeatSource;
        }

        scalar t = mesh_.time().value();
        vector pc = laserCenter(t);
        const scalar pi = 3.14159265358979323846;
        scalar I0 = 2.0 * absorptivity_ * power_ / (pi * radius_ * radius_);

        volVectorField gradAlpha(fvc::grad(alpha1));

        forAll(alpha1, cellI)
        {
            scalar magGa = mag(gradAlpha[cellI]);
            if (magGa < interfaceThreshold_)
            {
                QL[cellI] = 0.0;
                continue;
            }

            vector r = mesh_.C()[cellI] - pc;
            scalar r_dot_d = r & direction_;
            scalar r2 = magSqr(r) - r_dot_d * r_dot_d;

            scalar intensity = I0 * std::exp(-2.0 * r2 / (radius_ * radius_));
            scalar incidence = (gradAlpha[cellI] & direction_);
            
            if (incidence > 0)
            {
                QL[cellI] = intensity * incidence;
            }
            else
            {
                QL[cellI] = 0.0;
            }
        }

        return tHeatSource;
    }
};

} // End namespace Foam

#endif
