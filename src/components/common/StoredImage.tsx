import React from 'react';
import { ImageOff } from 'lucide-react';
import { useImageSrc } from '../../hooks/useImageSrc';

/** Kayıtlı görseli (Firestore referansı, data URL ya da bağlantı) gösterir; yüklenirken iskelet, yoksa simge */
export function StoredImage({ src, alt = '', className = '', ...rest }: Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src: string }) {
  const url = useImageSrc(src);
  if (url === undefined) return <div className={`${className} bg-zinc-800/60 animate-pulse`} aria-hidden />;
  if (url === null)
    return (
      <div className={`${className} flex items-center justify-center bg-zinc-900 text-zinc-600`}>
        <ImageOff size={16} />
      </div>
    );
  return <img src={url} alt={alt} className={className} {...rest} />;
}
