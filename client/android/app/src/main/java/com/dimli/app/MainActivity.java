package com.dimli.app;

import android.graphics.Color;
import android.os.Bundle;
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
     * Sistem çubukları her zaman OPAK koyu (#0f172a) + açık ikonlar.
     *
     * Kök sorun: Activity launch teması Theme.SplashScreen, pencereyi fitsSystemWindows=false
     * (edge-to-edge) + statusBarColor/navigationBarColor=transparent ile oluşturuyor. Bu durumda
     * renk vermek işe yaramaz; şeffaf çubukların ardındaki beyaz pencere zemini görünür. Çözüm:
     * setDecorFitsSystemWindows(true) ile edge-to-edge'i geri al → çubuklar opak boyanabilir hale gelir
     * ve klavye nav-inset düzeltmesinin varsaydığı non-edge-to-edge durum korunur.
     *
     * Ayrıca her inset değişiminde WebView'e iki CSS değişkeni yazıyoruz: `--android-nav-inset` (navigation
     * bar yüksekliği) ve `--android-keyboard-inset` (WebView'in klavyeyle FİİLEN örtülen kısmı, gerçek
     * geometriden hesaplanır — edge-to-edge/nav-bar/gesture fark etmez, cihaz-bağımsız). useKeyboardHeight
     * Android'de klavye boşluğu için `--android-keyboard-inset`'i kaynak alır (Capacitor'ın cihaz/sürüme
     * göre değişen belirsiz info.keyboardHeight'ı yerine).
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
            // Klavye (IME) inset'ini SIFIRLA: setDecorFitsSystemWindows(true) Android 15'te (Samsung S26)
            // decor'un IME inset'ini de uygulamasına → WebView'in klavye için küçülmesine yol açıyordu.
            // Manuel keyboardHeight offset'i ile birleşince çift sayım oluşuyordu. IME inset'ini tüketerek
            // WebView'in klavye için ASLA resize olmamasını sağlıyoruz (tüm cihazlarda tek overlay modeli).
            // Sistem çubuğu (navigation/status) inset'lerine DOKUNMUYORUZ → koyu çubuklar + nav-inset korunur.
            return new WindowInsetsCompat.Builder(insets)
                .setInsets(WindowInsetsCompat.Type.ime(), Insets.NONE)
                .build();
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

        // 4) Açık (beyaz) ikonlar: setAppearanceLight*Bars(false) = ikonlar koyu DEĞİL.
        WindowInsetsControllerCompat barsController =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (barsController != null) {
            barsController.setAppearanceLightStatusBars(false);
            barsController.setAppearanceLightNavigationBars(false);
        }
    }
}
