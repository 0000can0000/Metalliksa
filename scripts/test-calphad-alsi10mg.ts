import { spawn } from 'node:child_process';

const payload = {
  name: "Custom AlSi10Mg",
  elements: { "Al": 89.65, "Si": 10.0, "Mg": 0.35 },
  unit: "wt_pct",
  tMin: 400.0,
  tMax: 700.0,
  tStep: 20.0
};

const py = spawn('python', ['python/calphad_solver.py', JSON.stringify(payload)]);

let stdout = '';
let stderr = '';

py.stdout.on('data', d => stdout += d.toString());
py.stderr.on('data', d => stderr += d.toString());

py.on('close', code => {
  if (code !== 0) {
    console.error("HATA:", stderr);
  } else {
    try {
      const res = JSON.parse(stdout);
      console.log('--- CALPHAD SONUCU (AlSi10Mg) ---');
      console.log(`Liquidus (Tamamen Sivi): ${res.liquidus_C?.toFixed(1) || 'Hesaplanamadi'} C`);
      console.log(`Solidus (Tamamen Kati):  ${res.solidus_C?.toFixed(1) || 'Hesaplanamadi'} C`);
      console.log(`Maksimum Isi Kapasitesi (Mushy Zone Cp): ${res.max_cp_J_kgK?.toFixed(1) || '-'} J/kg-K`);
      console.log(res);
    } catch (e) {
      console.log("Ham cikti:\n", stdout);
      console.log("Hatalar:\n", stderr);
    }
  }
});
