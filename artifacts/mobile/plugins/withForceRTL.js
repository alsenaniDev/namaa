/**
 * Expo config plugin: locks the app to a DETERMINISTIC layout direction.
 *
 * The app is Arabic-only and we render RTL manually via 'row-reverse' +
 * 'textAlign: right' in every component. We must therefore DISABLE React
 * Native's automatic LTR<->RTL flipping, otherwise iOS per-app language
 * settings invert our layout (Arabic device -> double-flip back to LTR,
 * English device -> single-flip to RTL, etc.).
 *
 * RCTI18nUtil reads its allow/force flags from NSUserDefaults BEFORE the
 * React bridge starts, so we set both to NO in didFinishLaunchingWithOptions.
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
          '    // ===== withForceRTL: disable RN auto-flip; layout is manually RTL =====\n' +
          '    let defaults = UserDefaults.standard\n' +
          '    defaults.set(false, forKey: "RCTI18nUtil_allowRTL")\n' +
          '    defaults.set(false, forKey: "RCTI18nUtil_forceRTL")\n' +
          '    defaults.synchronize()\n' +
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
          '  // ===== withForceRTL: disable RN auto-flip; layout is manually RTL =====\n' +
          '  NSUserDefaults *_rtlDefaults = [NSUserDefaults standardUserDefaults];\n' +
          '  [_rtlDefaults setBool:NO forKey:@"RCTI18nUtil_allowRTL"];\n' +
          '  [_rtlDefaults setBool:NO forKey:@"RCTI18nUtil_forceRTL"];\n' +
          '  [_rtlDefaults synchronize];\n' +
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
