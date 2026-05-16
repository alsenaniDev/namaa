// Custom entry point.
//
// We DO NOT force a fixed direction here.  I18nManager.isRTL is persisted in
// NSUserDefaults / SharedPreferences across launches, so it already reflects
// the user's last language choice.  LanguageContext handles the very first
// install (bootstraps to Arabic) and every language switch (calls forceRTL
// then prompts to restart).  This ensures Arabic → RTL and English → LTR.

const { I18nManager, Platform } = require('react-native');

if (Platform.OS !== 'web') {
  I18nManager.allowRTL(true);
}

require('expo-router/entry');
