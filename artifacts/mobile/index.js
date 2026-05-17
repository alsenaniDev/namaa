// Custom entry point.
//
// The app is Arabic-only and renders RTL MANUALLY via 'row-reverse' and
// 'textAlign: right' throughout. We disable React Native's automatic
// LTR<->RTL flipping so iOS device/per-app language settings cannot invert
// our layout. See plugins/withForceRTL.js for the native counterpart.

const { I18nManager, Platform } = require('react-native');

if (Platform.OS !== 'web') {
  try {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
  } catch {}
}

require('expo-router/entry');
