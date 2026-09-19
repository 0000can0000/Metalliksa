# HANGAR BİGG Başvuru Taslağı — Metalliksa

> Durum: İlk taslak / başvuru formuna aktarılmadan önce ekip bilgileri ve müşteri görüşmeleri ile tamamlanmalıdır.
> Tarih: 2026-09-20

## 1. İş fikrinin kısa adı

**Metalliksa — Havacılıkta eklemeli imalat için fizik tabanlı proses zekâsı ve dijital ikiz platformu**

## 2. Tek cümlelik tanım

Metalliksa, lazer toz yataklı ergitme (LPBF) süreçlerinde üretim kusurlarını önceden tahmin etmek, proses penceresini optimize etmek ve üretim sonrası doğrulamayı hızlandırmak için fizik tabanlı simülasyon, yapay zekâ ve dijital ikizi tek bir mühendislik platformunda birleştirir.

## 3. Çözdüğümüz problem

Havacılık ve savunma parçalarında LPBF üretim kararları; lazer gücü, tarama hızı, hatch aralığı, katman kalınlığı, malzeme ve geometri arasındaki karmaşık etkileşimlere bağlıdır. Kusurlar çoğu zaman üretimden sonra CT, metalografik inceleme veya mekanik testlerle fark edilir. Bu yaklaşım:

- deneme-yanılma sayısını ve malzeme israfını artırır,
- kritik parçaların üretim süresini uzatır,
- porozite, lack-of-fusion, keyhole ve termal distorsiyon risklerinin erken yönetilmesini zorlaştırır,
- simülasyon, üretim ve deney sonuçlarının izlenebilirliğini parçalı hâle getirir.

## 4. Çözüm

Metalliksa; proses girdilerini, CAD/STL geometrisini, termal geçmişi, kusur göstergelerini ve deneysel kanıtları izlenebilir bir iş akışında birleştirir.

İlk ürün odağı:

1. LPBF proses parametrelerinden termal ve kusur-risk haritası üretmek.
2. Tarama kinematiği ve çoklu lazer etkileşimlerini analiz etmek.
3. CAD/STL geometriyi voksel tabanlı dijital ikize dönüştürmek.
4. Keyhole ve lack-of-fusion gibi riskleri parça koordinatlarına taşımak.
5. Enerji birikimi ve hotspot bölgeleri için lazer güç kompanzasyonu önermek.
6. Sonuçları deneysel veri, CT/EBSD ve NIST AM-Bench izlenebilirliği ile karşılaştırmaya hazır biçimde raporlamak.

## 5. Yenilikçi yön

Mevcut çözümler genellikle yalnızca simülasyon, yalnızca proses izleme veya yalnızca kalite kontrol katmanına odaklanır. Metalliksa’nın farklılaştırıcı yönü; fizik modelleri, hızlı vekil modelleri, optimizasyonu, takım yolu kinematiğini, kusur dijital ikizini ve kanıt/izlenebilirlik katmanını aynı ürün akışında birleştirmesidir.

Platform; üretim sonrası “kusur bulundu” raporundan önce, üretim öncesi “bu geometri ve proses penceresinde risk nerede oluşur?” sorusuna yanıt vermeyi hedefler.

## 6. Hedef kullanıcı ve ilk müşteri segmenti

### Birincil segment

- Havacılık ve savunma sanayii parça üreticileri
- Metal eklemeli imalat kullanan Ar-Ge ve üretim ekipleri
- LPBF makinesi ve proses geliştirme ekipleri

### İlk kullanım senaryosu

Bir havacılık parçası için üretimden önce proses penceresinin taranması; yüksek riskli bölgelerin, olası lack-of-fusion/keyhole alanlarının ve termal distorsiyon risklerinin raporlanması; ardından sınırlı sayıda fiziksel kupon veya parça ile doğrulama.

## 7. Çift kullanım potansiyeli

Savunma ve havacılıkta kritik metal parçaların daha az deneme ile, daha izlenebilir ve daha düşük hurda riskiyle üretilmesini sağlar. Aynı altyapı; enerji, medikal, otomotiv, uzay ve genel endüstriyel metal eklemeli imalat süreçlerine uyarlanabilir. Böylece savunma odaklı teknik yetkinlik, sivil üretim yazılımı olarak da ticarileştirilebilir.

## 8. Mevcut teknik hazırlık seviyesi

Metalliksa hâlihazırda çalışan bir araştırma mühendisliği yazılım prototipidir. Mevcut kapsamda:

- termal LPBF simülasyonu ve mühendislik iş akışı,
- Bayesian proses optimizasyonu ve GPU hızlandırmalı FNO vekil model yolu,
- takım yolu/galvo kinematiği ve enerji yoğunluğu hotspot analizi,
- yorulma ve kusur toleransı analizi,
- CAD/STL vokselizasyonu ve parça seviyesinde kusur uzamsal ikizi,
- çoklu lazer/plume etkileşimi için analiz,
- uyarlamalı ileri besleme lazer güç kompanzasyonu,
- kanıt, izlenebilirlik ve deneysel karşılaştırma kayıtları

bulunmaktadır.

Bu aşamadaki test ve yazılım doğrulamaları, ürünün deneysel olarak kalifiye edildiği veya üretime hazır olduğu anlamına gelmez. İlk ticarileştirme PoC’sinin amacı, seçilmiş bir müşteri prosesinde bağımsız ölçüm verisiyle sınırlı ve ölçülebilir bir kullanım senaryosunu doğrulamaktır.

## 9. İlk PoC ve başarı ölçütleri

### PoC kapsamı

Tek bir alaşım, tek bir LPBF makinesi/proses ailesi ve tek bir parça veya kupon geometrisi seçilecektir. Metalliksa aynı proses vektörünü simüle edecek; CT, metalografi veya melt-pool ölçümleri ile karşılaştırılacaktır.

### Başarı ölçütleri

- Kusur-risk bölgelerinin bağımsız ölçümle konum bazında karşılaştırılabilir olması.
- Proses parametre taramasının fiziksel deneme sayısını azaltacak bir aday pencere üretmesi.
- Termal/proses çıktılarının aynı girdilerle tekrarlanabilir olması.
- Her sonucun varsayım, veri kaynağı, belirsizlik ve doğrulama durumu ile birlikte raporlanması.
- Müşterinin karar sürecinde kullanabileceği kısa ve izlenebilir bir proses raporu oluşturulması.

## 10. Ticarileştirme modeli

İlk aşamada kurumsal pilot ve PoC hizmeti; sonrasında yıllık kurumsal yazılım lisansı, proses geliştirme modülleri ve doğrulama/entegrasyon hizmetleri.

Muhtemel ürün paketleri:

- **Screening:** hızlı proses penceresi ve kusur-risk taraması,
- **Engineering:** takım yolu, termal geçmiş, optimizasyon ve dijital ikiz,
- **Qualification Support:** deneysel veri, izlenebilirlik ve müşteri kalite raporları.

## 11. Rakiplere karşı yaklaşım

Metalliksa’nın ilk hedefi genel amaçlı tam fiziksel CFD yazılımlarını doğrudan ikame etmek değildir. Daha dar ve savunulabilir bir kullanım alanında; proses geliştirme ekiplerinin hızlı karar vermesini, riskli bölgeleri önceliklendirmesini ve deneysel doğrulama kayıtlarını tek akışta tutmasını sağlamaktır. Ürün, gerekli yerlerde sonucu “screening” veya “validation pending” olarak açıkça etiketler; bu yaklaşım havacılıkta güvenilirlik ve izlenebilirlik açısından kritik bir farklılaştırıcıdır.

## 12. HANGAR BİGG’den beklenen katkı

- TUSAŞ ve Teknopark Ankara altyapısında metal eklemeli imalat/karakterizasyon PoC erişimi
- Havacılıkta gerçek kullanıcı problemi ve teknik gereksinim doğrulaması
- Sertifikasyon, fikrî haklar, savunma-sanayii tedarik süreçleri ve pazara giriş mentörlüğü
- İlk müşteri ve pilot proje bağlantıları
- Patent taraması ve uygun fikrî mülkiyet stratejisi
- Ürünün kurumsal satın alma ve güvenlik gereksinimlerine hazırlanması

## 13. 13 haftalık program için hedefler

1. İlk müşteri segmenti ve kritik kullanım senaryosunu kesinleştirmek.
2. En az üç potansiyel kullanıcıyla problem görüşmesi yapmak.
3. Bir PoC ortağı, veri formatı ve başarı ölçütlerini netleştirmek.
4. Ürün kapsamını tek bir ödeme yapılabilir MVP’ye indirmek.
5. Fikri haklar ve rakip patent taramasını tamamlamak.
6. Pilot fiyatlama ve lisans modelini oluşturmak.
7. Demo Day için çalışan, sınırlı ama ölçülebilir bir gösterim hazırlamak.

## 14. 1.350.000 TL yatırımın ön kullanım planı

Bu tablo başvuru çağrısının güncel bütçe kuralları ve ekip maliyetleriyle son hâline getirilecektir.

| Kalem | Amaç | Öncelik |
|---|---|---|
| PoC ve deneysel doğrulama | Numune üretimi, CT/metalografi/ölçüm ve veri hazırlığı | 1 |
| Ürünleştirme | Kullanıcı akışı, raporlama, veri/izlenebilirlik ve güvenlik | 2 |
| GPU/hesaplama altyapısı | Simülasyon, vekil model ve optimizasyon çalıştırma kapasitesi | 3 |
| Fikri haklar | Patent taraması, başvuru ve hukuki danışmanlık | 4 |
| Pilot satış ve iş geliştirme | Müşteri görüşmeleri, saha PoC’si ve teknik satış materyali | 5 |

Not: Başvuruda doğrulanmamış personel maliyeti, müşteri sayısı, gelir veya performans rakamı yazılmamalıdır. Rakamlar ekip ve çağrı kuralları netleştirildikten sonra eklenmelidir.

## 15. 90 saniyelik sözlü sunum

Havacılıkta kritik metal parçaların eklemeli imalatında en pahalı hata, kusuru üretimden sonra fark etmektir. Lazer gücü, tarama hızı, malzeme ve geometri arasındaki etkileşimler; porozite, lack-of-fusion, keyhole ve distorsiyon risklerini artırabilir. Metalliksa bu problemi, fizik tabanlı LPBF simülasyonunu yapay zekâ, proses optimizasyonu ve parça seviyesinde dijital ikizle birleştirerek çözüyor. Kullanıcı, üretimden önce proses penceresini tarıyor, riskli bölgeleri görüyor ve hangi fiziksel denemelerin gerçekten gerekli olduğunu belirliyor. İlk PoC’miz tek bir havacılık alaşımı ve parça/kupon üzerinde, CT veya metalografi verisiyle bağımsız karşılaştırma yapacak. Hedefimiz genel bir simülasyon aracı olmak değil; havacılık üretim ekiplerinin daha az deneme, daha az hurda ve daha izlenebilir kalite kararı almasını sağlayan kurumsal proses zekâsı ürünü geliştirmek. HANGAR BİGG’den beklentimiz, bu yazılımı gerçek TUSAŞ/ekosistem kullanım senaryosunda doğrulamak, fikrî haklarını korumak ve ilk pilot müşterilere ulaşmaktır.

## 16. Başvuru öncesi doldurulacak alanlar

- Kurucu/girişimci adı, özgeçmişi ve uzmanlık alanları:
- Ekip üyeleri ve görev dağılımı:
- İlk müşteri/problem görüşmeleri:
- Kullanılabilir veri seti ve veri sahipliği:
- Seçilecek alaşım, makine ve PoC geometrisi:
- İlk hedef müşteri/kurum:
- Fikri hakların mevcut durumu:
- Başvuru formundaki güncel yatırım tutarı ve şartlar:
- İletişim bilgileri:

