#ifndef laserModel_H
#define laserModel_H

#include "volFields.H"
#include "surfaceFields.H"
#include "fvcGrad.H"
#include "dictionary.H"
#include "List.H"
#include "meshSearch.H"
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
    bool useRayTracing_;
    label raysPerDim_;
    scalar opticalN_;
    scalar opticalK_;

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
        interfaceThreshold_(dict.lookupOrDefault<scalar>("interfaceThreshold", 1e3)),
        useRayTracing_(dict.lookupOrDefault<bool>("useRayTracing", true)),
        raysPerDim_(dict.lookupOrDefault<label>("raysPerDim", 20)),
        opticalN_(dict.lookupOrDefault<scalar>("opticalN", 0.0)),
        opticalK_(dict.lookupOrDefault<scalar>("opticalK", 0.0))
    {
        if (opticalN_ <= 0.0 || opticalK_ <= 0.0)
        {
            scalar A0 = std::max(scalar(0.01), std::min(scalar(0.99), absorptivity_));
            scalar disc = std::max(scalar(0.0), 4.0 - 4.0*A0 - A0*A0);
            opticalN_ = (2.0 - A0 + std::sqrt(disc)) / (2.0 * A0);
            opticalK_ = opticalN_;
        }

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

    scalar fresnelAbsorptivity(scalar cosTheta) const
    {
        cosTheta = std::max(scalar(0.0), std::min(scalar(1.0), cosTheta));
        if (cosTheta < 1e-6) return 0.0;

        scalar n = opticalN_;
        scalar k = opticalK_;

        scalar cos2 = cosTheta * cosTheta;
        scalar nCos = n * cosTheta;

        scalar Rs_num = (nCos - 1.0) * (nCos - 1.0) + k * k * cos2;
        scalar Rs_den = (nCos + 1.0) * (nCos + 1.0) + k * k * cos2;
        scalar Rs = Rs_num / (Rs_den + VSMALL);

        scalar Rp_num = (n - cosTheta) * (n - cosTheta) + k * k;
        scalar Rp_den = (n + cosTheta) * (n + cosTheta) + k * k;
        scalar Rp = Rp_num / (Rp_den + VSMALL);

        scalar A = 1.0 - 0.5 * (Rs + Rp);
        return std::max(scalar(0.0), std::min(scalar(1.0), A));
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
        scalar I0 = 2.0 * power_ / (pi * radius_ * radius_);

        volVectorField gradAlpha = fvc::grad(alpha1);

        if (!useRayTracing_)
        {
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
                    QL[cellI] = absorptivity_ * intensity * incidence;
                }
            }
        }
        else
        {
            // Fresnel Multi-Bounce Ray Tracing
            scalar stepSize = 0.5 * std::pow(mesh_.V()[0], 1.0/3.0);
            scalar dxRay = 3.0 * radius_ / raysPerDim_;
            scalar rayArea = dxRay * dxRay;
            
            const meshSearch& searchEngine = meshSearch::New(mesh_);

            for (label i = -raysPerDim_; i <= raysPerDim_; ++i)
            {
                for (label j = -raysPerDim_; j <= raysPerDim_; ++j)
                {
                    vector offset(i * dxRay, j * dxRay, 0.0);
                    vector r = offset;
                    scalar r2 = magSqr(r);
                    if (r2 > 9.0 * radius_ * radius_) continue;

                    scalar rayPower = I0 * std::exp(-2.0 * r2 / (radius_ * radius_)) * rayArea;
                    if (rayPower < 1e-6) continue;

                    vector rayPos = pc + offset;
                    rayPos.z() = mesh_.bounds().max().z() - VSMALL; // Start at top of domain
                    vector rayDir = direction_;
                    
                    scalar energy = rayPower;
                    label bounces = 0;
                    
                    while (energy > 0.01 * rayPower && bounces < 8)
                    {
                        label cellI = searchEngine.findCell(rayPos);
                        if (cellI == -1) break;

                        scalar a = alpha1[cellI];
                        if (a > 0.5)
                        {
                            vector n = -gradAlpha[cellI];
                            scalar magN = mag(n);
                            if (magN > VSMALL)
                            {
                                n /= magN;
                                scalar cosTheta = -(rayDir & n);
                                scalar absFresnel = (cosTheta > 0.0)
                                    ? fresnelAbsorptivity(cosTheta)
                                    : absorptivity_;

                                scalar absorbed = energy * absFresnel;
                                QL[cellI] += absorbed / mesh_.V()[cellI];
                                energy -= absorbed;

                                rayDir = rayDir - 2.0 * (rayDir & n) * n;
                                rayDir /= (mag(rayDir) + VSMALL);
                                bounces++;
                                rayPos += rayDir * stepSize * 2.0; // escape surface layer
                            }
                            else
                            {
                                scalar absorbed = energy * absorptivity_;
                                QL[cellI] += absorbed / mesh_.V()[cellI];
                                energy = 0.0;
                                break;
                            }
                        }
                        rayPos += rayDir * stepSize;
                    }
                }
            }
        }

        return tHeatSource;
    }
};

} // End namespace Foam

#endif
