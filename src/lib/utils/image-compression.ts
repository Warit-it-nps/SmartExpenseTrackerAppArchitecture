export interface CompressedImageResult {
  base64DataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

/**
 * บีบอัดรูปภาพฝั่ง Client ให้มีความกว้างสูงสุดไม่เกิน maxWidth (ค่าเริ่มต้น 1024px)
 */
export async function compressSlipImage(
  file: File,
  maxWidth = 1024,
  quality = 0.8
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไฟล์รูปภาพไม่ถูกต้อง'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('ไม่สามารถสร้าง Canvas Context ได้'));
        }

        ctx.drawImage(img, 0, 0, width, height);
        const base64DataUrl = canvas.toDataURL('image/jpeg', quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('การบีบอัดรูปภาพล้มเหลว'));
            resolve({ base64DataUrl, blob, width, height });
          },
          'image/jpeg',
          quality
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
