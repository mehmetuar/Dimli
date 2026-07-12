// react-easy-crop'un onCropComplete çıktısındaki natural-piksel alanını canvas ile
// JPEG File'a çevirir (ImageCropModal kullanır).
//
// EXIF notu: hedef WebView'ler (iOS ≥13.4 WKWebView, Chromium ≥81) HTMLImageElement'e
// EXIF oryantasyonunu otomatik uygular ve react-easy-crop oryante edilmiş elemanı
// ölçtüğü için cropPixels ile drawImage aynı koordinat uzayındadır — manuel EXIF
// işleme gerekmez (Capacitor 6'nın desteklediği tüm WebView'lerde geçerli).
//
// Daire maske (cropShape='round') yalnızca görsel bir overlay'dir: çıktı her zaman
// tam kare JPEG'dir (JPEG'de alpha yok; uygulama avatar/logoları zaten border-radius
// ile yuvarlak gösterir). Canvas'ta maskeleme YAPMA.

export interface CropAreaPixels {
    x: number;
    y: number;
    width: number;
    height: number;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        // decode() eski Android WebView'lerde güvenilmez — onload tercih edilir.
        img.onerror = () => reject(new Error('Görsel yüklenemedi.'));
        img.src = src;
    });

export async function getCroppedImg(
    imageSrc: string,
    cropPixels: CropAreaPixels,
    originalFileName: string,
    outputWidth: number,
    quality = 0.9,
): Promise<File> {
    const img = await loadImage(imageSrc);

    // Upscale yok: hedef genişlik kaynak kırpma alanını aşamaz.
    const outW = Math.max(1, Math.min(outputWidth, Math.round(cropPixels.width)));
    const outH = Math.max(1, Math.round(outW * (cropPixels.height / cropPixels.width)));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas desteklenmiyor.');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
        img,
        cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
        0, 0, outW, outH,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            b => (b ? resolve(b) : reject(new Error('Görsel oluşturulamadı.'))),
            'image/jpeg',
            quality,
        );
    });

    // Çıktı JPEG — uzantıyı .jpg'ye normalize et (eski kod .png adıyla JPEG üretiyordu).
    const name = originalFileName.replace(/\.[^./]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg' });
}
