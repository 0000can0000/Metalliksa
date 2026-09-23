# LPBF ortak çekirdek ve veri hattı uygulama planı

Durum: aktif goal. Başlangıç: `codex/lpbf-buildjob-material-identity`,
`a35499d` (23 Eylül 2026). Ana program çerçevesi
`DIGITAL_TWIN_MASTER_PLAN_2026-09-21.md`; güncel sınırlar
`LPBF_SHARED_CORE_CONTRACT.md`, `LPBF_CORE_BASELINE_2026-09-21.md` ve
`STATUS.md` içindedir. Bu belge tamamlanmış paketleri yeniden açmadan kalan
işlerin yürütme sırasını ve çıkış kapılarını tanımlar.

## Bitiş tanımı

Yerel uygulamada kaynaklı bir IN718 deney/senaryo kaydı seçilir; eksik koşullar
görünür; sürümlü malzeme ve model kimliğiyle CPU termal hesap çalıştırılır;
uygun eşlenmiş ölçümlerle ayrı bir karşılaştırma raporu üretilir; çalıştırma,
kaynak revizyonu ve tüm çıktı baytları dışa aktarılıp bağımsız dizine geri
yüklenir. Aynı sınırlandırılmış termal problem açıkça seçilen GPU cihazında
çalışır ve önceden dondurulmuş CPU/GPU sayısal karşılaştırma kapısından geçer.
Dört mevcut alaşım için model yeterlilik ve veri boşluğu matrisi yayımlanır;
en az bir yeni alaşım (öncelik IN625) kaynaklı özellik ve model veri kapısından
geçerek desteklendiği yeteneklerde kullanılır. Başarısız bilimsel kapı başarılı
gibi etiketlenmez.

## Paketler ve bağımlılıklar

| Paket | İş | Bağımlılık | Çıkış kanıtı |
| --- | --- | --- | --- |
| P0 | Güncel kaynak ve kanıt çizgisi | Yok | UI→API→worker→solver→malzeme→test haritası; mevcut/eksik kabul kanıtları ve interpreter/backend kaydı |
| P1 | Build-job özellik snapshot kimliği | P0 | Gerçekte kullanılan termal/slicer özellikleri, birimler, model/sürüm ve kanonik alaşım bir sürümlü içerik kimliğine bağlanır; alias ve cache davranışı doğrulanır |
| P2 | Malzeme otoritesi ve adaptör sınırları | P1 sözleşmesi | Dört alaşımın kaynak, özellik yasası, sıcaklık/birim ve model uygunluğu tek otorite üzerinden açıklanır; taşınan dönüşümler sayısal olarak eşleşir |
| P3 | Kaynak/run kalıcılığı ve uygulama API'si | P0, P1 | Tam snapshot, exact kaynak revizyonu, manifest ve bayt doğrulaması; çakışma/bozuk veri/legacy durumu; mevcut iş kuyruğu korunur |
| P4 | CPU termal sayısal kapısı | P2 | Analitik korunum ve sınır testleri; en az üç ağ ve üç zaman seviyesi; sonuç öncesi sabitlenmiş toleranslarla yakınsama raporu; OpenFOAM kapsamı açık |
| P5 | IN718 deney/ölçüm karşılaştırması | P3, P4 | Kaynak ve ölçüm operatörü, gerçek proses/geometri, tekrar grubu, belirsizlik ve kalibrasyon/holdout ayrımı bağlıdır; sonuç/eksik veri dürüstçe raporlanır |
| P6 | GPU termal eşleşmesi | P2, P4 | Açık cihaz seçimi, aynı fizik/girdi/boundary, CPU karşılaştırması, bağımsız analitik kontrol, enerji/alan metrikleri ve bellek/süre profili |
| P7 | Alaşım genişlemesi | P2, P4 | Dört alaşım yeterlilik matrisi; en az bir yeni alaşımın kaynaklı özellik revizyonu, sıcaklık kapsamı, model kabiliyeti ve ayrı sayısal kontrolleri |
| P8 | Bütünleşik ürün akışı | P3, P5, P6, P7 | Seç→hesapla→karşılaştır→dışa aktar→geri yükle; eski sonuç ve başarısız/eksik durumları görünür; gerçek tarayıcı/klavye kontrolü |
| P9 | Son entegrasyon kapısı | P0–P8 | İlgili Python/TypeScript/sayısal/tarayıcı kontrolleri; değişiklik kapsamı, kanıt ve sınırlamalar; STATUS/PROOF ve bitiş kararı |

## IN718 geometri karşılaştırmasının ön protokolü

P5 için aday gözlem, NIST AMB2022-03'ün çıplak IN718 levhada yedi tek iz
koşuluna ait optik kesit W/D ortalamalarıdır. Resmî sonuç belgesi Table 4 her
koşulda altı ölçümün ortalamasını ve standart sapmasını verir. Kaynak ölçüm
tanımı, belirtilen kesitte başlangıç levha yüzeyinden en büyük derinliği
ve kesitteki en büyük genişliği kullanır; model çıktısındaki başka bir genişlik
tanımı bunun yerine geçmez. Birincil pilotta bu yedi koşula sonuçlara bakarak
kalibrasyon yapılmayacak; hata ve ölçüm yayılımı koşul bazında raporlanacaktır.
Sonradan kalibrasyon yapılırsa koşul grupları ve holdout ayrımı önceden ayrı
bir protokol revizyonunda dondurulacaktır.

NIST yazarlarının sonraki [ölçüm yayını, s. 369 Tablo 4](https://link.springer.com/content/pdf/10.1007/s40192-024-00355-5.pdf)
bu altı ölçümü koşul başına üç tekrar iz × iz başına iki kesit olarak açıklar.
Challenge yöntemindeki P1–P4 kesilmiş levha parçası konumları, Tablo 4'ün
koşul başına dört ölçümü olduğu şeklinde yorumlanmamalıdır. Yerel agregat
transkripsiyon bireysel kesitleri veya görüntüleri içermez. Resmî NIST
[ölçüm çalışma kitabı](https://data.nist.gov/od/ds/ark:/88434/mds2-2718/AMB2022-718-SH1-MeltPool_Cross-Section_Measurement_Results.xlsx)
ayrı bayt kaynağı olarak arşivlendi (SHA-256
`2cfaac96aaca3dabb77b7029f842cdcc7e75c5a2cf3577d0734823246364a931`).
BP1 levhasındaki yedi koşulun her birinde üç iz × iki kesit vardır; ölçüm
konumları iz başlangıcından 4,9 ve 6,0 mm'dir. Bu 42 BP1 satırının örnek
ortalaması ve standart sapması, yedi koşulun yerel Tablo 4 transkripsiyonunu
0,1 µm yuvarlamada yeniden üretir; model/deney kıyası ayrı kapıda kalır.

Kıyas başlamadan modelin çıplak levha koşulunu, 4,9 ve 6,0 mm'deki ölçüm
kesitlerini ve
kaynağın `D4σ` ışın tanımını karşılayabildiği gösterilmelidir. Mevcut katalogda
yer alan 40 µm katman/110 µm hatch değerleri tek iz çıplak levha ölçümü değildir;
bu değerler eşleştirme için kullanılamaz. Uygun operatör yoksa kıyas durumu
`unavailable` olur. Ham termografi sıcaklığı bu W/D kaynağından türetilmez.

## Değişmez sözleşmeler

- `four_alloy_materials.py` mevcut dört alaşımın ortak malzeme otoritesidir.
  Modelin kullandığı özellik sıcaklığı, optik varsayımı ve birim dönüşümü
  sonucunda görünür kalır. Başka alaşımdan sessiz sabit aktarılmaz.
- Build-job `rosenthal-screening-v1`, transient referans ve termal OpenFOAM
  kimlikleri birbirinin bilimsel kanıtı sayılmaz. Özellik içerik hash'i bayt/
  içerik kimliğidir; deneysel doğrulama, kaynak güvenilirliği veya imza değildir.
- NIST IN718 ham kamera sinyali, doğrulanmış sıcaklık değildir. `D4σ` spot etiketi
  `1/e²` ışın çapına kanıtsız çevrilmez. Birincil dönüşüm/ölçüm tanımı eksikse
  o metrik için karşılaştırma unavailable kalır; uygun başka bağımsız ölçüm
  ancak kendi kaynak ve koşul eşleşmesiyle kullanılabilir.
- IN718 için ayrı geometri adayı, NIST AMB2022-03 optik mikroskopi tek iz W/D
  sonuçlarıdır ([resmî ölçüm tanımı](https://www.nist.gov/document/amb2022-03-measurement-and-challenge-descriptions-version-101),
  [resmî sonuçlar](https://www.nist.gov/document/am-bench-amb2022-03-measurement-and-result-descriptions-v10),
  veri DOI `10.18434/mds2-2718`). Bunlar çıplak levhada ölçülmüştür;
  mevcut `meltPoolLiteratureCases.ts` kaydındaki 40 µm katman ve 110 µm hatch
  değerleri deneyin ölçülmüş koşulu olarak kullanılamaz. Karşılaştırma operatörü
  yüzey referansı, en büyük kesit W/D, tekrar grubu ve ışın çapı tanımıyla
  önceden dondurulmalıdır.
- GPU işi eski Warp prototipini otomatik eşdeğer backend ilan etmez. İlk hedef,
  sınırlandırılmış aynı termal operatörün açık cihazlı uygulamasıdır. Eşdeğerlik
  toleransları sonuçlara bakılmadan kaydedilir; başarısız karşılaştırma saklanır.
- Yeni alaşım için kimlik/bileşim, kaynak ve proses durumu, gerekli sıcaklığa bağlı
  özellikler, geçerlilik aralığı, birimler ve desteklenen model ayrı kaydedilir.
  IN625 önceliklidir; kaynak/veri kapısı geçilmeden kullanıcıya hesap desteği
  açılmaz. İlk kabul termal modele özgü olabilir; build-job kararı, slicer,
  yorulma ve qualification kendi eksik özellik/veri kapıları geçilene kadar
  unavailable kalır. Mevcut IN718 varsayılanı yeni alaşıma uygulanmaz.
  [NIST AMB2018-02](https://www.nist.gov/ambench/amb2018-02-description) IN625
  çıplak levha deney kapsamını; [NIST kaynaklı bir model tablosu](https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=932570)
  bazı termofizik değerleri sağlar. Bu parçalı kaynaklar tek başına tam model
  uygunluğu veya deneysel doğrulama sayılmaz.
- Yazılım doğruluğu, sayısal doğrulama ve bağımsız deneysel geçerlilik ayrı
  raporlanır. Sentetik/solver verisi holdout ölçümü olarak kullanılamaz.

## Çok ajanlı yürütme

Ana ajan ortak sözleşmelerin, `STATUS.md` ve bu planın entegrasyon sahibidir.
En fazla üç alt ajan aynı anda çalışır. Başlamadan önce her paketin dosya
sahipliği ve dar kabul kontrolü `ACTIVE_WORK.md` içine yazılır. P1/P2 Python
malzeme hattı, P3 Node kayıt/API hattı ve P4 sayısal doğrulama ayrı dosyalarda
paralel ilerleyebilir; aynı ortak şema veya dosyada eşzamanlı yazma yapılmaz.
P5 kaynak/ölçüm işi P4 sonuçlarına göre, P6 GPU işi termal sözleşme sabitlenince,
P8 UI işi backend sözleşmesi hazır olunca açılır. Her paketin diff'i ve ilgili
kontrolü gözden geçirilir; yerel commit sonrası entegrasyon kapısı tekrar çalışır.
Kullanıcıya ara karar gerektirmeyen işlerde durulmaz. Bağlam değişiminde bu plan,
`STATUS.md`, Git durumu ve en son commit yeni görevin devam noktasıdır.

EIS/EDS ve diğer yan araştırma modülleri kapsam dışıdır. Push, yayın veya
canlı veri göçü bu planın bitiş koşulu değildir.
