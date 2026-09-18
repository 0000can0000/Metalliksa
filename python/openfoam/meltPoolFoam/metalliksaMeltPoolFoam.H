/*---------------------------------------------------------------------------*\
  =========                 |
  \\      /  F ield         | OpenFOAM: The Open Source CFD Toolbox
   \\    /   O peration     | Website:  https://openfoam.org
    \\  /    A nd           | Copyright (C) Metalliksa Multiphysics CFD
     \\/     M anipulation  |
-------------------------------------------------------------------------------
Class
    Foam::solvers::metalliksaMeltPoolFoam

Description
    Multiphysics CFD solver for LPBF melt pool simulation:
    - 2-phase metal-gas VOF with Continuum Surface Force (CSF)
    - Enthalpy-based phase change (solid-mushy-liquid)
    - Carman-Kozeny Darcy momentum sink in mushy/solid zones
    - Marangoni tangential stress: (I-nn).grad(T) * dSigma/dT [Phase 2]
    - Solidification microstructure tracking: G, R, PDAS, SDAS [Phase 8]
\*---------------------------------------------------------------------------*/

#ifndef metalliksaMeltPoolFoam_H
#define metalliksaMeltPoolFoam_H

#include "incompressibleVoF.H"
#include "laserModel.H"
#include "evaporationModel.H"
#include "interfaceForces.H"
#include "solidificationModel.H"      // Phase 8: G/R microstructure tracker
#include "IOdictionary.H"
#include "fvmDdt.H"
#include "fvmDiv.H"
#include "fvmLaplacian.H"
#include "fvmSup.H"
#include "fvcDiv.H"
#include "fvcDdt.H"
#include "fvcSnGrad.H"
#include "fvcReconstruct.H"
#include "fvcFlux.H"
#include "surfaceInterpolate.H"
#include "fvcAverage.H"

namespace Foam
{
namespace solvers
{

class metalliksaMeltPoolFoam
:
    public incompressibleVoF
{
protected:
    // Thermal & phase change fields
    volScalarField T_;
    volScalarField H_;
    volScalarField liquidFraction_;
    volScalarField SDarcy_;
    volVectorField SMarangoni_;    // Marangoni body force [N/m^3]
    volVectorField SRecoil_;       // Recoil body force [N/m^3] (Phase 3)
    volVectorField SPlume_;        // Plume gas expansion force [N/m^3] (Phase 7)
    volScalarField ShEvap_;        // Evaporative cooling sink [W/m^3] (Phase 3)

    // Thermophysical properties
    dimensionedScalar kMetal_;
    dimensionedScalar kGas_;
    dimensionedScalar cpMetal_;
    dimensionedScalar cpGas_;
    dimensionedScalar solidus_T_;
    dimensionedScalar liquidus_T_;
    dimensionedScalar latentHeat_;
    dimensionedScalar Cmush_;

    // Surface tension parameters (Phase 2: Marangoni)
    dimensionedScalar sigma0_;       // sigma at Tref [N/m]
    dimensionedScalar dSigmaDT_;     // d(sigma)/dT [N/(m K)] — negative for metals
    dimensionedScalar Tref_sigma_;   // Reference temperature for sigma0 [K]
    scalar interfaceThreshold_;      // |grad(alpha)| threshold [1/m]

    // Sourced physical submodels
    LaserModel laser_;
    EvaporationModel evaporation_;
    SolidificationModel solidification_;   // Phase 8

    // Diagnostics tracking
    scalar initialMetalVolume_;
    SolidificationDiagnostics solidificationDiag_;  // Phase 8: cached per time step

    void updateDarcySink();
    void updateEnthalpyAndPhaseFraction();
    void updateMarangoniForce();         // Phase 2
    void updateEvaporationAndRecoil();   // Phase 3
    void updateSolidificationMetrics();  // Phase 8

public:
    TypeName("metalliksaMeltPoolFoam");

    metalliksaMeltPoolFoam(fvMesh& mesh);
    virtual ~metalliksaMeltPoolFoam();

    virtual void momentumPredictor() override;
    virtual void thermophysicalPredictor() override;
    virtual void postSolve() override;

    const volScalarField& T() const { return T_; }
    const volScalarField& liquidFraction() const { return liquidFraction_; }
    const volScalarField& H() const { return H_; }
    const volScalarField& SDarcy() const { return SDarcy_; }
    const volVectorField& SMarangoni() const { return SMarangoni_; }  // Phase 2
    const volVectorField& SRecoil() const { return SRecoil_; }        // Phase 3
    const volVectorField& SPlume() const { return SPlume_; }          // Phase 7
    const volScalarField& ShEvap() const { return ShEvap_; }          // Phase 3
    const SolidificationDiagnostics& solidificationDiag() const { return solidificationDiag_; }  // Phase 8
};

} // End namespace solvers
} // End namespace Foam

#endif
