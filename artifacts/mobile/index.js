// Custom entry point — ensures RTL is configured at the very first line of JS
// execution, before expo-router/entry loads React Native's rendering tree.
//
// WHY require() and not import:
//   ESM `import` statements are hoisted by Metro/Babel, so:
//     import { I18nManager } from 'react-native';
//     I18nManager.forceRTL(true);        // ← runs AFTER all imports are resolved
//     import 'expo-router/entry';         // ← already ran before this line
//   require() is sequential — forceRTL runs between the two loads.
//
// This is the only reliable place to force RTL before Fabric (New Architecture)
// creates the native root view.

const { I18nManager, Platform } = require('react-native');

if (Platform.OS !== 'web') {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

require('expo-router/entry');
