import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const shortestSide = Math.min(width, height);
  const isTiny = shortestSide < 360;
  const isSmall = shortestSide < 390;

  return useMemo(
    () => ({
      width,
      height,
      shortestSide,
      isTiny,
      isSmall,
      screenPadding: isTiny ? 12 : isSmall ? 14 : 16,
      formPadding: isTiny ? 14 : isSmall ? 16 : 20,
      cardPadding: isTiny ? 12 : 16,
      compactCardPadding: isTiny ? 10 : 14,
    }),
    [width, height, shortestSide, isTiny, isSmall],
  );
}
