import html2canvas from 'html2canvas';

// --- OKLCH & OKLAB to RGB/RGBA Conversion Helpers for html2canvas Compatibility ---
export function oklabToRgb(L: number, labA: number, labB: number, A: number = 1): string {
  const l_ = L + 0.3963377774 * labA + 0.2158037573 * labB;
  const m_ = L - 0.1055613458 * labA - 0.0638541728 * labB;
  const s_ = L - 0.0894841775 * labA - 1.2914855480 * labB;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  let rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bLin = -0.0041960863 * l3 - 0.7034186145 * m3 + 1.7076147010 * s3;

  const transformChannel = (c: number) => {
    if (c <= 0.0031308) {
      return 12.92 * c;
    } else {
      return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    }
  };

  const outR = Math.max(0, Math.min(255, Math.round(transformChannel(rLin) * 255)));
  const outG = Math.max(0, Math.min(255, Math.round(transformChannel(gLin) * 255)));
  const outB = Math.max(0, Math.min(255, Math.round(transformChannel(bLin) * 255)));

  return A === 1 ? `rgb(${outR},${outG},${outB})` : `rgba(${outR},${outG},${outB},${A})`;
}

export function oklchToRgb(L: number, C: number, H: number, A: number = 1): string {
  const hRad = (H * Math.PI) / 180;
  const labA = C * Math.cos(hRad);
  const labB = C * Math.sin(hRad);
  return oklabToRgb(L, labA, labB, A);
}

export function parseOklchParts(inner: string) {
  const rawParts = inner.replace(/,/g, ' ').replace(/\//g, ' ').trim().split(/\s+/);
  if (rawParts.length < 3) return null;

  let L = 0;
  if (rawParts[0].endsWith('%')) L = parseFloat(rawParts[0]) / 100;
  else L = parseFloat(rawParts[0]);

  let C = 0;
  if (rawParts[1].endsWith('%')) C = parseFloat(rawParts[1]) / 100;
  else C = parseFloat(rawParts[1]);

  let H = 0;
  const hStr = rawParts[2];
  if (hStr.endsWith('deg')) H = parseFloat(hStr);
  else if (hStr.endsWith('rad')) H = (parseFloat(hStr) * 180) / Math.PI;
  else if (hStr.endsWith('grad')) H = (parseFloat(hStr) * 360) / 400;
  else if (hStr.endsWith('turn')) H = parseFloat(hStr) * 360;
  else H = parseFloat(hStr);

  let A = 1;
  if (rawParts[3] !== undefined) {
    const aStr = rawParts[3];
    if (aStr.endsWith('%')) A = parseFloat(aStr) / 100;
    else A = parseFloat(aStr);
  }

  if (isNaN(L) || isNaN(C) || isNaN(H) || isNaN(A)) return null;
  return { L, C, H, A };
}

export function parseOklabParts(inner: string) {
  const rawParts = inner.replace(/,/g, ' ').replace(/\//g, ' ').trim().split(/\s+/);
  if (rawParts.length < 3) return null;

  let L = 0;
  if (rawParts[0].endsWith('%')) L = parseFloat(rawParts[0]) / 100;
  else L = parseFloat(rawParts[0]);

  let a = 0;
  if (rawParts[1].endsWith('%')) a = parseFloat(rawParts[1]) / 100;
  else a = parseFloat(rawParts[1]);

  let b = 0;
  if (rawParts[2].endsWith('%')) b = parseFloat(rawParts[2]) / 100;
  else b = parseFloat(rawParts[2]);

  let A = 1;
  if (rawParts[3] !== undefined) {
    const aStr = rawParts[3];
    if (aStr.endsWith('%')) A = parseFloat(aStr) / 100;
    else A = parseFloat(aStr);
  }

  if (isNaN(L) || isNaN(a) || isNaN(b) || isNaN(A)) return null;
  return { L, a, b, A };
}

export const replaceOklchAndOklabInString = (str: string): string => {
  let replaced = str.replace(/oklch\(([^)]+)\)/gi, (match, inner) => {
    const parsed = parseOklchParts(inner);
    if (parsed) return oklchToRgb(parsed.L, parsed.C, parsed.H, parsed.A);
    return match;
  });

  replaced = replaced.replace(/oklab\(([^)]+)\)/gi, (match, inner) => {
    const parsed = parseOklabParts(inner);
    if (parsed) return oklabToRgb(parsed.L, parsed.a, parsed.b, parsed.A);
    return match;
  });

  return replaced;
};

export const generateCanvasWithOklchPolyfill = async (element: HTMLElement, options: any = {}): Promise<HTMLCanvasElement | null> => {
  if (!element) return null;

  const elementsWithInlineStyles: { el: HTMLElement; originalStyle: string }[] = [];
  const sheetsToRestore: { sheet: CSSStyleSheet; wasDisabled: boolean }[] = [];
  const tempStyleElements: HTMLStyleElement[] = [];
  const originalGetComputedStyle = window.getComputedStyle;

  try {
    const sheetsSnapshot = Array.from(document.styleSheets);
    for (let i = 0; i < sheetsSnapshot.length; i++) {
      const sheet = sheetsSnapshot[i];
      try {
        if (!sheet.cssRules) continue;
        const rulesArray = Array.from(sheet.cssRules);
        const cssText = rulesArray.map(r => r.cssText).join('\n');
        
        if (cssText.includes('oklch') || cssText.includes('oklab')) {
          const sanitized = replaceOklchAndOklabInString(cssText);
          const tempStyle = document.createElement('style');
          tempStyle.textContent = sanitized;
          document.head.appendChild(tempStyle);
          tempStyleElements.push(tempStyle);
          
          sheetsToRestore.push({ sheet, wasDisabled: sheet.disabled });
          sheet.disabled = true;
        }
      } catch (err) {}
    }

    const traverseAndSanitizeInline = (root: HTMLElement) => {
      const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
      const attributesToSanitize = ['style', 'fill', 'stroke', 'stop-color'];
      
      elements.forEach((el) => {
        attributesToSanitize.forEach((attr) => {
          const val = el.getAttribute(attr);
          if (val && (val.includes('oklch') || val.includes('oklab'))) {
            elementsWithInlineStyles.push({ el, originalStyle: `${attr}:${val}` });
            el.setAttribute(attr, replaceOklchAndOklabInString(val));
          }
        });
      });
    };
    traverseAndSanitizeInline(element);

    window.getComputedStyle = function (el, pseudo) {
      const style = originalGetComputedStyle.call(window, el, pseudo);
      return new Proxy(style, {
        get(target, prop) {
          if (prop === 'getPropertyValue') {
            return function (propertyName: string) {
              const val = target.getPropertyValue(propertyName);
              if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                return replaceOklchAndOklabInString(val);
              }
              return val;
            };
          }
          const val = Reflect.get(target, prop);
          if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
            return replaceOklchAndOklabInString(val);
          }
          if (typeof val === 'function') {
            return val.bind(target);
          }
          return val;
        }
      });
    };

    const canvas = await html2canvas(element, options);
    return canvas;
  } catch (error) {
    console.error("Canvas generation failed:", error);
    return null;
  } finally {
    window.getComputedStyle = originalGetComputedStyle;
    
    elementsWithInlineStyles.forEach(({ el, originalStyle }) => {
      const splitIndex = originalStyle.indexOf(':');
      if (splitIndex > -1) {
        const attr = originalStyle.substring(0, splitIndex);
        const val = originalStyle.substring(splitIndex + 1);
        el.setAttribute(attr, val);
      }
    });

    sheetsToRestore.forEach(({ sheet, wasDisabled }) => {
      sheet.disabled = wasDisabled;
    });

    tempStyleElements.forEach(el => el.remove());
  }
};
