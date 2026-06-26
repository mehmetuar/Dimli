package com.dimli.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebView;

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
     * Ayrıca navigation bar inset'ini ölçüp WebView'e `--android-nav-inset` CSS değişkeni olarak yazıyoruz;
     * useKeyboardHeight bu değeri keyboardHeight'tan çıkararak klavye boşluğunu kapatır.
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyDarkSystemBars();

        final float density = getResources().getDisplayMetrics().density;

        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (view, insets) -> {
            int navBottomPx = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
            final int navDp = Math.round(navBottomPx / density);

            final WebView webView = (getBridge() != null) ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.post(() -> webView.evaluateJavascript(
                    "document.documentElement.style.setProperty('--android-nav-inset','" + navDp + "px')",
                    null
                ));
            }
            // Insets'i tüketmeden döndür — Keyboard plugin ve normal layout insets'i almaya devam etsin.
            return insets;
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
