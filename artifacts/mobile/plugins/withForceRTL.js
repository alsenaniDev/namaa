/**
 * Expo config plugin: forces RTL at the iOS native layer.
 *
 * Inserts `UIView.appearance().semanticContentAttribute = .forceRightToLeft`
 * (Swift) or `[UIView appearance].semanticContentAttribute = ...` (ObjC)
 * at the top of `application(_:didFinishLaunchingWithOptions:)` in the iOS
 * AppDelegate.  This runs BEFORE the React Native JavaScript bundle loads,
 * ensuring the native root view and all UIKit components start in RTL mode.
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
        // Swift AppDelegate (Expo SDK 50+, new architecture)
        const result = mergeContents({
          tag: TAG,
          src: contents,
          newSrc:
            '    // Force RTL for Arabic-first app (added by withForceRTL plugin)\n' +
            '    UIView.appearance().semanticContentAttribute = .forceRightToLeft',
          anchor: /override\s+func\s+application\s*\(.*didFinishLaunchingWithOptions.*\)\s*->\s*Bool\s*\{/,
          offset: 1,
          comment: '//',
        });
        modResults.contents = result.contents;
      } else {
        // ObjC / ObjC++ AppDelegate (.m / .mm)
        const result = mergeContents({
          tag: TAG,
          src: contents,
          newSrc:
            '  // Force RTL for Arabic-first app (added by withForceRTL plugin)\n' +
            '  [UIView appearance].semanticContentAttribute = UISemanticContentAttributeForceRightToLeft;',
          anchor: /application:.*didFinishLaunchingWithOptions[^{]*\{/,
          offset: 1,
          comment: '//',
        });
        modResults.contents = result.contents;
      }
    } catch (e) {
      // If the anchor isn't found (unexpected AppDelegate format), warn but
      // don't fail the build — the JS-layer forceRTL in index.js still applies.
      console.warn('[withForceRTL] Could not patch AppDelegate:', e.message);
    }

    return config;
  });
};
