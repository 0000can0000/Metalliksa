## 2026-09-21 - Sahte (Dummy) Fizik Motorlarının Temizlenmesi
- Kullanıcı talimatı ile (Engelle ve yeniden yaz) LPBF dışındaki tüm modüllerdeki dummy ve PRNG (random) üreten mekanizmalar tamamen devre dışı bırakıldı.
- Frontend (TS): pythonComputationService, uqLabData, monteCarloEngine, tafelParser ve eisFileParser içinde Math.random ve noise ekleyen sahte bloklar silinerek NotImplementedError ve strict hata fırlatıldı.
- Backend (Python): marangoni_pore_instability_solver.py, powder_packer.py, powder_bed_raytracer.py, stochastic_uq_mmpds_solver.py (Sobol QMC harici), inverse_alloy_optimizer.py ve cnls_fitting_solver.py (DE Auto-Fit) içindeki uydurma veri/optimizasyon yapıları tamamen bloke edildi.
- Sonraki adım: Testlerin durumunu kontrol etmek ve bilimsel deterministik (gerçek) hesaplama yapılarını kurmaya başlamak.
