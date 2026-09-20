import sys
import os
import json
import subprocess
from pathlib import Path

def test_keyhole_raytracing():
    worker_script = Path(__file__).parent / "lpbf_worker.py"
    
    payload = {
        "nx": 64,
        "ny": 64,
        "dx": 2e-6,
        "dy": 2e-6,
        "power_W": 250.0,
        "beam_radius_um": 50.0,
        "base_absorption": 0.3
    }
    
    request = {
        "id": "test-phase26-raytracing",
        "method": "keyhole-raytracing",
        "payload": payload
    }
    
    try:
        proc = subprocess.Popen(
            [sys.executable, str(worker_script)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout_data, stderr_data = proc.communicate(json.dumps(request) + "\n", timeout=10)
        
        response = None
        for line in stdout_data.split('\n'):
            if not line.strip(): continue
            try:
                msg = json.loads(line)
                if 'id' in msg and msg['id'] == 'test-phase26-raytracing':
                    response = msg
                    break
            except json.JSONDecodeError:
                pass
                
        assert response is not None, "No valid response from worker"
        assert "error" not in response, f"Worker returned error: {response.get('error')}"
        
        data = response["data"]
        assert data["status"] == "success"
        assert "total_absorbed_W" in data
        assert "absorption_efficiency" in data
        assert 0.0 <= data["absorption_efficiency"] <= 1.0
        
        print(f"PASS: Keyhole Ray Tracing (Efficiency = {data['absorption_efficiency']:.2%})")
        
    except Exception as e:
        print(f"FAIL: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_keyhole_raytracing()
