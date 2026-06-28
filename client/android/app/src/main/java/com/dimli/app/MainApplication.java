package com.dimli.app;

import android.app.Application;

import androidx.appcompat.app.AppCompatDelegate;

public class MainApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        // Uygulama her zaman koyu (dark) — telefon light modunda olsa bile.
        // Application.onCreate hiçbir Activity oluşmadan önce çalışır → ilk frame'den
        // itibaren AppCompat tema ve WebView prefers-color-scheme koyu çözülür.
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES);
    }
}
