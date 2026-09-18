/*---------------------------------------------------------------------------*\
  =========                 |
  \\      /  F ield         | OpenFOAM: The Open Source CFD Toolbox
   \\    /   O peration     | Website:  https://openfoam.org
    \\  /    A nd           | Copyright (C) Metalliksa Multiphysics CFD
     \\/     M anipulation  |
-------------------------------------------------------------------------------
Class
    Foam::SolidificationModel

Description
    Phase 8 — In-situ solidification microstructure tracker for LPBF.

    At each time step, cells near the solidification front (mushy zone,
    0.05 < liquidFraction < 0.95) are sampled to extract:
      - G   : thermal gradient magnitude  [K/m]  = |grad(T)|
      - R   : solidification rate         [m/s]  = |U · n_front|
      - Tdot: cooling rate                [K/s]  = G * R

    Microstructure correlations applied:
      Hunt-Lu PDAS:    λ₁ [µm] = 80 · G^(-0.5) · R^(-0.25)
      Kirkwood SDAS:   λ₂ [µm] = 64.5 · Ṫ^(-0.33)
      Morphology (columnar/equiaxed): Hunt G/R criterion,
          columnar  → G/R > 1e8  K·s/m²
          equiaxed  → G/R < 1e6  K·s/m²
          mixed     → in between

\*---------------------------------------------------------------------------*/

#ifndef solidificationModel_H
#define solidificationModel_H

#include "volFields.H"
#include "fvcGrad.H"
#include "fvcSnGrad.H"

namespace Foam
{

struct SolidificationDiagnostics
{
    label  frontCellCount;
    scalar meanG_K_m;         // Mean thermal gradient at front [K/m]
    scalar meanR_m_s;         // Mean solidification rate [m/s]
    scalar meanCoolingRate_K_s;
    scalar meanPDAS_um;       // Primary dendrite arm spacing [µm]
    scalar meanSDAS_um;       // Secondary dendrite arm spacing [µm]
    scalar fracColumnar;      // Fraction of front cells with columnar morphology
    scalar fracEquiaxed;      // Fraction of front cells with equiaxed morphology
    scalar maxG_K_m;
    scalar maxR_m_s;
};

class SolidificationModel
{
public:

    SolidificationModel()
    {}

    // Compute in-situ solidification microstructure diagnostics.
    // Called once per time step inside thermophysicalPredictor.
    SolidificationDiagnostics compute
    (
        const volScalarField& T,
        const volScalarField& liquidFraction,
        const volVectorField& U
    ) const
    {
        SolidificationDiagnostics diag;
        diag.frontCellCount     = 0;
        diag.meanG_K_m          = 0.0;
        diag.meanR_m_s          = 0.0;
        diag.meanCoolingRate_K_s = 0.0;
        diag.meanPDAS_um        = 0.0;
        diag.meanSDAS_um        = 0.0;
        diag.fracColumnar       = 0.0;
        diag.fracEquiaxed       = 0.0;
        diag.maxG_K_m           = 0.0;
        diag.maxR_m_s           = 0.0;

        // Compute grad(T) to get G field
        volVectorField gradT = fvc::grad(T);

        // --- Parameters ---
        const scalar lf_lo = 0.05;
        const scalar lf_hi = 0.95;

        // Hunt G/R thresholds [K·s/m²]
        const scalar GR_columnar_threshold = 1.0e8;
        const scalar GR_equiaxed_threshold = 1.0e6;

        // Hunt-Lu PDAS coefficient: λ₁ = A1 * G^a1 * R^b1  (µm)
        const scalar PDAS_A = 80.0;    // [µm · (K/m)^0.5 · (m/s)^0.25]
        const scalar PDAS_a = -0.5;
        const scalar PDAS_b = -0.25;

        // Kirkwood SDAS coefficient: λ₂ = B * Ṫ^(-0.33)  (µm)
        const scalar SDAS_B = 64.5;

        // Accumulate over mushy-zone cells
        label nCells = 0;
        scalar sumG = 0.0, sumR = 0.0, sumTdot = 0.0;
        scalar sumPDAS = 0.0, sumSDAS = 0.0;
        label nColumnar = 0, nEquiaxed = 0;
        scalar maxG = 0.0, maxR = 0.0;

        const scalarField& lfCells = liquidFraction.internalField();
        const vectorField& gradTCells = gradT.internalField();
        const vectorField& UCells = U.internalField();

        forAll(lfCells, cellI)
        {
            scalar lf = lfCells[cellI];
            if (lf < lf_lo || lf > lf_hi) continue;

            // Thermal gradient magnitude [K/m]
            scalar G = mag(gradTCells[cellI]);
            G = max(G, SMALL);

            // Solidification rate: component of velocity along -grad(T) direction
            // (front moves opposite to gradient direction for solidifying metal)
            vector nFront = -gradTCells[cellI] / G;  // unit outward normal from solid
            scalar R = max(0.0, (UCells[cellI] & nFront));
            R = max(R, 1.0e-6);  // floor to avoid division by zero

            scalar Tdot = G * R;

            // Hunt-Lu PDAS [µm]
            scalar PDAS = PDAS_A * pow(G, PDAS_a) * pow(R, PDAS_b);
            PDAS = max(0.1, min(PDAS, 500.0));  // physical clamp [0.1, 500] µm

            // Kirkwood SDAS [µm]
            scalar SDAS = SDAS_B * pow(max(Tdot, 1.0), -0.33);
            SDAS = max(0.05, min(SDAS, 200.0));

            // Hunt morphology criterion
            scalar GR_ratio = G / R;
            if (GR_ratio > GR_columnar_threshold) nColumnar++;
            else if (GR_ratio < GR_equiaxed_threshold) nEquiaxed++;

            sumG    += G;
            sumR    += R;
            sumTdot += Tdot;
            sumPDAS += PDAS;
            sumSDAS += SDAS;
            maxG = max(maxG, G);
            maxR = max(maxR, R);
            nCells++;
        }

        if (nCells > 0)
        {
            diag.frontCellCount      = nCells;
            diag.meanG_K_m           = sumG   / nCells;
            diag.meanR_m_s           = sumR   / nCells;
            diag.meanCoolingRate_K_s = sumTdot / nCells;
            diag.meanPDAS_um         = sumPDAS / nCells;
            diag.meanSDAS_um         = sumSDAS / nCells;
            diag.fracColumnar        = scalar(nColumnar) / nCells;
            diag.fracEquiaxed        = scalar(nEquiaxed) / nCells;
            diag.maxG_K_m            = maxG;
            diag.maxR_m_s            = maxR;
        }

        return diag;
    }
};

} // End namespace Foam

#endif
