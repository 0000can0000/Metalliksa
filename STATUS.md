# Metalliksa Proje Durumu (STATUS)

*Bu dosya projenin anlık durumunu, tamamlanan entegrasyonları ve sıradaki hedefleri tutar.*

## 📌 Genel İlerleme Özeti
- **Python Fizik Motoru:** LPBF için analitik ve termal araştırma çözücüleri ile çeşitli simülasyon araçları içerir; kapsam ve doğrulama durumu modüle göre değişir.
- **Backend (API) ve Frontend (UI) Entegrasyonları:** Farklı olgunluktaki mühendislik modüllerinin API ve arayüz bağlantısı devam etmektedir; etkin durum ilgili kayıt ve kanıt belgelerinde izlenir.

---

## 2026-09-22 - ML Veri Üretimi ve Meta-Model Genişletmesi
- Metalliksa kurallarına (sadece fiziksel temelli veriler) uygun olarak Ti-6Al-4V ve IN718 için grid-search tabanlı 1296 kombinasyonluk bir process map (`data/synthetic_process_map.csv`) üretildi (`python/generate_ml_dataset.py`).
- Surrogate modeli, fizik tabanlı CSV verisini kullanarak eğitim yürütmek üzere güncellendi; model kapsamı ve kanıt durumu ilgili modül belgelerinde tutulur.
- **Sıradaki Adım:** End-to-End CAD/Process Contract entegrasyonunu veya mekanik tahmin modellerini web için derlemeyi değerlendirmek.

## 2026-09-22 - UI ve STL araçları
- Uygulama arayüzüne 3D Voxelization (hacimsel ayrıklaştırma) ve STL işleme araçları entegre edildi. Git geçmişindeki uygulama commit'i bu kapsamı kaydeder.

## 2026-09-21 - Arayüz entegrasyonları
- AI meta-modelleri ve Gumbel/Murakami yorulma ömrü endpointleri, React UI tarafına bağlandı (`85f41b4`).
- Grup bazlı ayrılmış değerlendirme yapıldı ve modelin sınırları dışına (Out-of-Distribution) çıkıldığında sistemin anında "Confidence: 0.0" uyarısı vermesi sağlandı.

## 2026-09-21 - Hassasiyet ve optimizasyon
- Backend'de yer alan `lpbf_bayesian_optimizer.py` modülü `server/lpbfWorkerBridge.ts` ve API üzerinden dışarıya açıldı. Optimum proses penceresi parametrelerinin arayışı yapılarak referans belgeler üretildi.
