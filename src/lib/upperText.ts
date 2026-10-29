import { smartUpper } from '../constants/constants';

/**
 * CSS `text-transform: uppercase` tek bir dil kuralı uygular: sayfa Türkçe olduğu için İngilizce terimler
 * "TİMEFRAME", `lang="en"` verilen yerlerde ise Türkçe kelimeler "STRATEJI" olur. Bu yardımcı, büyük harfle
 * gösterilen metinleri kelime kelime doğru kurala göre (smartUpper) önceden büyütür; CSS dönüşümü artık bir şey
 * değiştirmez. React'in yönettiği metin düğümleri yalnızca içerik olarak güncellenir (yapı değişmez).
 */

// Hesaplanan stil yalnızca bir tur boyunca önbellekte tutulur (üst öğenin sınıfı değişince kalıtım da değişir)
let upperCache = new Map<Element, boolean>();

const isUpper = (el: Element): boolean => {
  let v = upperCache.get(el);
  if (v === undefined) {
    v = getComputedStyle(el).textTransform === 'uppercase';
    upperCache.set(el, v);
  }
  return v;
};

const fixNode = (node: Text) => {
  const el = node.parentElement;
  if (!el || (el as HTMLElement).isContentEditable) return;
  const text = node.nodeValue;
  if (!text || !/[a-zçğıöşü]/.test(text)) return; // küçük harf yoksa yapılacak bir şey yok
  if (!isUpper(el)) return;
  const next = smartUpper(text);
  if (next !== text) node.nodeValue = next;
};

const fixTree = (root: Node) => {
  if (root.nodeType === Node.TEXT_NODE) {
    fixNode(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n = walker.nextNode();
  while (n) {
    fixNode(n as Text);
    n = walker.nextNode();
  }
};

export function startUppercaseFixer(): () => void {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return () => {};
  const pending = new Set<Node>();
  let scheduled = false;
  const flush = () => {
    scheduled = false;
    const nodes = Array.from(pending);
    pending.clear();
    upperCache = new Map();
    nodes.forEach((n) => n.isConnected && fixTree(n));
  };
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') pending.add(r.target);
      else if (r.type === 'attributes') pending.add(r.target);
      else r.addedNodes.forEach((n) => pending.add(n));
    }
    if (!scheduled && pending.size) {
      scheduled = true;
      // Çizimden önce uygulanır: yanlış harf ekranda bir kare bile görünmez
      queueMicrotask(flush);
    }
  });
  fixTree(document.body);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'lang'] });
  return () => observer.disconnect();
}
