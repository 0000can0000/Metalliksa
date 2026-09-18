import uuid
from datetime import datetime, timezone

def validate_experiment(params: dict, material: dict, sim_result: dict, exp_data: dict) -> dict:
    traceability_id = uuid.uuid4().hex
    timestamp = datetime.now(timezone.utc).isoformat()
    
    metrics = []
    if 'pdas_um' in exp_data and 'pdas_um' in sim_result:
        exp_val = float(exp_data['pdas_um'])
        sim_val = float(sim_result['pdas_um'])
        error = abs(exp_val - sim_val)
        mape = (error / max(exp_val, 1e-9)) * 100
        metrics.append({
            'metric': 'Primary Dendrite Arm Spacing (PDAS)',
            'source': 'EBSD',
            'experimental': exp_val,
            'simulated': sim_val,
            'unit': 'um',
            'error_pct': mape,
            'status': 'pass' if mape < 15.0 else 'review'
        })

    if 'keyhole_depth_um' in exp_data and 'keyhole_depth_um' in sim_result:
        exp_val = float(exp_data['keyhole_depth_um'])
        sim_val = float(sim_result['keyhole_depth_um'])
        error = abs(exp_val - sim_val)
        mape = (error / max(exp_val, 1e-9)) * 100
        metrics.append({
            'metric': 'Keyhole Depth',
            'source': 'CT',
            'experimental': exp_val,
            'simulated': sim_val,
            'unit': 'um',
            'error_pct': mape,
            'status': 'pass' if mape < 20.0 else 'review'
        })
        
    overall = 'unknown'
    if len(metrics) > 0:
        overall = 'high' if all(m['status'] == 'pass' for m in metrics) else 'moderate'

    return {
        'status': 'validated',
        'traceability': {
            'recordId': traceability_id,
            'timestamp': timestamp,
            'materialId': material.get('id', 'unknown'),
            'laserPower_W': params.get('laserPower_W', 0),
            'scanSpeed_mms': params.get('scanSpeed_mms', 0),
            'evidenceSource': exp_data.get('source', 'user_input')
        },
        'metrics': metrics,
        'overallMatch': overall
    }