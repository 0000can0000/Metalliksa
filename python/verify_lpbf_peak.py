"""Run real thermal backends and export a reproducible, non-experimental study."""
import json
from pathlib import Path
import tempfile
import numpy as np
from lpbf_simulation import validate, transient
from lpbf_openfoam import thermal


def verify_field(result, folder, m):
    d = result['numericalDiagnostics']
    assert d['meltPoolObservedSteps'] == result['discretization']['steps']
    path = Path(folder)/'peak-field.npz'
    if result['metrics']['volume_um3'] == 0:
        assert not path.exists() and d['peakMeltTime_s'] is None
        return
    with np.load(path) as f:
        xyz, t, dx = f['coordinates_m'], f['T_K'], float(f['mesh_m'])
        mask = (t >= m['liquidus_K']) & (xyz[:, 2] < f['surface_m'])
        np.testing.assert_array_equal(f['active'], xyz[:, 2] < f['surface_m'])
        np.testing.assert_allclose(f['liquid_fraction'], np.clip((t-m['solidus_K'])/(m['liquidus_K']-m['solidus_K']),0,1)*f['active'])
        # Explicit cube corners: independent oracle for projected cell extents.
        corners = xyz[mask, None, :] + np.array([[x,y,z] for x in (-.5,.5) for y in (-.5,.5) for z in (-.5,.5)])[None,:,:]*dx
        c, s = np.cos(np.deg2rad(f['scanAngle_deg'])), np.sin(np.deg2rad(f['scanAngle_deg']))
        expected = dict(volume_um3=int(mask.sum())*dx**3*1e18,
                        length_um=np.ptp(corners[:,:,0]*c+corners[:,:,1]*s)*1e6,
                        width_um=np.ptp(-corners[:,:,0]*s+corners[:,:,1]*c)*1e6,
                        depth_um=(f['surface_m']-corners[:,:,2].min())*1e6)
        for key, value in expected.items():
            np.testing.assert_allclose(result['metrics'][key], value, rtol=1e-10)
        assert float(f['time_s']) == d['peakMeltTime_s']
        assert int(f['step']) == d['peakMeltStep']


def study(output):
    base = dict(power_W=40, mesh_um=40, trackLength_um=200, cooling_s=.0001, dwell_s=0)
    cases = [('single', {**base, 'maxDt_s': dt}) for dt in (1e-6, 5e-7, 2.5e-7)]
    cases += [('rotated-multilayer', {**base, 'power_W': 30, 'layers': 2, 'scanAngle_deg': 35, 'layerRotation_deg': 67}),
              ('no-melt', {**base, 'power_W': 10})]
    rows = []
    for name, raw in cases:
        p, m = validate(raw)
        pair = []
        for backend, solver in [('reference', transient), ('openfoam', thermal)]:
            with tempfile.TemporaryDirectory() as tmp:
                r = solver(p, m, artifact_dir=tmp)
                verify_field(r, tmp, m)
            row = dict(case=name, backend=backend, settings=raw, metrics=r['metrics'],
                       diagnostics=r['numericalDiagnostics'], discretization=r['discretization'],
                       energyRelativeError=r['energyBalance']['relativeError'])
            rows.append(row); pair.append(r)
            print(name, backend, p['maxDt_s'], r['metrics']['volume_um3'], r['discretization']['steps'], flush=True)
        for key in ('length_um', 'width_um', 'depth_um', 'volume_um3', 'crossSectionArea_um2'):
            np.testing.assert_allclose(pair[0]['metrics'][key], pair[1]['metrics'][key], rtol=1e-8, atol=1e-8)
        assert abs(pair[0]['metrics']['peakTemperature_K']/pair[1]['metrics']['peakTemperature_K']-1) < .01
    Path(output).write_text(json.dumps(dict(scope='Numerical extraction/backend comparison only; no mesh or experimental validation', results=rows), indent=2)+'\n')


if __name__ == '__main__':
    import sys
    study(sys.argv[1])
