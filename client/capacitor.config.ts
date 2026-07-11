import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dimli.app',
  appName: 'Dimli',
  webDir: 'dist',
  server: {
    iosScheme: 'https',
    androidScheme: 'https',
    allowNavigation: [
      "*.openstreetmap.org"
    ]
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f172a',
    },
    SplashScreen: {
      // DİKKAT: 0 YAPMA — plugin launchShowDuration===0'da launch splash'ı HİÇ göstermez
      // (SplashScreen.swift showOnLaunch erken döner); autoHide:false iken süre zaten kullanılmaz.
      launchShowDuration: 2000,
      // Native splash JS'e kadar tutulur; AnimatedSplash ilk boyalı karede hide() çağırır
      // (lacivert→lacivert dikişsiz geçiş). Sigorta: index.tsx'te 8sn'lik yedek hide var.
      launchAutoHide: false,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
    Keyboard: {
      // Her iki platformda da TEK model: klavye WebView'in üstüne biner (overlay) ve
      // boşluk uygulama tarafında keyboardHeight offset'i ile yönetilir (paddingBottom/bottom).
      // Android'de resizeOnFullScreen native resize bu cihazlarda WebView'i küçültmüyordu;
      // false bırakılır ki olası kısmi-resize/çift-offset olmasın. İçeriği klavye üstüne
      // taşıma işini useKeyboardHeight (iOS+Android) yapar; useKeyboardScroll yalnızca iOS'ta.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resize: 'none' as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style: 'dark' as any,
      resizeOnFullScreen: false,
    }
  },
  android: {
    allowMixedContent: true,
  }
};

export default config;
