import { Platform, ScrollViewProps } from 'react-native';

export const iosScrollViewObserverProps: Pick<
  ScrollViewProps,
  'automaticallyAdjustContentInsets' | 'automaticallyAdjustsScrollIndicatorInsets' | 'contentInsetAdjustmentBehavior'
> = Platform.OS === 'ios'
  ? {
      automaticallyAdjustContentInsets: false,
      automaticallyAdjustsScrollIndicatorInsets: false,
      contentInsetAdjustmentBehavior: 'never',
    }
  : {};
