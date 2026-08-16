package com.dimli.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int BAR_COLOR = Color.parseColor("#0f172a");

    /**
     * Sistem çubukları her zaman koyu (#0f172a) + açık ikonlar — iki rejim (§102):
     *
     * API < 35 (Android 14-): Activity launch teması Theme.SplashScreen pencereyi edge-to-edge
     * açar; setDecorFitsSystemWindows(true) ile geri alınır → çubuklar opak boyanabilir ve
     * klavye nav-inset düzeltmesinin varsaydığı non-edge-to-edge durum korunur (eski davranış).
     * §103: @capacitor/status-bar v8'in load()'da bastığı legacy LAYOUT_* bayrakları
     * applyDarkSystemBars'ta temizlenir — AOSP 30-34 bu bayrakları görünce decorFits(true)'yu
     * yok sayıyordu (Redmi alt navbar çakışmasının kökü).
     *
     * API >= 35 (Android 15/16): edge-to-edge ZORUNLU — setDecorFitsSystemWindows(true),
     * setStatusBarColor/setNavigationBarColor no-op (targetSdk 36'da opt-out da kaldırıldı).
     * Model (§102 — alt otorite WEB katmanıdır):
     *   1) WebView'in parent'ına yalnız ÜST+YAN systemBars+displayCutout padding'i verilir;
     *      ALT padding VERİLMEZ → WebView şeffaf nav bar'ın altına uzanır (gerçek edge-to-edge,
     *      iOS home-indicator modeliyle aynı). Alt boşluğu web katmanı `--android-nav-inset`
     *      → `--safe-bottom` (index.html) üzerinden kendisi padler. Nav bar şeridinin koyu
     *      görünümü uygulamanın kendi yüzey renginden gelir (bar zemininin altına uzanan bg).
     *   2) Dönüşte systemBars+displayCutout inset'leri TÜKETİLİR (Insets.of(0,0,0,0);
     *      CONSUMED değil — Chromium yeniden hesaplama bug'ı): index.html'de viewport-fit=cover
     *      olduğundan tüketilmezse Chromium ≥140 gerçek env(safe-area-inset-*) üretir ve
     *      --safe-bottom ile ÇİFT boşluk oluşurdu. env() WebView içinde HER ZAMAN 0 kalır.
     * Capacitor core'un SystemBars inset otomasyonu kapalıdır (capacitor.config.ts →
     * SystemBars.insetsHandling='disable'); tek NATIVE inset otoritesi bu listener'dır.
     *
     * Ayrıca her inset değişiminde WebView'e iki CSS değişkeni yazıyoruz: `--android-nav-inset`
     * (WebView'in nav bar bölgesiyle ÖLÇÜLEN gerçek örtüşmesi dp — fit çalışıyorsa 0, bozuksa
     * bar yüksekliği; SDK varsayımı yok, §103) ve `--android-keyboard-inset` (WebView'in
     * klavyeyle FİİLEN örtülen kısmı, gerçek geometriden hesaplanır — alt padding kalktığı için
     * ≥35'te bu değer nav bar derinliğini otomatik İÇERİR; web'de kb + safe-bottom TOPLANMAZ,
     * ya-o-ya-bu kullanılır, bkz. §24/§102). useKeyboardHeight Android'de klavye boşluğu için
     * `--android-keyboard-inset`'i kaynak alır.
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Özel plugin kayıtları super.onCreate'ten ÖNCE olmalı (Capacitor kuralı)
        registerPlugin(LocationSnapshotPlugin.class);
        super.onCreate(savedInstanceState);
        applyDarkSystemBars();

        final float density = getResources().getDisplayMetrics().density;

        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (view, insets) -> {
            // Alt inset kaynağı = systemBars|displayCutout alt değeri — 3-tuş bar, gesture
            // pill ve alt cutout'u kapsar. --android-nav-inset bundan DEĞİL, aşağıdaki post
            // bloğunda WebView'in bu bölgeyle ÖLÇÜLEN gerçek örtüşmesinden yazılır (§103):
            // fit çalışıyorsa örtüşme 0 → çift boşluk imkânsız; fit bozuksa (≥35 zorunlu
            // edge-to-edge veya OEM/eklenti sabotajı) örtüşme = bar yüksekliği → web padler.
            // SDK-kapılı varsayım YOK — §24 kuralı: cihaz-özel formül değil, gerçek geometri.
            final Insets sysBars = insets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            final int navBottomPx = sysBars.bottom;
            // IME (klavye) inset'ini TÜKETMEDEN ÖNCE oku — WebView'in klavyeyle fiilen örtülen kısmını
            // hesaplamak için gerekli (aşağıda tüketiliyor; listener orijinal insets'i okur).
            final int imeBottomPx = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom;

            final WebView webView = (getBridge() != null) ? getBridge().getWebView() : null;

            // API 35+: zorunlu edge-to-edge altında yalnız ÜST+YAN native padding — ALT web
            // katmanının işi (--safe-bottom). setPadding değer değişmediyse layout tetiklemez.
            if (Build.VERSION.SDK_INT >= 35 && webView != null && webView.getParent() instanceof View) {
                ((View) webView.getParent())
                        .setPadding(sysBars.left, sysBars.top, sysBars.right, 0);
            }

            if (webView != null) {
                // Layout sonrası ölç (post): WebView'in gerçek konumu + pencere yüksekliği.
                // kb overlap = WebView alt kenarının klavye tarafından örtülen kısmı;
                // nav overlap = WebView alt kenarının nav bar bölgesiyle örtüşen kısmı.
                // İkisi de cihaz-bağımsız DOĞRU değer (gerçek geometri, varsayım yok).
                webView.post(() -> {
                    final int[] loc = new int[2];
                    webView.getLocationInWindow(loc);
                    final int webViewBottom = loc[1] + webView.getHeight();
                    final int windowHeight = getWindow().getDecorView().getHeight();
                    final int keyboardTop = windowHeight - imeBottomPx; // klavye kapalıyken imeBottomPx=0 → overlap=0
                    final int overlapPx = Math.max(0, webViewBottom - keyboardTop);
                    final int kbDp = Math.round(overlapPx / density);
                    // Nav örtüşmesi: fit düzgünse WebView bar üstünde biter → 0; bozuksa navBottomPx.
                    final int navTop = windowHeight - navBottomPx;
                    final int navOverlapPx = Math.max(0, Math.min(webViewBottom - navTop, navBottomPx));
                    final int navDp = Math.round(navOverlapPx / density);
                    webView.evaluateJavascript(
                        "document.documentElement.style.setProperty('--android-nav-inset','" + navDp + "px');"
                            + "document.documentElement.style.setProperty('--android-keyboard-inset','"
                            + kbDp + "px')",
                        null
                    );
                });
            }
            // Klavye (IME) inset'ini SIFIRLA: decor'un IME inset'ini uygulaması WebView'in klavye için
            // küçülmesine (Android 15/Samsung'da çift sayıma) yol açıyordu. IME inset'ini tüketerek
            // WebView'in klavye için ASLA resize olmamasını sağlıyoruz (tüm cihazlarda tek overlay modeli).
            // API 35+: systemBars+displayCutout da tüketilir (üstte padding olarak uygulandı) —
            // viewport-fit=cover ile env(safe-area-inset-*) değerlerinin 0 kalması bunun sayesinde.
            final WindowInsetsCompat.Builder builder = new WindowInsetsCompat.Builder(insets)
                .setInsets(WindowInsetsCompat.Type.ime(), Insets.NONE);
            if (Build.VERSION.SDK_INT >= 35) {
                builder.setInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout(),
                    Insets.of(0, 0, 0, 0));
            }
            return builder.build();
        });

        // Açılışta hemen bir kez tetikle ki ilk input focus'undan önce değişken set olsun.
        ViewCompat.requestApplyInsets(getWindow().getDecorView());
    }

    @Override
    public void onResume() {
        super.onResume();
        // Splash exit animasyonu / tema geçişi çubuk durumunu sıfırlayabildiği için, çubuklar görünür
        // olduktan sonra bir kez daha pekiştir. Metot idempotent.
        applyDarkSystemBars();
        // Duraklamadayken nav-modu değişimi (gesture↔3-tuş), split-screen geçişi veya OEM'in
        // (MIUI) kaçırdığı dispatch'ler için inset'leri yeniden iste — listener --android-nav-inset'i
        // tazeler, web katmanı salt CSS ile kendini onarır. İdempotent.
        ViewCompat.requestApplyInsets(getWindow().getDecorView());
    }

    private void applyDarkSystemBars() {
        if (Build.VERSION.SDK_INT < 35) {
            // 1) Edge-to-edge'i geri al (Theme.SplashScreen fitsSystemWindows=false → true). Renk
            //    çağrılarından ÖNCE: pencere non-edge-to-edge olunca çubuklar opak boyanır.
            WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

            // 1b) §103 KRİTİK: @capacitor/status-bar v8'in overlaysWebView varsayılanı TRUE —
            //     plugin load()'da decor'a legacy LAYOUT_STABLE|LAYOUT_FULLSCREEN basar. AOSP
            //     30-34'ün varsayılan içerik-inset uygulayıcısı HERHANGİ bir legacy layout
            //     bayrağı görünce hiç fit yapmadan çıkar → decorFits(true) fiilen no-op olur
            //     (Redmi API 30'da alt navbar çakışmasının kökü; dumpsys kanıtı: fitSides= boş,
            //     vsysui=LAYOUT_FULLSCREEN). Bayrakları temizle — bu metot onCreate sonunda
            //     (plugin load()'ından SONRA) + her onResume'da çalışır, plugin'i her zaman ezer.
            //     JS hiçbir yerde StatusBar.overlaysWebView çağırmaz → bayrak geri gelemez.
            final View decorView = getWindow().getDecorView();
            final int vis = decorView.getSystemUiVisibility();
            decorView.setSystemUiVisibility(vis
                    & ~View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    & ~View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    & ~View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);

            // 2) Translucent bayraklarını temizle, sistem çubuğu zeminlerini biz çizelim.
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            getWindow().clearFlags(
                    WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS
                            | WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);

            // 3) Opak koyu renk — Theme.SplashScreen'in ve StatusBar plugin'inin transparent
            //    değerini ezer.
            getWindow().setStatusBarColor(BAR_COLOR);
            getWindow().setNavigationBarColor(BAR_COLOR);
        }
        // API 35+ için renk/decorFits çağrısı YOK (hepsi no-op): koyu zemin, şeffaf nav bar'ın
        // altına uzanan uygulama yüzeyinden (--safe-bottom padding'li bar bg'leri) gelir.
        if (Build.VERSION.SDK_INT >= 35) {
            // OEM'lerin (özellikle MIUI) 3-tuş nav bar'a çizdiği kontrast scrim bandını kapat —
            // koyu zemini uygulama sağlıyor, açık ikonlar aşağıda garanti; scrim yalnız
            // öngörülemeyen tonda bir bant eklerdi.
            getWindow().setNavigationBarContrastEnforced(false);
        }

        // Açık (beyaz) ikonlar: setAppearanceLight*Bars(false) = ikonlar koyu DEĞİL. Her API'de çalışır.
        WindowInsetsControllerCompat barsController =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (barsController != null) {
            barsController.setAppearanceLightStatusBars(false);
            barsController.setAppearanceLightNavigationBars(false);
        }
    }
}
