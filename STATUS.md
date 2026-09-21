## 2026-09-21 - Faz 8 Tamamlandı: Hassasiyet ve Optimizasyon
- Backend'de yer alan lpbf_bayesian_optimizer.py modülü server/lpbfWorkerBridge.ts ve lpbf_worker.py üzerinden API endpointi olarak dışarıya açıldı.
- Bayesian Optimizer'ın dış sınır ve anlamsız (keyhole/lack-of-fusion) parametrelerde 0 skoru vererek hatalı bölgeden uzaklaştığını doğrulayan referans solver testleri (	est_phase8_optimization.py) yazıldı.
- IN718 ve Ti-6Al-4V için optimum proses penceresi parametrelerinin arayışı yapılarak docs/LPBF_OPTIMIZATION_BENCHMARK_2026-09-21.json çıktı dosyası üretildi.
- Sistemdeki tüm Python (pytest, 	est:lpbf, 	est:meltpool) ve TypeScript (	est:unit) birim testleri koşturularak sistem bütünlüğü garanti altına alındı.
