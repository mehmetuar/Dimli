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
     * Sistem çubukları her zaman OPAK koyu (#0f172a) + açık ikonlar — iki rejim:
     *
     * API < 35 (Android 14-): Activity launch teması Theme.SplashScreen pencereyi edge-to-edge
     * açar; setDecorFitsSystemWindows(true) ile geri alınır → çubuklar opak boyanabilir ve
     * klavye nav-inset düzeltmesinin varsaydığı non-edge-to-edge durum korunur (eski davranış).
     *
     * API >= 35 (Android 15/16): edge-to-edge ZORUNLU — setDecorFitsSystemWindows(true),
     * setStatusBarColor/setNavigationBarColor no-op (targetSdk 36'da opt-out da kaldırıldı).
     * Aynı görünüm şöyle yeniden üretilir:
     *   1) WebView'in parent'ına systemBars+displayCutout inset'leri kadar padding verilir →
     *      WebView bugünkü gibi çubukların ARASINDA kalır; şeffaf çubukların ardında
     *      windowBackground (dimliPitch #0f172a) görünür → çubuklar opak koyu görünür.
     *   2) Dönüşte systemBars+displayCutout inset'leri TÜKETİLİR (Insets.of(0,0,0,0);
     *      CONSUMED değil — Chromium yeniden hesaplama bug'ı): index.html'de viewport-fit=cover
     *      olduğundan tüketilmezse Chromium ≥140 gerçek env(safe-area-inset-*) üretir ve
     *      native padding ile ÇİFT boşluk oluşurdu. Bu sayede env() WebView içinde 0 kalır.
     * Capacitor core'un SystemBars inset otomasyonu kapalıdır (capacitor.config.ts →
     * SystemBars.insetsHandling='disable'); tek inset otoritesi bu listener'dır.
     *
     * Ayrıca her inset değişiminde WebView'e iki CSS değişkeni yazıyoruz: `--android-nav-inset`
     * (navigation bar yüksekliği) ve `--android-keyboard-inset` (WebView'in klavyeyle FİİLEN
     * örtülen kısmı, gerçek geometriden hesaplanır — edge-to-edge/nav-bar/gesture fark etmez,
     * cihaz-bağımsız). useKeyboardHeight Android'de klavye boşluğu için `--android-keyboard-inset`'i
     * kaynak alır (Capacitor'ın cihaz/sürüme göre değişen belirsiz info.keyboardHeight'ı yerine).
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyDarkSystemBars();

        final float density = getResources().getDisplayMetrics().density;

        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (view, insets) -> {
            final int navBottomPx = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
            final int navDp = Math.round(navBottomPx / density);
            // IME (klavye) inset'ini TÜKETMEDEN ÖNCE oku — WebView'in klavyeyle fiilen örtülen kısmını
            // hesaplamak için gerekli (aşağıda tüketiliyor; listener orijinal insets'i okur).
            final int imeBottomPx = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom;

            final WebView webView = (getBridge() != null) ? getBridge().getWebView() : null;

            // API 35+: zorunlu edge-to-edge altında bugünkü geometriyi (çubuklar arası WebView)
            // parent padding'i ile yeniden üret. setPadding değer değişmediyse layout tetiklemez.
            if (Build.VERSION.SDK_INT >= 35 && webView != null && webView.getParent() instanceof View) {
                final Insets sysBars = insets.getInsets(
                        WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
                ((View) webView.getParent())
                        .setPadding(sysBars.left, sysBars.top, sysBars.right, sysBars.bottom);
            }

            if (webView != null) {
                // Layout sonrası ölç (post): WebView'in gerçek konumu + pencere yüksekliği + klavye tepesi.
                // overlap = WebView alt kenarının klavye tarafından örtülen kısmı → cihaz-bağımsız DOĞRU değer.
                webView.post(() -> {
                    final int[] loc = new int[2];
                    webView.getLocationInWindow(loc);
                    final int webViewBottom = loc[1] + webView.getHeight();
                    final int windowHeight = getWindow().getDecorView().getHeight();
                    final int keyboardTop = windowHeight - imeBottomPx; // klavye kapalıyken imeBottomPx=0 → overlap=0
                    final int overlapPx = Math.max(0, webViewBottom - keyboardTop);
                    final int kbDp = Math.round(overlapPx / density);
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
    }

    private void applyDarkSystemBars() {
        if (Build.VERSION.SDK_INT < 35) {
            // 1) Edge-to-edge'i geri al (Theme.SplashScreen fitsSystemWindows=false → true). Renk
            //    çağrılarından ÖNCE: pencere non-edge-to-edge olunca çubuklar opak boyanır.
            WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

            // 2) Translucent bayraklarını temizle, sistem çubuğu zeminlerini biz çizelim.
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            getWindow().clearFlags(
                    WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS
                            | WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);

            // 3) Opak koyu renk — Theme.SplashScreen'in transparent değerini ezer.
            getWindow().setStatusBarColor(BAR_COLOR);
            getWindow().setNavigationBarColor(BAR_COLOR);
        }
        // API 35+ için renk/decorFits çağrısı YOK (hepsi no-op): koyu zemin, şeffaf çubukların
        // ardındaki windowBackground(dimliPitch) + onCreate'teki parent padding'inden gelir.

        // Açık (beyaz) ikonlar: setAppearanceLight*Bars(false) = ikonlar koyu DEĞİL. Her API'de çalışır.
        WindowInsetsControllerCompat barsController =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (barsController != null) {
            barsController.setAppearanceLightStatusBars(false);
            barsController.setAppearanceLightNavigationBars(false);
        }
    }
}
