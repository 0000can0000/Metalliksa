# Metalliksa Proje Durumu (STATUS)

*Bu dosya projenin anlık durumunu, tamamlanan entegrasyonları ve sıradaki hedefleri tutar.*

## 📌 Genel İlerleme Özeti
- **Python Fizik Motoru:** `ROADMAP.md`'ye göre Faz 1'den **Faz 21 (Transient Enthalpy-Method Phase-Change)** aşamasına kadar tüm analitik ve GPU (Warp) tabanlı fizik/simülasyon çekirdekleri yazılmıştır (`python/` dizini).
- **Backend (API) ve Frontend (UI) Entegrasyonları:** Çekirdek fizik motorlarının son kullanıcıya ve arayüze bağlanma süreci devam etmektedir. Yakın zamanda Faz 8, 9, 10 ve Faz 14 entegrasyonları tamamlanmıştır.

## 2026-09-22 - Build-job Alaşım Kimliği Güvenlik Onarımı
- Build-job solver artık açıkça gönderilen desteklenmeyen `alloyId` değerlerini IN718'e sessizce düşürmek yerine hata ile reddediyor; alaşım belirtilmemesi durumundaki geriye dönük IN718 varsayılanı korunuyor.
- `Inconel 625` için desteklenmeyen surrogate hesaplamayı engelleyen Python regresyonu eklendi.
- Doğrulama: TypeScript lint PASS; izole Python solver sözleşme testi PASS. Tam `test_lpbf_build_job.py` Windows ortamında çıktı vermediği için tamamlanmadan durduruldu.

## 2026-09-22 - Ortak LPBF Fizik API'si
- Build-job Python Phase 5 hızlı suite'i PASS; desteklenmeyen alaşım kimliği regresyonu dahil.
- Malzeme özellik interpolasyonu, entalpi tablosu ve mesh-domain çağrıları `lpbf_core_physics.py` ortak giriş noktası altında toplandı. Transient solver, OpenFOAM adaptörü ve kanıt denetimi bu API'yi kullanıyor; eski registry dışa aktarımları uyumluluk için kaldı.
- Doğrulama: engineering 26 PASS / 1 OpenFOAM atlandı; heat-source 7 PASS / 1 atlandı; core-contract 8 PASS. Derlenmiş OpenFOAM çalıştırması mevcut ortamda yok. Sayısal kontroller başarılı.
- Sıradaki adım: ortak core içindeki scan schedule ve cell-integrated source sınırını parity fixture'larıyla çıkarmak; solver kimliklerini ve frozen eşikleri korumak.

---

## 2026-09-22 - ML Veri Üretimi ve Meta-Model Genişletmesi
- Metalliksa kurallarına (sadece fiziksel temelli veriler) uygun olarak Ti-6Al-4V ve IN718 için grid-search tabanlı 1296 kombinasyonluk bir process map (`data/synthetic_process_map.csv`) üretildi (`python/generate_ml_dataset.py`).
- Faz 9 Surrogate Modeli, bu genişletilmiş fizik-tabanlı CSV verisini algılayıp rastgele verilerle birleştirerek hibrit, çok daha yoğun ve yüksek doğruluklu (OOD korumalı) bir eğitim süreci yürütecek şekilde güncellendi.
- **Sıradaki Adım (Production Readiness):** Geriye kalan "End-to-End CAD/Process Contract" (Faz 14 sonrası entegrasyonlar) veya Mekanik Tahmin Modellerinin (PINN ONNX) web için derlenmesi üzerinden ilerlemek.

## 2026-09-22 - Faz 14 UI ve STL Araçları
- Uygulama arayüzüne 3D Voxelization (hacimsel ayrıklaştırma) ve STL işleme araçları (Faz 14) entegre edildi. Git geçmişinde `feat: Add Phase 14 voxelization, STL tools and update UI` ile sabitlendi.

## 2026-09-21 - Faz 9 & 10 Arayüz Entegrasyonları
- AI Meta-Modelleri (Faz 9) ve Gumbel/Murakami Yorulma Ömrü (Fatigue - Faz 10) endpointleri, React UI tarafına bağlandı (`85f41b4`).
- Grup bazlı ayrılmış değerlendirme yapıldı ve modelin sınırları dışına (Out-of-Distribution) çıkıldığında sistemin anında "Confidence: 0.0" uyarısı vermesi sağlandı.

## 2026-09-21 - Faz 8 Hassasiyet ve Optimizasyon
- Backend'de yer alan `lpbf_bayesian_optimizer.py` modülü `server/lpbfWorkerBridge.ts` ve API üzerinden dışarıya açıldı. Optimum proses penceresi parametrelerinin arayışı yapılarak referans belgeler üretildi.
