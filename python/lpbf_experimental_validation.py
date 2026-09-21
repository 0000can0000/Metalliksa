"""Descriptive LPBF metric comparison; never independent experimental validation."""
import math
import uuid
from datetime import datetime, timezone


def _number(value, name, positive=False):
    if type(value) not in (int, float):
        raise ValueError(f'{name} must be a finite number')
    try:
        valid = math.isfinite(value) and (value > 0 if positive else value >= 0)
    except OverflowError:
        valid = False
    if not valid:
        raise ValueError(f'{name} must be finite and {"positive" if positive else "nonnegative"}')
    return value


def _text(value, name):
    if not isinstance(value, str) or not value.strip() or len(value) > 2048:
        raise ValueError(f'{name} is required')
    return value


def validate_experiment(params: dict, material: dict, sim_result: dict, exp_data: dict) -> dict:
    if any(not isinstance(value, dict) for value in (params, material, sim_result, exp_data)):
        raise ValueError('Comparison requires explicit process, material, simulation and measurement objects')
    material_id = _text(material.get('id'), 'Material id')
    source = _text(exp_data.get('source'), 'Measurement source description')
    power = _number(params.get('laserPower_W'), 'Laser power', positive=True)
    speed = _number(params.get('scanSpeed_mms'), 'Scan speed', positive=True)
    metrics = []
    for key, label in (('pdas_um', 'Primary Dendrite Arm Spacing (PDAS)'),
                       ('keyhole_depth_um', 'Keyhole Depth')):
        if key not in sim_result and key not in exp_data:
            continue
        if key not in sim_result or key not in exp_data:
            raise ValueError(f'{key} requires both a simulation and a measured value')
        measured = _number(exp_data[key], f'Measured {key}', positive=True)
        simulated = _number(sim_result[key], f'Simulated {key}')
        absolute_error = abs(measured - simulated)
        relative_error = absolute_error / measured * 100
        if not math.isfinite(relative_error):
            raise ValueError('Comparison error exceeds finite numeric range')
        metrics.append(dict(metric=label, source=source, experimental=measured,
            simulated=simulated, unit='um', absolute_error_um=absolute_error,
            error_pct=relative_error, status='review'))
    if not metrics:
        raise ValueError('Comparison requires at least one paired metric')
    return dict(status='comparison-only', validationStatus='unvalidated', productionReady=False,
        traceability=dict(recordId=uuid.uuid4().hex,
            timestamp=datetime.now(timezone.utc).isoformat(), materialId=material_id,
            laserPower_W=power, scanSpeed_mms=speed, evidenceSource=source,
            sourceIntegrity='not-verified', recordScope='Transient comparison receipt; not a persisted validation record'),
        metrics=metrics, overallMatch='unknown',
        limitations=['Caller-supplied values and source description are not independently verified.',
            'No bound run/source revision, matched measurement operator or uncertainty assessment.',
            'Numerical agreement does not establish experimental validation or qualification.',
            'Relative error is descriptive; no acceptance threshold has been applied.'])
