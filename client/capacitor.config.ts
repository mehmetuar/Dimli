import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sahapro.app',
  appName: 'DIMLİ',
  webDir: 'dist',
  server: {
    allowNavigation: [
      "*.openstreetmap.org"
    ]
  }
};

export default config;
