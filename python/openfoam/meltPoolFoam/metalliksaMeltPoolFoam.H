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
\*---------------------------------------------------------------------------*/

#ifndef metalliksaMeltPoolFoam_H
#define metalliksaMeltPoolFoam_H

#include "incompressibleVoF.H"
#include "laserModel.H"
#include "evaporationModel.H"
#include "interfaceForces.H"
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

    // Thermophysical properties
    dimensionedScalar kMetal_;
    dimensionedScalar kGas_;
    dimensionedScalar cpMetal_;
    dimensionedScalar cpGas_;
    dimensionedScalar solidus_T_;
    dimensionedScalar liquidus_T_;
    dimensionedScalar latentHeat_;
    dimensionedScalar Cmush_;

    // Sourced physical submodels
    LaserModel laser_;
    EvaporationModel evaporation_;

    // Diagnostics tracking
    scalar initialMetalVolume_;

    void updateDarcySink();
    void updateEnthalpyAndPhaseFraction();

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
};

} // End namespace solvers
} // End namespace Foam

#endif
