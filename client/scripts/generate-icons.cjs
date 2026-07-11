/**
 * generate-icons.js
 * Generates all Android mipmap icons + iOS AppIcon.
 * Uses fit:'contain' with background fill to NEVER stretch or distort images.
 *
 * NOT: Splash bitmap üretimi KALDIRILDI (agent.md §63) — native splash artık düz lacivert
 * (Android: drawable/splash.xml solid + şeffaf splash_icon.xml; iOS: LaunchScreen.storyboard
 * düz renk). Markalı açılış anı web tarafındaki AnimatedSplash animasyonudur. Buraya splash
 * üretimi GERİ EKLENMEMELİ: drawable/splash.png, drawable/splash.xml ile çakışıp Android
 * build'ini kırar (duplicate resource).
 *
 * Usage: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const CLIENT = path.resolve(__dirname, '..');
const ASSETS = path.join(CLIENT, 'assets');
const DIMLI = path.join(ASSETS, 'dimli.png');  // AppIcon source
const TRANS = { r: 0, g: 0, b: 0, alpha: 0 };

const ANDROID_RES = path.join(CLIENT, 'android/app/src/main/res');

// ─── Android Mipmap ───────────────────────────────────────────────────────────
// Her yoğunluk için İKİ boyut:
//  - adaptive: Android 8+ adaptive icon foreground. Katman 108dp OLMALI (mdpi 108 … xxxhdpi 432).
//    Eskiden 48dp'de (192px'e kadar) üretiliyordu → Redmi/MIUI launcher slotuna büyütünce BULANIK.
//  - legacy:   pre-API-26 ic_launcher/round, klasik 48dp (192px'e kadar).
// Foreground + legacy = full-bleed dimli.png (App Store kompozisyonu); adaptive maske yalnız koyu
// stadyum köşelerini kırpar, D + DİMLİ merkezde kaldığından korunur. Background artık PNG değil,
// adaptive XML'de @color/dimliPitch (çözünürlükten bağımsız, her zaman keskin).
const MIPMAP_DENSITIES = [
    { dir: 'mipmap-ldpi', legacy: 36, adaptive: 81 },
    { dir: 'mipmap-mdpi', legacy: 48, adaptive: 108 },
    { dir: 'mipmap-hdpi', legacy: 72, adaptive: 162 },
    { dir: 'mipmap-xhdpi', legacy: 96, adaptive: 216 },
    { dir: 'mipmap-xxhdpi', legacy: 144, adaptive: 324 },
    { dir: 'mipmap-xxxhdpi', legacy: 192, adaptive: 432 },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('🚀 Generating icons (fit=contain, NO distortion)\n');

    // 1. Android mipmaps
    console.log('📱 Android mipmap icons from dimli.png...');
    for (const { dir, legacy, adaptive } of MIPMAP_DENSITIES) {
        const outDir = path.join(ANDROID_RES, dir);
        fs.mkdirSync(outDir, { recursive: true });

        // Adaptive foreground — dimli.png %72 içeriden, şeffaf pad (App Store kompozisyonuyla eşleşir).
        // NEDEN full-bleed DEĞİL: adaptive icon'lar (özellikle MIUI) foreground'un merkezine ~1.5× zoom
        // yapıp kenarları kırpar; full-bleed → logo devleşir, stadyum kaybolur. %72 inset MIUI zoom'undan
        // sonra iOS marjını/boyutunu korur (kalibrasyonla doğrulandı). 108dp yoğunlukta → yüksek çözünürlük.
        const insetFg = Math.round(adaptive * 0.72);
        const dimliInset = await sharp(DIMLI)
            .resize(insetFg, insetFg, { fit: 'contain', background: TRANS }).toBuffer();
        await sharp({ create: { width: adaptive, height: adaptive, channels: 4, background: TRANS } })
            .composite([{ input: dimliInset, gravity: 'center' }])
            .png().toFile(path.join(outDir, 'ic_launcher_foreground.png'));

        // Legacy ic_launcher + round (pre-API-26) — full-bleed, 48dp yoğunlukta
        const legacyBuf = await sharp(DIMLI).resize(legacy, legacy).png().toBuffer();
        await sharp(legacyBuf).toFile(path.join(outDir, 'ic_launcher.png'));
        await sharp(legacyBuf).toFile(path.join(outDir, 'ic_launcher_round.png'));

        // NOT: ic_launcher_background.png üretilmez — adaptive <background> = @color/dimliPitch.

        console.log(`  ✅ ${dir} (fg ${adaptive}px, legacy ${legacy}px)`);
    }

    // 2. iOS AppIcon
    console.log('\n🍎 iOS AppIcon (1024x1024) from dimli.png...');
    const iosIconDir = path.join(CLIENT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
    fs.mkdirSync(iosIconDir, { recursive: true });
    await sharp(DIMLI)
        .resize(1024, 1024, { fit: 'contain', background: TRANS })
        .png()
        .toFile(path.join(iosIconDir, 'AppIcon-512@2x.png'));
    console.log('  ✅ AppIcon-512@2x.png (1024x1024)');

    console.log('\n🎉 All done! No images were stretched or distorted.');
}

main().catch(err => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
});
