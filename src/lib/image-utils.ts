export const compressImage = (file: File, maxWidth = 1920, maxHeight = 1920, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;

            // Scale down if needed, maintaining aspect ratio
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context oluşturulamadı'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Görsel sıkıştırılamadı'));
                        return;
                    }
                    const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
                        type: 'image/webp',
                        lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                },
                'image/webp',
                quality
            );
        };
        img.onerror = () => reject(new Error('Görsel yüklenemedi'));
        img.src = URL.createObjectURL(file);
    });
};
