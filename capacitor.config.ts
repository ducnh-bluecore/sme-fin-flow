import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7b1f4cbdf4de47b799892408b974c66c',
  appName: 'Control Tower',
  webDir: 'dist',
  server: {
    url: 'https://7b1f4cbd-f4de-47b7-9989-2408b974c66c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0F1117',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0F1117',
    },
  },
};

export default config;
