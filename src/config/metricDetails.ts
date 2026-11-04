import { MetricDetail } from '../components/MetricDetailModal';
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Calendar, Scale, Target, TrendingDown, TrendingUp } from 'lucide-react';

export const metricDetailsDict: Record<string, Omit<MetricDetail, 'value' | 'id'>> = {
  // DeepAnalysis
  winRate: {
    title: 'Kazanma Oranı (WR)',
    description: 'Kârla kapanan işlemlerin toplam kapanan işlemlere oranıdır. Sistemin ne sıklıkla doğru tahmin yaptığını gösterir.',
    formula: '(Kazanan İşlem Sayısı / Toplam İşlem Sayısı) × 100',
    type: 'neutral',
    icon: Target,
    details: [
      '%50 altı kazanma oranı, stratejinin zayıf olduğu anlamına gelmez, yüksek kazanç katsayısıyla desteklenebilir.',
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
      'Risk/Ödül stratejisinin sürdürülebilirliğini net olarak ifade eder.',
      'Pozitif kalması, uzun vadede stratejinin kârlı büyüyeceğini gösterir.'
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
  pureProfitFactor: {
    title: 'Kâr Faktörü (Profit Factor)',
    description: 'Kazanan işlemlerin toplam R\'sinin kaybeden işlemlerin toplam R\'sine oranı. Kayıp yoksa ∞ gösterilir.',
    formula: 'Brüt kazanç (R) / Brüt kayıp (R, mutlak değer)',
    type: 'info',
    icon: Scale,
    details: [
      '1\'in altı: sistem net R kaybediyor.',
      '1.0 – 1.5: kârlı ama ince bir kenar.',
      '1.5 üstü: güçlü; 2.0 ve üstü: çok güçlü.',
      'Az işlemde tek bir büyük kazanç PF\'yi şişirebilir; örneklemle birlikte okuyun.'
    ]
  },
  maxDrawdown: {
    title: "Max Drawdown (Maksimum Düşüş)",
    description: "R sermaye eğrisinin ulaştığı en yüksek noktadan sonraki en derin düşüş. Başlangıç (0R) da bir zirve sayılır.",
    formula: "max(Zirve R − O anki kümülatif R)",
    type: 'negative',
    icon: AlertTriangle,
    details: [
      "R cinsindendir: prop hesabının dolar bazlı düşüşü için Prop sekmesindeki hesap kartına bakın.",
      "Stratejinin taşıdığı en kötü ardışık kaybı özetler; ileride bundan daha derin bir düşüş de yaşanabilir."
    ]
  },
  recoveryFactor: {
    title: "Toparlanma Faktörü (Recovery Factor)",
    description: "Net R'nin Max Drawdown'a oranı: en derin düşüşün kaç katı net getiri üretildiği.",
    formula: "Net R / Max Drawdown R",
    type: 'info',
    icon: TrendingUp,
    details: [
      "1'in altı: net getiri en derin düşüşü henüz karşılamıyor.",
      "1.5 üstü: düşüşler getiriye göre küçük kalıyor.",
      "Hiç düşüş yaşanmadıysa hesaplanmaz (—)."
    ]
  },
  avgRecoveryTrades: {
    title: "Düşüşten Toparlanma (ortalama işlem)",
    description: "Zirvenin altına düşülen işlemden, zirvenin yeniden aşıldığı (ya da yakalandığı) işleme kadar geçen işlem sayısının ortalaması. Yalnızca tamamlanmış düşüşler sayılır.",
    formula: "Toplam toparlanma işlemi / Tamamlanmış düşüş sayısı",
    type: 'info',
    icon: Activity,
    details: [
      "Stop olduktan sonra eski seviyeye dönmek için genelde kaç işlem gerektiğini gösterir.",
      "Devam eden (henüz toparlanmamış) düşüş ortalamaya katılmaz; hiç tamamlanmış düşüş yoksa — gösterilir."
    ]
  },


  profitableDays: {
    title: "Kârlı / Zararlı Gün",
    description: "İşlem yapılan New York takvim günlerinin, günün toplam R sonucuna göre dağılımı. Gün içinde birden çok işlem varsa toplamları alınır.",
    formula: "Kârlı gün = günlük toplam R > 0 · Zararlı gün = günlük toplam R < 0",
    type: 'neutral',
    icon: Calendar,
    details: [
      "Toplam R'si tam 0 olan günler (yalnızca başabaş) iki gruba da girmez.",
      "Kârlı günlerin oranı, kazanma oranından farklıdır: tek bir büyük kazanç birkaç küçük kaybı aynı gün içinde telafi edebilir.",
    ],
  },

};
