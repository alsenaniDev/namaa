export interface DirValues {
  isRTL: boolean;
  row: 'row-reverse' | 'row';
  textAlign: 'right' | 'left';
  chevronDetail: string;
  chevronBack: string;
}

/**
 * The app is Arabic-only with a deterministic, manually-controlled RTL layout.
 *
 * React Native's automatic LTR<->RTL flipping is DISABLED at the native layer
 * (see plugins/withForceRTL.js) and at the JS layer (see index.js). That makes
 * I18nManager.isRTL effectively false and immune to iOS per-app language
 * settings, so we can safely hardcode our RTL primitives here without any
 * double-flip risk.
 */
export function useDir(): DirValues {
  return {
    isRTL: true,
    row: 'row-reverse',
    textAlign: 'right',
    chevronDetail: 'chevron-left',
    chevronBack: 'chevron-right',
  };
}
