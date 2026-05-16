/**
 * Expo config plugin: forces RTL at the iOS native layer for React Native.
 *
 * React Native's layout engine (Yoga) reads RTL state from RCTI18nUtil, which
 * itself reads from NSUserDefaults keys "RCTI18nUtil_allowRTL" and
 * "RCTI18nUtil_forceRTL". These MUST be set BEFORE the React bridge starts,
 * otherwise the first JS frame renders LTR and a subsequent forceRTL(true)
 * only takes effect on the next cold launch.
 *
 * We also set UIView.appearance().semanticContentAttribute so native UIKit
 * chrome (nav bar, modals, etc.) matches.
 */

const { withAppDelegate } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

const TAG = 'withForceRTL';

module.exports = function withForceRTL(config) {
  return withAppDelegate(config, (config) => {
    const { modResults } = config;
    const { contents, language } = modResults;

    try {
      if (language === 'swift') {
        const swiftSnippet =
          '    // ===== withForceRTL: lock app to RTL for Arabic =====\n' +
          '    let defaults = UserDefaults.standard\n' +
          '    defaults.set(true, forKey: "RCTI18nUtil_allowRTL")\n' +
          '    defaults.set(true, forKey: "RCTI18nUtil_forceRTL")\n' +
          '    defaults.synchronize()\n' +
          '    UIView.appearance().semanticContentAttribute = .forceRightToLeft\n' +
          '    // ===== end withForceRTL =====';

        const result = mergeContents({
          tag: TAG,
          src: contents,
          newSrc: swiftSnippet,
          anchor: /func\s+application\s*\([\s\S]*?didFinishLaunchingWithOptions[\s\S]*?\)\s*->\s*Bool\s*\{/,
          offset: 1,
          comment: '//',
        });
        modResults.contents = result.contents;
      } else {
        const objcSnippet =
          '  // ===== withForceRTL: lock app to RTL for Arabic =====\n' +
          '  NSUserDefaults *_rtlDefaults = [NSUserDefaults standardUserDefaults];\n' +
          '  [_rtlDefaults setBool:YES forKey:@"RCTI18nUtil_allowRTL"];\n' +
          '  [_rtlDefaults setBool:YES forKey:@"RCTI18nUtil_forceRTL"];\n' +
          '  [_rtlDefaults synchronize];\n' +
          '  [UIView appearance].semanticContentAttribute = UISemanticContentAttributeForceRightToLeft;\n' +
          '  // ===== end withForceRTL =====';

        const result = mergeContents({
          tag: TAG,
          src: contents,
          newSrc: objcSnippet,
          anchor: /application:[\s\S]*?didFinishLaunchingWithOptions[\s\S]*?\{/,
          offset: 1,
          comment: '//',
        });
        modResults.contents = result.contents;
      }
    } catch (e) {
      console.warn('[withForceRTL] Could not patch AppDelegate:', e.message);
    }

    return config;
  });
};
