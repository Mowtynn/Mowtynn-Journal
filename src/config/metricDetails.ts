import { MetricDetail } from '../components/MetricDetailModal';
import { Target, TrendingUp, TrendingDown, Activity, AlertTriangle, ShieldCheck, Zap, Scale, LayoutDashboard, Calendar, LineChart, Hash, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

export const metricDetailsDict: Record<string, Omit<MetricDetail, 'value' | 'id'>> = {
  // DeepAnalysis
  totalTradeCount: {
    title: 'Toplam İşlem Sayısı',
    description: 'Sisteme kaydedilmiş, sonuçlanmış olan tüm pozisyonların sayısı',
    type: 'info',
    icon: Hash,
    details: [
      'Geniş bir işlem örneği, istatistiksel güvenilirliğinizi artırır.',
      'Sadece kapanmış işlemler üzerinden hesaplama yapıldığı için risk/kazanç oranı ve karlılık net bir şekilde analiz edilebilir.'
    ]
  },
  winRate: {
    title: 'Kazanma Oranı (WR)',
    description: 'Kârla kapanan işlemlerin toplam kapanan işlemlere oranıdır. Sistemin ne sıklıkla doğru tahmin yaptığını gösterir.',
    formula: '(Kazanan İşlem Sayısı / Toplam İşlem Sayısı) × 100',
    type: 'neutral',
    icon: Target,
    details: [
      '%50 altı kazanma oranı, konseptnin zayıf olduğu anlamına gelmez, yüksek kazanç katsayısıyla desteklenebilir.',
      '%70 üzeri kazanma oranları genellikle küçük kazanç, büyük kayıp riskleri taşıyabilir (skalping vs.).'
    ]
  },
  cumulativeR: {
    title: 'Kümülatif Kazanç Oranı (R)',
    description: 'Tüm işlemlerin risk çarpanı (R) cinsinden toplam sonucudur. Eğer hedef R 2 ise ve vurulduysa +2 eklenir. Stop olunduysa -1 düşülür.',
    formula: 'Σ (İşlem Net Kazanç R) = (Kazanılan R Toplamı) - (Kaybedilen R Toplamı)',
    type: 'positive',
    icon: TrendingUp,
    details: [
      'Risk/Ödül konseptsinin sürdürülebilirliğini net olarak ifade eder.',
      'Pozitif kalması, uzun vadede konseptnin kârlı büyüyeceğini gösterir.'
    ]
  },
  pureProfitFactor: {
    title: 'Kâr Faktörü (Profit Factor)',
    description: 'Brüt kârın brüt zarara bölünmesiyle elde edilen kârlılık rasyosudur. Konseptnin verimliliğini değerlendirmek için ideal metriktir.',
    formula: 'Toplam Brüt Kâr / Toplam Brüt Zarar (Matematiksel Mutlak Değeri ile)',
    type: 'info',
    icon: Scale,
    details: [
      'Değer < 1: Konsept genel olarak para kaybediyor.',
      'Değer 1.0 - 1.5: Başarılı ama riskli bir konsept (standart kârlılık).',
      'Değer > 1.5: Yüksek kaliteli ticaret sistemi.',
      'Değer 2.0 ve üstü: Olağanüstü performans.'
    ]
  },
  profitFactor: {
    title: 'Kâr Faktörü (Profit Factor)',
    description: 'Brüt kârın brüt zarara bölünmesiyle elde edilen kârlılık rasyosudur. Konseptnin verimliliğini değerlendirmek için ideal metriktir.',
    formula: 'Toplam Brüt Kâr / Toplam Brüt Zarar (Matematiksel Mutlak Değeri ile)',
    type: 'info',
    icon: Scale,
    details: [
      'Değer < 1: Konsept genel olarak para kaybediyor.',
      'Değer 1.0 - 1.5: Başarılı ama riskli bir konsept (standart kârlılık).',
      'Değer > 1.5: Yüksek kaliteli ticaret sistemi.',
      'Değer 2.0 ve üstü: Olağanüstü performans.'
    ]
  },
  expectancy: {
    title: 'Expectancy (Beklenti Oranı)',
    description: 'İşlem başına ortalama olarak beklenen kazanç miktarını (veya kaybı) risk çarpanı (R) cinsinden gösterir.',
    formula: '(Kazanma Oranı × Ortalama Kazanılan R) - (Kaybetme Oranı × Ortalama Kaybedilen R)',
    type: 'info',
    icon: Activity,
    details: [
      'Pozitif Beklenti: İstatistiksel olarak bu konseptyi oynamaya devam ederseniz uzun vadede kazanırsınız.',
      'Negatif Beklenti: İşlemlere devam edildikçe sistem kasanızı eritecektir.'
    ]
  },
  kelly: {
    title: "Kelly Criterion (Kelly Kriteri)",
    description: "Sermaye yönetimi ve risk yönetimi için kullanılan istatistiksel bir formüldür. Kasa büyümesini maksimize etmek için teorik olarak alınması gereken optimum pozisyon büyüklüğünü (risk yüzdesini) verir.",
    formula: "K% = W - [(1 - W) / R] \n(W=Kazanma Oranı, R=Risk/Ödül Oranı)",
    type: 'info',
    icon: ShieldCheck,
    details: [
      "Değer negatif çıkarsa işlemlere kesinlikle girilmemesi (konseptnin çalışmadığı) anlamı çıkar.",
      "Kelly yüzdesi genellikle oldukça agresiftir. Piyasa pratiğinde bu oranın yarısı (Half-Kelly) veya dörtte biri kullanılarak risk düşürülmektedir.",
      "0-10% Aralığı: Muhafazakar Büyüme (Güvenli Alan)",
      ">10% Aralığı: Tehlikeli, Yüksek Volatiliteli Kasalar"
    ]
  },
  maxDrawdown: {
    title: "Max Drawdown (Maksimum Düşüş)",
    description: "Kasanızın en yüksek zirve noktasından, en düşük dip noktasına kadar yaşadığı oransal kayıp yüzdesidir veya değeridir.",
    formula: "(Tepe Noktası - Dip Noktası) / Tepe Noktası * 100",
    type: 'negative',
    icon: AlertTriangle,
    details: [
      "Sistemin taşıdığı potansiyel riski net biçimde özetler.",
      "%20 üzeri Drawdown değerleri psikolojiyi ve trade sermayesini sarsabilir.",
      "Drawdown miktarını geri kazanmak için, aynı yüzdeden çok daha fazla oranda kâr kazanmak gerekir."
    ]
  },
  recoveryFactor: {
    title: "Toparlanma Faktörü (Recovery Factor)",
    description: "Sistemin kârının (R cinsinden), maruz kaldığı maksimum kümülatif R düşüşüne (Max Drawdown R) oranıdır. Sistemlerin ne kadar hızlı toparlandığını ölçer.",
    formula: "Net RR / Max DD R",
    type: 'info',
    icon: TrendingUp,
    details: [
      "Değer < 1: Sistem henüz toparlanamadı veya riskine göre getirisi düşük.",
      "Değer > 1.5: Sistem R kayıplarını hızla telafi ediyor."
    ]
  },
  sharpeRatio: {
    title: "İstikrar Endeksi (Sharpe Oranı Eşdeğeri)",
    description: "Risk ayarlı getiriyi ölçer. Getirinin riskli mi yoksa istikrarlı bir büyümeyle mi elde edildiğini anlamak için kullanılır.",
    formula: "Ortalama Günlük Getiri / Getirilerin Standart Sapması",
    type: 'info',
    icon: LineChart,
    details: [
      "Yüksek Sharpe Oranı, işlemlerin daha stabil ilerlediğini ve sürpriz sert düşüşlerin az olduğunu gösterir.",
      "Düşük bir oran, kâr elde etse bile bunun çok stresli dalgalanmalarla yaşandığını işaret eder."
    ]
  },
  avgRecoveryTrades: {
    title: "Drawdown Toparlanma (Ortalama Trade)",
    description: "Yeni bir zirve (All-Time High) gördükten sonraki düşüşlerden toparlanmak için ortalama kaç trade yapılması gerektiğini simüle eder.",
    type: 'info',
    icon: Activity,
    details: [
      "Psikolojik hazırlık için iyi bir metriktir. Stop olduğunuzda ortalama kaç işlem daha sabretmeniz gerektiğini belirtir."
    ]
  },
  efficiencyLevel: {
    title: "Verimlilik Seviyesi (Sistem Yaşlanması)",
    description: "Son dönemdeki performansınızın (genellikle son 10 veya 20 işlem) eski genel performansınızla kıyaslanmasıdır. Sisteminizin piyasadaki geçerliliğini gösterir.",
    type: 'info',
    icon: Target,
    details: [
      "Eğer son 10 işlemin PF değeri eskiye göre ciddi bir zayıflama gösteriyorsa piyasa koşulları değişmiş olabilir.",
      "Sistemin yaşlanıp yaşlanmadığını veya sizin mental yorgunluğunuzu analiz eder."
    ]
  },
  averageWin: {
    title: "Ortalama Kazanç (Average Win)",
    description: "Kârlı kapatılan işlemlerden kazanılan ortalama risk çarpanı (R-Multiple) değeridir.",
    formula: "Toplam Kazanılan R / Kârlı Kapanan İşlem Sayısı",
    type: 'positive',
    icon: ArrowUpRight,
    details: [
      "Ortalama kazancın ortalama zarardan yüksek olması büyük önem arz eder."
    ]
  },
  averageLoss: {
    title: "Ortalama Kayıp (Average Loss)",
    description: "Zararla kapatılan işlemlerden kaybedilen ortalama risk çarpanı (R-Multiple) değeridir.",
    formula: "Toplam Kaybedilen R / Zararla Kapanan İşlem Sayısı",
    type: 'negative',
    icon: ArrowDownRight,
    details: [
      "Kayıpların stop loss aracılığıyla kısıtlanıp kısıtlanmadığı incelenmelidir."
    ]
  },
  winStreak: {
    title: "En Uzun Kazanç Serisi",
    description: "Arka arkaya alınan kârlı işlemlerin maksimum sayısını gösterir.",
    type: 'positive',
    icon: Zap,
    details: [
      "Piyasa koşullarının sizin konseptnize en çok uyduğu evreyi işaret eder."
    ]
  },
  lossStreak: {
    title: "En Uzun Kayıp Serisi",
    description: "Arka arkaya alınan zararlı işlemlerin maksimum sayısını gösterir.",
    type: 'negative',
    icon: AlertTriangle,
    details: [
      "Sistemin zayıf kaldığı veya genel bir piyasa daralmasının olduğu riskli dönemi işaret eder.",
      "Konseptnin en sert stres testlerinden biridir."
    ]
  },
  breakevenRate: {
    title: "Başa Baş Oranı (Breakeven)",
    description: "Girişte kapanan veya sıfır PnL ile sonuçlanan işlemlerin genel yüzdesini gösterir.",
    type: 'info',
    icon: Clock,
    details: [
      "Risk yönetimi açısından kilit bir metriktir. Stop entry\'e çekme veya erken çıkışları ifade edebilir."
    ]
  },
  longPerformance: {
    title: "Long İşlem Performansı",
    description: "Sadece alım yönlü (Long) işlemlerin genel performansıdır.",
    type: 'info',
    icon: TrendingUp,
    details: [
      "Boğa piyasasında ağırlıklı olarak performansın Long yönlü olması beklenir."
    ]
  },
  shortPerformance: {
    title: "Short İşlem Performansı",
    description: "Sadece satım yönlü (Short) işlemlerin genel performansıdır.",
    type: 'info',
    icon: TrendingDown,
    details: [
      "Ayı piyasasında ana performans ölçütüdür. Short yönlü analizler piyasa kırılımlarındaki yetkinliğinizi yansıtır."
    ]
  },
  largestWin: {
    title: "En Büyük Kazanç (Largest Win)",
    description: "Tek bir işlemden elde edilen gelmiş geçmiş en büyük risk çarpanı (R-Multiple) sonucudur. (Aykırı Değer - Outlier)",
    type: 'positive',
    icon: Target,
    details: [
      "Eğer sistemin toplam kârının çok büyük bir kısmı tek bir hedefe bağlıysa (Outlier Win), kazanç oranınız şişmiş olabilir ve gerçek performanstan sapmalar olabilir."
    ]
  },
  largestLoss: {
    title: "En Büyük Kayıp (Largest Loss)",
    description: "Tek bir işlemden kaybedilen gelmiş geçmiş en büyük risk çarpanı (R-Multiple) sonucudur. (Stop kuralının ihlali veya Slippage)",
    type: 'negative',
    icon: AlertTriangle,
    details: [
      "Manuel stop olamama, stop taşıma veya siyah kuğu olayları nedeniyle ortaya çıkar.",
      "Tek bir devasa kayıp, aylarca süren kazancı silebilir. Risk haritasının en iyi göstergesidir."
    ]
  },
  weeklyPerformance: {
    title: "Haftalık R Eğilimi",
    description: "Hafta bazındaki net R-multiple gelişiminin özeti.",
    type: 'info',
    icon: Calendar,
    details: [
      "Haftalık performans takibi ile aylık ana hedeflere olan uzaklık ve sapmalar planlanır."
    ]
  },
  heatmap: {
    title: "Konsept & Parite Hit Rate Matrisi (Heatmap)",
    description: "Hangi paritede, hangi teknik kavramda veya modelde daha iyi oranlar yakalandığını gösterir.",
    type: 'info',
    icon: LayoutDashboard,
    details: [
      "Kırmızı/Siyah alanlar, işlem yapılmaması gereken 'Sıfır Bölge' veya 'Kör Nokta' olarak tasnif edilir.",
      "Parlak yeşil veya mavi alanlar sizin doğal yetenek alanlarınızdır. Bütün kasayı bu alanlara kaydırmak verimliliği artırır."
    ]
  },
  sortinoRatio: {
    title: "Sortino Oranı (Bakiye Bağımsız)",
    description: "Sharpe oranının aksine, sadece aşağı yönlü sapmaları (kayıpların oluşturduğu düzensizliği) standart sapma olarak ele alıp risk ve kazanç kalitesini ölçer.",
    formula: "Ortalama R Getirisi / Sadece Negatif R'ların Standart Sapması",
    type: 'positive',
    icon: LineChart,
    details: [
      "Yukarı yönlü aşırı yüksek kazançları negatif sapma olarak cezalandırmaz. Bu yüzden trading sistemleri için Sharpe oranından çok daha adildir.",
      "Değer > 1.0: Başarılı bir risk-getiri profili.",
      "Değer > 2.0: Mükemmel seviyede, aşağı yönlü dalgalanması minimize edilmiş kaliteli kazanç istikrarı."
    ]
  },
  kellyR: {
    title: "Kelly Kriteri (R-Tabanlı)",
    description: "Mevcut kazanma oranı ve R-katsayısı (ortalama kâr-zarar oranı) değerleriniz doğrultusunda kasa büyümesini maksimize edecek işlem başına optimum R risk miktarını belirtir.",
    formula: "Kelly % = W - [(1 - W) / R_Payoff] \n(W = Win Rate, R_Payoff = Ortalama Win R / Ortalama Loss R)",
    type: 'neutral',
    icon: ShieldCheck,
    details: [
      "Kasanın volatiliteye yenik düşmemesi için hesaplanan Kelly oranının 1/4 (Fractional Kelly) veya 1/2'sinin kullanılması tavsiye edilir.",
      "Pozitif bir oran, sistemin uzun vadede kârlı matematiksel avantaja sahip olduğunu onaylar.",
      "Eğer bu değer %0 ya da negatif çıkarsa, sisteminizin negatif beklentiye sahip olduğunu veya riskine göre kârlılığın yetersiz kaldığını gösterir."
    ]
  },
  sma10: {
    title: "Son 10 İşlem Ortalaması",
    description: "Kümülatif R-multiple eğrisinin son 10 kapanış değerinin aritmetik ortalamasını gösteren bir trend çizgisi.",
    formula: "Son 10 Kümülatif Değer / 10",
    type: 'info',
    icon: LineChart,
    details: [
      "Kümülatif eğrinin hareketli ortalamanın üstünde seyretmesi sistemin optimal performans fazında olduğunu doğrular.",
      "Eğrinin ortalamasını aşağı yönlü kesmesi, geçici bir performans kaybı, drawdown uyarısı veya piyasa fazı uyuşmazlığına işaret edebilir."
    ]
  },
  zScore: {
    title: "Z-Skoru / Streak Analizi",
    description: "Pozisyonların kronolojik ardışıklığını analiz ederek, kazanç (Win) ve kayıp (Loss) serilerinin istatistiksel bağımlılığını (Streak eğilimini) ölçer.",
    formula: "Runs Test standard normal distribution z value calculation",
    type: 'neutral',
    icon: Activity,
    details: [
      "Z-Skoru < -1.64 (Streak Eğilimli): Bir kazançtan sonra bir başka kazanç, bir kayıptan sonra bir başka kayıp gelme olasılığı çok yüksektir. Sıcak el (Hot-hand) etkisini doğrular.",
      "Z-Skoru > 1.64 (Kısa Seri): Kazanılan bir işlemden sonra kaybetme, kaybedilen bir işlemden sonra kazanma eylemi yaygındır. Seri yapma ihtimali düşüktür.",
      "-1.64 ile 1.64 arası: İşlemlerin sonuçları istatistiksel açıdan bağımsızdır, yani tamamen rastgele dağılım gösterir."
    ]
  },
  currentStreak: {
    title: "Mevcut Seri",
    description: "Şu anda kesintisiz devam eden aktif kazanma (Win) ya da kaybetme (Loss) serinizi gösterir.",
    formula: "Son işlemlerden geriye doğru ardışık sonuçların sayılması",
    type: 'info',
    icon: Activity,
    details: [
      "Seride kalmak psikolojinizi yönetmek için en önemli unsurlardan biridir.",
      "Pozitif seri (+ Win): Aşırı öz güven ve kuralları esnetme eğilimine karşı uyanık olun.",
      "Negatif seri (- Loss): İntikam işlemine (revenge trading) girmemek ve sakinleşmek için kendinize mola verin."
    ]
  },
  sqn: {
    title: "Sistem Kalitesi (SQN - System Quality Number)",
    description: "Van Tharp tarafından geliştirilmiş SQN skoru; yapılan işlemlerin ortalama net risk (R) getirisini, bu getirilerin değişkenliğiyle (standart sapma) kıyaslayarak ve aynı zamanda sistemin işlem adedini de hesaba katarak genel bir \"Sistem Kalite Derecesi\" belirler.",
    formula: "SQN = (Ortalama R / Standart Sapma) × Karekök(İşlem Sayısı)",
    type: 'positive',
    icon: Activity,
    details: [
      "SQN skoru, konseptnizin pazar koşullarında sadece ne kadar kazanç getirdiğini değil, bu kazancı ne kadar stabil ve düşük dalgalanmayla getirdiğini ölçer.",
      "İşlem sayısı arttıkça aynı R ortalaması ve standart sapmaya sahip bir sistemin güvenilirliği ve SQN puanı artar.",
      "1.6 altı: Geliştirilmeli (Ortalama Altı)",
      "1.6 - 2.49 arası: Ortalama (İyi) - Çoğu kârlı trade sistemi bu aralıktadır.",
      "2.5 - 2.99 arası: İyi Sistem - Çok istikrarlı gelişim.",
      "3.0 ve üstü: Mükemmel - Ölçeklendirme için harika şartlar."
    ]
  },
};
