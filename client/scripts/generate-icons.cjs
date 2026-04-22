/**
 * generate-icons.js
 * Generates all Android mipmap icons and splash screens + iOS AppIcon + splash
 * Uses fit:'contain' with background fill to NEVER stretch or distort images.
 *
 * Usage: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const CLIENT = path.resolve(__dirname, '..');
const ASSETS = path.join(CLIENT, 'assets');
const DIMLI = path.join(ASSETS, 'dimli.png');  // AppIcon source
const ICON = path.join(ASSETS, 'icon.png');   // Splash / in-app source

const DARK_BG = { r: 15, g: 23, b: 42, alpha: 1 }; // #0f172a
const TRANS = { r: 0, g: 0, b: 0, alpha: 0 };

const ANDROID_RES = path.join(CLIENT, 'android/app/src/main/res');

// ─── Android Mipmap ───────────────────────────────────────────────────────────
const MIPMAP_SIZES = [
    { dir: 'mipmap-ldpi', size: 36 },
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
];

// ─── Android Splash ───────────────────────────────────────────────────────────
const SPLASH_DIRS = [
    // Portrait
    { dir: 'drawable', w: 480, h: 800 },
    { dir: 'drawable-port-ldpi', w: 200, h: 320 },
    { dir: 'drawable-port-mdpi', w: 320, h: 480 },
    { dir: 'drawable-port-hdpi', w: 480, h: 800 },
    { dir: 'drawable-port-xhdpi', w: 720, h: 1280 },
    { dir: 'drawable-port-xxhdpi', w: 960, h: 1600 },
    { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
    { dir: 'drawable-night', w: 480, h: 800 },
    { dir: 'drawable-port-night-ldpi', w: 200, h: 320 },
    { dir: 'drawable-port-night-mdpi', w: 320, h: 480 },
    { dir: 'drawable-port-night-hdpi', w: 480, h: 800 },
    { dir: 'drawable-port-night-xhdpi', w: 720, h: 1280 },
    { dir: 'drawable-port-night-xxhdpi', w: 960, h: 1600 },
    { dir: 'drawable-port-night-xxxhdpi', w: 1280, h: 1920 },
    // Landscape
    { dir: 'drawable-land-ldpi', w: 320, h: 200 },
    { dir: 'drawable-land-mdpi', w: 480, h: 320 },
    { dir: 'drawable-land-hdpi', w: 800, h: 480 },
    { dir: 'drawable-land-xhdpi', w: 1280, h: 720 },
    { dir: 'drawable-land-xxhdpi', w: 1600, h: 960 },
    { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
    { dir: 'drawable-land-night-ldpi', w: 320, h: 200 },
    { dir: 'drawable-land-night-mdpi', w: 480, h: 320 },
    { dir: 'drawable-land-night-hdpi', w: 800, h: 480 },
    { dir: 'drawable-land-night-xhdpi', w: 1280, h: 720 },
    { dir: 'drawable-land-night-xxhdpi', w: 1600, h: 960 },
    { dir: 'drawable-land-night-xxxhdpi', w: 1920, h: 1280 },
];

// ─── iOS Splash ───────────────────────────────────────────────────────────────
const IOS_SPLASH_FILES = [
    { name: 'splash-2732x2732.png', w: 2732, h: 2732 },
    { name: 'splash-2732x2732-1.png', w: 2732, h: 2732 },
    { name: 'splash-2732x2732-2.png', w: 2732, h: 2732 },
    { name: 'Default@1x~universal~anyany.png', w: 750, h: 1334 },
    { name: 'Default@1x~universal~anyany-dark.png', w: 750, h: 1334 },
    { name: 'Default@2x~universal~anyany.png', w: 1242, h: 2208 },
    { name: 'Default@2x~universal~anyany-dark.png', w: 1242, h: 2208 },
    { name: 'Default@3x~universal~anyany.png', w: 1125, h: 2436 },
    { name: 'Default@3x~universal~anyany-dark.png', w: 1125, h: 2436 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function containResize(src, size) {
    return sharp(src)
        .resize(size, size, { fit: 'contain', background: TRANS })
        .toBuffer();
}

async function makeSplash(src, w, h) {
    const iconMax = Math.round(Math.min(w, h) * 0.38);
    const iconBuf = await sharp(src)
        .resize(iconMax, iconMax, { fit: 'contain', background: TRANS })
        .toBuffer();
    return sharp({ create: { width: w, height: h, channels: 4, background: DARK_BG } })
        .composite([{ input: iconBuf, gravity: 'center' }])
        .png()
        .toBuffer();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('🚀 Generating icons & splashes (fit=contain, NO distortion)\n');

    // 1. Android mipmaps
    console.log('📱 Android mipmap icons from dimli.png...');
    for (const { dir, size } of MIPMAP_SIZES) {
        const outDir = path.join(ANDROID_RES, dir);
        fs.mkdirSync(outDir, { recursive: true });

        // ic_launcher
        const iconBuf = await containResize(DIMLI, size);
        await sharp(iconBuf).toFile(path.join(outDir, 'ic_launcher.png'));

        // ic_launcher_round (same as launcher for PNG)
        await sharp(iconBuf).toFile(path.join(outDir, 'ic_launcher_round.png'));

        // ic_launcher_background — solid dark square
        await sharp({ create: { width: size, height: size, channels: 3, background: { r: 15, g: 23, b: 42 } } })
            .png().toFile(path.join(outDir, 'ic_launcher_background.png'));

        // ic_launcher_foreground — icon at 72% with transparent padding (safe zone)
        const fgSize = Math.round(size * 0.72);
        const pad = Math.round((size - fgSize) / 2);
        const fgBuf = await sharp(DIMLI)
            .resize(fgSize, fgSize, { fit: 'contain', background: TRANS })
            .extend({ top: pad, bottom: pad, left: pad, right: pad, background: TRANS })
            .toBuffer();
        await sharp(fgBuf).toFile(path.join(outDir, 'ic_launcher_foreground.png'));

        console.log(`  ✅ ${dir} (${size}px)`);
    }

    // 2. Android splash
    console.log('\n📱 Android splash screens from icon.png...');
    for (const { dir, w, h } of SPLASH_DIRS) {
        const outDir = path.join(ANDROID_RES, dir);
        fs.mkdirSync(outDir, { recursive: true });
        const buf = await makeSplash(ICON, w, h);
        await sharp(buf).toFile(path.join(outDir, 'splash.png'));
        console.log(`  ✅ ${dir} (${w}x${h})`);
    }

    // 3. iOS AppIcon
    console.log('\n🍎 iOS AppIcon (1024x1024) from dimli.png...');
    const iosIconDir = path.join(CLIENT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
    fs.mkdirSync(iosIconDir, { recursive: true });
    await sharp(DIMLI)
        .resize(1024, 1024, { fit: 'contain', background: TRANS })
        .png()
        .toFile(path.join(iosIconDir, 'AppIcon-512@2x.png'));
    console.log('  ✅ AppIcon-512@2x.png (1024x1024)');

    // 4. iOS Splash
    console.log('\n🍎 iOS splash screens from icon.png...');
    const iosSplashDir = path.join(CLIENT, 'ios/App/App/Assets.xcassets/Splash.imageset');
    fs.mkdirSync(iosSplashDir, { recursive: true });
    for (const { name, w, h } of IOS_SPLASH_FILES) {
        const buf = await makeSplash(ICON, w, h);
        await sharp(buf).toFile(path.join(iosSplashDir, name));
        console.log(`  ✅ ${name} (${w}x${h})`);
    }

    console.log('\n🎉 All done! No images were stretched or distorted.');
}

main().catch(err => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
});
