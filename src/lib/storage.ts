import { storage } from './firebase';
import { ref, uploadString, getDownloadURL, listAll, deleteObject, getBlob, type StorageReference } from 'firebase/storage';

export const uploadImageToStorage = async (
  userId: string,
  base64DataUrl: string,
  folder: 'trades' | 'prop'
): Promise<string> => {
  if (!base64DataUrl.startsWith('data:image')) {
    // Zaten bir URL ise olduğu gibi döner
    if (base64DataUrl.startsWith('http')) {
      return base64DataUrl;
    }
    throw new Error('Geçersiz görsel formatı. Sadece base64 verisi yüklenebilir.');
  }

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const path = `users/${userId}/${folder}/img_${timestamp}_${randomStr}.webp`;

  const storageRef = ref(storage, path);

  await uploadString(storageRef, base64DataUrl, 'data_url');
  const downloadUrl = await getDownloadURL(storageRef);

  return downloadUrl;
};

/** Kullanıcının Storage klasöründeki (users/{uid}/...) tüm dosyaları alt klasörler dahil siler. Silinen dosya sayısını döner. */
export const deleteAllUserImages = async (userId: string): Promise<number> => {
  let deleted = 0;
  const walk = async (folder: StorageReference): Promise<void> => {
    const res = await listAll(folder);
    await Promise.all(
      res.items.map(async (item) => {
        await deleteObject(item);
        deleted++;
      }),
    );
    for (const sub of res.prefixes) await walk(sub);
  };
  await walk(ref(storage, `users/${userId}`));
  return deleted;
};

/** Bu projenin Storage'ına ait bir indirme URL'si mi? */
export const isStorageUrl = (url: string) => /^https:\/\/firebasestorage\.googleapis\.com\//.test(url);

/** URL'si verilen Storage dosyasını siler (dosya zaten yoksa sessizce geçer). */
export const deleteImageByUrl = async (url: string): Promise<void> => {
  if (!isStorageUrl(url)) return;
  try {
    await deleteObject(ref(storage, url));
  } catch (e: any) {
    if (e?.code !== 'storage/object-not-found') throw e;
  }
};

/** Storage görselini data URL'ye çevirir (yedeğe gömmek için). Bucket'ta CORS ayarı yoksa hata verir. */
export const storageUrlToDataUrl = async (url: string): Promise<string> => {
  const blob = await getBlob(ref(storage, url));
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
};
