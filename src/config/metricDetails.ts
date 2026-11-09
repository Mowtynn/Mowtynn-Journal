import { MetricDetail } from '../components/MetricDetailModal';
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Calendar, Scale, Target, TrendingDown, TrendingUp } from 'lucide-react';

export const metricDetailsDict: Record<string, Omit<MetricDetail, 'value' | 'id'>> = {
  // DeepAnalysis
  winRate: {
    title: 'Kazanma Oranı (WR)',
    description: 'Kazançla kapanan işlemlerin TÜM işlemlere oranı. Başabaş (BE) işlemler de paydadadır.',
    formula: '(Kazanan İşlem Sayısı / Toplam İşlem Sayısı) × 100',
    type: 'neutral',
    icon: Target,
    details: [
      'Kazanma oranı tek başına kârlılığı söylemez: 3R hedefle çalışan bir sistem %30 civarında bile kazandırır.',
      'Başabaş kazanma oranı = Ort. Kayıp ÷ (Ort. Kazanç + Ort. Kayıp) × (kazanç + kayıp) ÷ tüm işlemler. BE işlemleri paydada olduğu için bu düzeltme gerekir. Kazanma oranın bunun üstündeyse sistem net R kazandırır (Ana Panel\'deki "başabaş %" değeri).',
      'Az işlemde oran çok oynar: 20 işlemde tek bir sonuç oranı 5 puan değiştirir.'
    ]
  },
  cumulativeR: {
    title: 'Kümülatif R (Net R)',
    description: 'Tüm işlemlerin R cinsinden toplam sonucu. 3R hedefi vuran işlem +3, tam stop olan işlem −1, başabaş 0 ekler.',
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
    description: "Yalnızca Long işlemlerin kazanma oranı ve R sonucu.",
    type: 'info',
    icon: TrendingUp,
    details: [
      "Yön kıyası için R/işlem değerine bak; kazanma oranı tek başına yanıltabilir.",
      "Bir yönde 5'ten az işlem varsa (Az Veri) kıyaslama yapma."
    ]
  },
  shortPerformance: {
    title: "Short İşlem Performansı",
    description: "Yalnızca Short işlemlerin kazanma oranı ve R sonucu.",
    type: 'info',
    icon: TrendingDown,
    details: [
      "Yön kıyası için R/işlem değerine bak; kazanma oranı tek başına yanıltabilir.",
      "Bir yönde 5'ten az işlem varsa (Az Veri) kıyaslama yapma."
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
