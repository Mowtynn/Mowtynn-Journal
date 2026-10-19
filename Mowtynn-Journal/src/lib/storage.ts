import { storage } from './firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export const uploadImageToStorage = async (
  userId: string, 
  base64DataUrl: string, 
  folder: 'trades' | 'certificates' | 'ai'
): Promise<string> => {
  if (!base64DataUrl.startsWith('data:image')) {
    // Return as is if it's already a URL
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
