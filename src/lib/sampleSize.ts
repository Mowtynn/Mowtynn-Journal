/**
 * Projenin TEK örneklem eşiği: bir grup (kurulum, seans, hedef, kategori…) hakkında hüküm / sıralama / kural
 * üretmek için gereken en az işlem sayısı. Kurulum karnesi, Edge özeti, Disiplin ve Strateji laboratuvarı aynı
 * değeri kullanır; aynı kurulum bir ekranda "hüküm var", başka ekranda "az örneklem" görünmez.
 * Hükümler ayrıca %95 güven aralığına dayanır; küçük örneklemde aralık geniş kalır ve "kanıtlı" denmez.
 */
export const MIN_SAMPLE = 5;

/**
 * "Kanıtlı edge" demek için gereken en az işlem. Güven aralığı az işlemde (ör. 8) yanıltıcı biçimde sıfırın
 * üstünde kalabilir; bu sayıya kadar pozitif sonuç "Umut verici" olarak gösterilir. Uyarılar (kayıp / sızıntı)
 * bu eşiği beklemez: zarar sinyali erken gösterilir.
 */
export const EDGE_PROOF_MIN = 30;
