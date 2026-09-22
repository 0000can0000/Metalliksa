import { lpbfWorker as worker } from '../server/lpbfWorkerBridge';

async function main() {
  console.log('AlSi10Mg Literatur Testi Basliyor...');

  // Literaturden (ornek referans: Tang et al., veya genel AlSi10Mg parametreleri) 
  // P=300W, V=1000mm/s, Beam=80um, Layer=30um, Preheat=25C
  const request = {
    jobType: 'build-job',
    alloyId: 'alsi10mg',
    laserPower_W: 300,
    scanSpeed_mms: 1000,
    beamDiameter_um: 80,
    layerThickness_um: 30,
    hatchSpacing_um: 100,
    preheatTemp_C: 25,
    enableUq: false,
    includeAmbench: false,
    bypassCache: true,
    timeout_s: 300
  };

  console.log('Simulasyon gonderiliyor:', request);
  const submitResponse = await worker.request('submit', request) as { id: string };
  console.log('Job ID:', submitResponse.id);

  let job: any;
  for (let i = 0; i < 40; i++) {
    job = await worker.request('get', submitResponse.id);
    if (job.status === 'completed' || job.status === 'cancelled' || job.status === 'failed') break;
    await new Promise(r => setTimeout(r, 500));
  }

  if (job.status === 'completed') {
    const geom = job.result.thermal.meltPoolGeometry;
    console.log('--- SIMULASYON SONUCU (AlSi10Mg) ---');
    console.log(`Genislik (Width):  ${geom.width_um.toFixed(1)} um`);
    console.log(`Derinlik (Depth):  ${geom.depth_um.toFixed(1)} um`);
    console.log(`Uzunluk (Length):  ${geom.length_um.toFixed(1)} um`);
    console.log(`Peak Temp:         ${job.result.thermal.peakTemp_C.toFixed(1)} C`);
    console.log('------------------------------------');
    console.log('Bu degerler literatur (yaklasik genislik ~110-140 um, derinlik ~70-100 um) ile eger tutarsizsa, Phase 7 Kalibrasyonu (Sentetik Veri) gerekecektir.');
  } else {
    console.error('Job basarisiz:', job);
  }
}

main().catch(console.error);
