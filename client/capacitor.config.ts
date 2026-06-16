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
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
    Keyboard: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resize: 'body' as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style: 'dark' as any,
      resizeOnFullScreen: true,
    }
  },
  android: {
    allowMixedContent: true,
  }
};

export default config;
