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

## 2026-09-23 - Ortak LPBF Scan Schedule Çıkarımı
- `scan_segments` uygulaması `lpbf_core_physics.py` içine taşındı; `lpbf_simulation.scan_segments` eski import yolu olarak korunuyor. OpenFOAM, CFD, evidence ve test çağrıları geriye dönük uyumlu.
- Doğrulama: Windows Python 3.12 üzerinde `test_lpbf_core_contract` + `test_lpbf_engineering`: 33 PASS, gerçek OpenFOAM testi Windows worker gereksinimi nedeniyle SKIP. OpenFOAM 14 bağımsız parity testi Ubuntu 22.04 WSL'de ayrıca PASS. Tarama rotasyonu/dwell, stripe/island zamanlaması, enerji, entalpi ve solver sözleşmesi kontrolleri geçti.
- Commit: `b44210f` (`codex/lpbf-shared-core`). Sıradaki somut adım: hücre-integralli ısı kaynağı sınırını ayrı bir seam olarak çıkarmak.

## 2026-09-23 - Ortak LPBF Hücre-İntegralli Isı Kaynağı
- Gaussian hücre integrali, hücre ağırlıkları ve hareketli kaynak quadrature'ı `lpbf_core_physics.py` içine taşındı. `lpbf_heat_source` eski fonksiyon/sabit adlarını dışa aktarmaya devam ediyor; timestep sınırlayıcı ve iletim operatörü orada kaldı. Solverlar model kimliği `cell-integrated-gaussian-gl2-v1` değerini doğrudan ortak çekirdekten alıyor.
- Doğrulama: Windows Python 3.12'de core-contract + engineering + heat-source toplam 40 PASS / 2 Linux/OpenFOAM SKIP. Ubuntu 22.04 WSL'de OpenFOAM 14 parity testi ve ısı-kaynağı grubu 8/8 PASS.
- Commit: `2a53597` (`codex/lpbf-shared-core`). Sıradaki somut adım: ortak material authority ve SI/material adapter sınırını kaynak/caller kapsamıyla planlamak.

## 2026-09-23 - LPBF Malzeme Revizyon Kimliği
- Ortak registry'nin yeni malzeme snapshot'ları alaşım kimliği, açık provenance sınıfı, kimlik şema sürümü ve özellik içeriğinden türetilen SHA-256 revizyon özeti taşıyor. Mevcut `coreContract` tam malzeme nesnesini zaten bağlıyor; eski hash'siz kayıtlar okunabilir kalıyor.
- Hash içerik bütünlüğü/kimliği sağlar, bilimsel doğrulama veya kaynak güvenilirliği sağlamaz. Legacy özellikler `estimated-legacy`, kullanıcı tabloları `user-supplied-unverified` olarak etiketleniyor. Tedarik edilmiş snapshot'lardaki kimlik metadata'sı yeniden hesaplanıyor ve güvenilmiyor.
- Doğrulama: Windows Python 3.12'de core-contract + engineering + heat-source 44 PASS / 2 platforma özel SKIP. OpenFOAM 14 bağımsız parity testi Ubuntu 22.04 WSL'de PASS.
- Sıradaki somut adım: material authority ve SI/material adapter sınırını kaynak/caller kapsamıyla planlamak; EIS/EDS kapsam dışı kalıyor.

## 2026-09-23 - Ortak Termal SI Girdileri
- Kelvin preheat, metre cinsinden katman kalınlığı, m/s tarama hızı ve absorbe edilmiş lazer gücü dönüşümleri `thermal_si_inputs()` ile ortak çekirdeğe alındı. Referans transient solver ve termal OpenFOAM case üreticisi bu değerleri paylaşıyor; analitik tarama ve ayrı CFD modeli kapsam dışı.
- Doğrulama: Windows Python 3.12'de core-contract + engineering + heat-source 45 PASS / 2 platforma özel SKIP. WSL OpenFOAM 14 bağımsız parity testi PASS.
- Sıradaki somut adım: kalan adapter alanlarını (özellikle katman/beam geometri dönüşümleri) ancak birebir parity kanıtıyla değerlendirmek; EIS/EDS kapsam dışı.

## 2026-09-23 - Build-job Alaşım Eşleşmesi ve Cache Sözleşmesi
- Build-job ön yüzü yalnızca dört kilit alaşım için tam ad/alias allowlist'i kullanıyor ve specimen `baseMetal` alanıyla tutarlılığı denetliyor. CoCrMo, bilinmeyen, boş, çelişkili/bileşik, base-metal çatışmalı ve prototype adları reddediliyor; desteklenmeyen malzeme için 316L/IN718 literatür grafiği veya demo vektörü gösterilmiyor ve önceki job/UQ/NIST durumu temizleniyor.
- Python build-job API'si açık `alloyId` ile uyumsuz termal/slicer override'larını cache erişiminden önce reddediyor. Aynı alaşımın geçerli alias'ları solver'a kanonik adla gidiyor ve cache anahtarı kanonik kimliğe göre oluşturuluyor. Eksik/boş `alloyId` için mevcut IN718 varsayılanı korunuyor.
- Doğrulama: `python/test_lpbf_build_job.py` PASS; `tests/lpbf-build-session.test.ts` 8/8 PASS; `npm run lint` PASS. Prototype-property (`constructor`) ve eski cache hit regresyonları kapsandı.
- Sıradaki somut adım: worker sonucundaki `material.id` alanını ham istek yerine çözümlenmiş kimliğe bağlamak ve build-job'un fiilen kullandığı özellik snapshot'ı için ayrı, doğrulanabilir bir içerik kimliği tasarlamak. Bu hash deneysel doğrulama/provenance kanıtı sayılmayacak.

## 2026-09-23 - Build-job Worker Sonuç Kimliği
- Worker'ın `material.id` alanı artık ham `alloyId` isteği yerine solver'ın çözdüğü `alloyId` değerinden geliyor. Başarısız, çözümlenmemiş istekte alan `null` kalıyor.
- Doğrulama: Gerçek `lpbf_worker.py --execute` yolunda alias `Ti-6Al-4V` → `ti6al4v`, eksik alaşım → `in718`, desteklenmeyen `Inconel 625` → başarısız sonuç ve boş `material.id`. `git diff --check` PASS.
- Kod commit'i: `6f6c007` (`codex/lpbf-buildjob-material-identity`). Sıradaki somut adım: build-job'un fiilen kullandığı termal/slicer özellik snapshot'ı için ayrı içerik kimliğini tasarlamak; hash'i deneysel doğrulama veya provenance kanıtı olarak sunmamak. EIS/EDS kapsam dışı.

## 2026-09-23 - Geniş LPBF Goal Başlangıcı
- Kullanıcı ortak LPBF çekirdek/veri hattı hedefini GPU termal CPU eşleşmesi ve veri kapılı alaşım genişlemesiyle birlikte yetkilendirdi. Aktif yürütme planı `docs/LPBF_GOAL_EXECUTION_PLAN_2026-09-23.md`; goal kimliği `01a0cfbf-d2ad-7f70-b94f-b89183eb819c`.
- Salt okunur sınır incelemeleri build-job özellik/cache kimliği, run istemci/sunucu tür uyuşmazlığı ve eski Warp akış modelinin CPU entalpi-iletiminden farklı olduğunu doğruladı. Bağımsız Python malzeme, run istemcisi ve CPU yakınsama paketleri çalışıyor; dosya sahipliği `docs/ACTIVE_WORK.md` içinde.
- Plan/koordinasyon commit'i: `15a6ec8`. Kontrol: belge diff ve `git diff --check` PASS; bu plan paketinde solver veya ürün testi çalıştırılmadı. Sıradaki adım: üç bağımsız paket diff/kanıtlarını entegre etmek, ardından aynı termal sözleşmeye sahip GPU ve kaynaklı IN625 veri kapılarını açmak. Dışarıdan gelen belge değişiklikleri korunuyor; EIS/EDS kapsam dışı.

## 2026-09-23 - Geniş LPBF Goal Ara Kapısı
- CPU referans yakınsama harness'i 3 ağ + 3 zaman seviyesi, fiilî çözünürlük ve model/malzeme kimliği kapılarıyla eklendi (`94ddf92`). 8 odaklı kontrol PASS; gerçek IN718 pilotunda enerji kapanışı yaklaşık `3.05e-14`, eriyik W/D yakınsaması `inconclusive`. Bu deneysel doğrulama veya tamamlanmış P4 kapısı değildir.
- Dört alaşımın model yeterlilik matrisi ve IN625 için yalnız −18…982 °C katı-bulk `k(T)`/`Cp(T)` kaynak tablosu eklendi (`76d5506`); 2 kontrol PASS. Sıvı/yüksek sıcaklık ve optik veri eksikleri nedeniyle IN625 tam LPBF hesabına açılmadı.
- NIST AMB2022-03 IN718 optik yedi tek iz ölçümü çıplak levha ve D4σ olarak işaretlendi; toz katmanı/hatch takma değerleri kaldırıldı, uygunsuz karşılaştırma kapatıldı. 3B uzman laboratuvarı erişilebilir hale geldi (`246904c`); 2 regresyon ve TypeScript kontrolü PASS, gerçek tarayıcıda yedi vaka `Bare-plate model unavailable` olarak görüldü. Tablo 4 standart sapma aktarımı üzerinde çalışma sürüyor.
- NIST Table 4 yedi koşulun ortalama/standart sapma/n=6 verisi katalogda (`3376300`); odaklı test ve gerçek tarayıcı görünümü geçti. Bunlar yalnız ölçümdür, model kıyası değildir.
- Etkin build-job özellik snapshot'ı, SHA/cache/UQ ve ayrı IN625 AM-Bench screening snapshot kimliğiyle bağlandı (`887e398`); tam Python build-job testi PASS, gerçek UQ ve üç vakalık AM-Bench yolunda SHA görüldü. Hash bilimsel onay değildir.
- Açık `cuda:N` termal pilotu CPU ile aynı sınırlı problemi çözüyor (`37a56cd`); RTX 4060 pilotunda son 3B alan, enerji ve W/D paritesi kapıları geçti, 3 kontrol PASS. Ürün backend kaydı sürüyor; eski Warp modeli eşdeğer sayılmıyor.
- Exact kaynak revizyonlu run servisi (`b3292ee`) ve kaynak seçimi UI'si (`0daa456`) entegre edildi; sunucu ve istemci odaklı kontroller 7 ve 15 PASS. Sunucu-yerel bundle export/verify/izole restore API'si (`258032f`) 11 odaklı testte PASS. Bundle UI entegrasyonu sürüyor.
- Çıplak levha CPU modu ve +X iz ortası ever-liquidus W/D termal kesit operatörü (`f4e5ba0`) 13 ilgili testte PASS (1 platform SKIP); 3 ağ/3 zaman pilotunda enerji kapısı geçti, W/D yakınsaması `inconclusive`. NIST 10 mm izi, gerçek ışın profili ve dört optik kesit ortalaması çözülemediği için deney karşılaştırması `unavailable`; P4/P5 bilimsel kabulü açık.
- Sıradaki somut adım: GPU kuyruk adapterini ve bundle UI'sini entegre etmek; IN625 kaynak/model veri kapısını sonuçlandırmak; sonra birleşik sayısal/tarayıcı kontrolleriyle P4–P9 bitiş kararı vermek. Dış belge değişiklikleri korunuyor; EIS/EDS kapsam dışı.

## 2026-09-23 - LPBF Goal Kaynak ve GPU Kuyruk Entegrasyonu

- Sunucu-yerel run bundle arayüzü (`2c5b78f`) ve IN625 erime aralığıyla sınırlı entalpi taraması (`a221466`) eklendi. IN625 tam transient ve build-job desteği hâlâ kapalı; doğrudan melt-pool hesabındaki bilinmeyen malzemenin IN718'e sessiz düşmesi `3fe675a` ile giderildi.
- Ayrı `gpu-thermal-pilot` iş türü mevcut kuyruğa bağlandı (`98c33aa`). Açık `cuda:0` ile gerçek RTX 4060 kuyruk sonucu CPU paritesi PASS: son alan L2 bağıl farkı `2.10e-9`, azami bağıl fark `3.10e-9`, erime hacmi farkı sıfır. Python kuyruk/parite/worker 7 PASS; HTTP 1 PASS. Bu yalnız sınırlı tek iz, tek katman, toz katmanlı sayısal pilottur; kaynak integrali CPU'da, termal evrim CUDA'dadır. Arşiv yakalama ve üretim/deney geçerliliği unavailable.
- NIST AMB2022-03 optik Table 4'ün yedi koşulu yerel transkripsiyon olarak exact byte/SHA manifestiyle kaynak kataloğuna alındı (`34bd387`). Yayıncı ham dosyası/PDF olarak etiketlenmiyor. Kaynak önizleme/içe aktarma HTTP, bozuk hash ve eski revizyon testleri dâhil 5 odaklı test PASS; TypeScript lint PASS; ajan Chrome klavye görünümünü doğruladı. Kaynak kullanım şartları bilinmiyor olarak gösteriliyor. Ölçümle model kıyası ayrı kapıda açık.
- NIST optik karşılaştırma kapısı (`dffa0e5`) exact kaynak revizyonu/document SHA, yerel Tablo 4 içeriği, 10 mm +X çıplak levha, gerçek D4σ profil kanıtı, altı kesitlik optik operatör ve bağımsız 3+3 yakınsama olmadan sayısal hata üretmiyor. Beş Python testi PASS; gerçek 200 µm bare-plate pilotu `unavailable`, `errors:null`. Sentetik pozitif şema yalnız kapı mantığını sınar, deneysel başarı kanıtı değildir. Arşiv/API bağlantısı sürüyor.
- Yeni gerçek IN718 yakınsama denemesinde 60 W, üç ağ [45,30,20] µm ve üç zaman [4e-7,2e-7,1e-7] s: enerji kapanışı azami yaklaşık `3.03e-14`, fakat kaba ağda erime yok ve zaman boyunca ayrık W/D aynı. Dolayısıyla P4 `inconclusive`; NIST karşılaştırması da henüz `unavailable`.
- Sıradaki somut adım: GPU pilotu ayrı UI türüyle sunmak; kaynak revizyonuna bağlı NIST karşılaştırma raporunu entegre etmek; ardından P2/P4/P7 bilimsel kapıları ile birleşik P8/P9 kontrolünü sürdürmek. Dış dosya değişiklikleri korunuyor.

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

## 2026-09-23 - Frontend İngilizce Arayüz Metinleri
- Industrial Certification, Toolpath Thermal Map ve AI Orchestrator ekranlarındaki Türkçe kullanıcı metinleri İngilizceye çevrildi; Toolpath Thermal Map gezinme açıklaması da güncellendi.
- Doğrulama: `src/components` ve ilgili arayüz metadata'sında Türkçe karakter/ifade taraması yapıldı; kalan eşleşmeler yorum satırları veya bilimsel özel adlar. `git diff --check` PASS. Gerçek tarayıcı kontrolü yapılmadı.
- Kod değişiklikleri: `IndustrialCertificationLab.tsx`, `ToolpathThermalMapLab.tsx`, `AIOrchestratorPanel.tsx`, `workspaces.ts`.
