"""Versioned result identity binding; consistency is not scientific validation.

Hashes use Python sorted compact ASCII-escaped JSON (v1), not a universal
cross-language canonical JSON format. Existing result snapshots hold the data.
"""
import hashlib
import json


def _encoded(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'),
                      ensure_ascii=True, allow_nan=False).encode('utf-8')


def build_core_contract(settings, material, solver_id, effective_mode):
    """Bind resolved inputs and material to an allowlisted executed model."""
    if not isinstance(settings, dict) or not isinstance(material, dict):
        raise ValueError('LPBF core contract requires resolved settings and material')
    requested = settings.get('backend')
    if requested not in ('auto', 'reference', 'openfoam-thermal'):
        raise ValueError('LPBF core contract has unknown requested backend')
    if effective_mode == 'screening' and solver_id == 'rosenthal+goldak':
        model, backend, transient = 'analytical-conduction-screening-v1', 'analytical', False
    elif effective_mode in ('standard', 'calibration') and solver_id in (
            'enthalpy-fv-6', 'metalliksaThermal-OpenFOAM14-6'):
        backend = 'numpy-reference' if solver_id == 'enthalpy-fv-6' else 'openfoam-thermal'
        expected = 'reference' if backend == 'numpy-reference' else 'openfoam-thermal'
        if requested not in ('auto', expected):
            raise ValueError('LPBF core contract requested/executed backend mismatch')
        model, transient = 'stationary-enthalpy-conduction-v1', True
    else:
        raise ValueError('LPBF core contract has unknown solver/mode combination')
    return dict(schemaVersion=1, modelId=model, actualBackend=backend,
        requestedBackend=requested, effectiveMode=effective_mode, solverId=solver_id,
        inputSha256=hashlib.sha256(_encoded(settings)).hexdigest(),
        materialSha256=hashlib.sha256(_encoded(material)).hexdigest(),
        units=dict(power='W', speed='mm/s', length='um', preheat='degC',
                   temperature='K', internalLength='m', time='s', energy='J',
                   beamDiameter='1/e2-intensity'),
        resolvedPhysics=dict(conduction=True, transient=transient, latentHeat=transient,
                             momentum=False, freeSurface=False, evaporation=False),
        evidenceClass='unvalidated-model')


def enforce_core_contract(result):
    """Validate present bindings, leaving true legacy absence unmodified."""
    if 'coreContract' not in result:
        return
    try:
        expected = build_core_contract(result['settings'], result['material'],
                                       result['solver']['id'], result['effectiveMode'])
        # JSON comparison also rejects booleans/numbers that Python equates.
        if _encoded(result['coreContract']) != _encoded(expected):
            raise ValueError('LPBF core contract identity mismatch')
    except (KeyError, TypeError, ValueError, OverflowError) as error:
        raise ValueError(f'LPBF core contract invalid: {error}') from error
