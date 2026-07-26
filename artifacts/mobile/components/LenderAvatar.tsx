import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { Lender } from '@/types';

interface Props {
  lender: Lender;
  size?: number;
  fontSize?: number;
  borderWidth?: number;
}

export function LenderAvatar({ lender, size = 40, fontSize, borderWidth = 1.5 }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = lender.name.trim().charAt(0) || '?';
  const showImage = !!lender.imageUri && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [lender.imageUri]);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          backgroundColor: lender.color + '22',
          borderColor: lender.color + '55',
        },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: lender.imageUri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text style={[styles.initial, { color: lender.color, fontSize: fontSize ?? size * 0.4 }]}>
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  image: { width: '100%', height: '100%' },
  initial: { fontFamily: 'Cairo_700Bold', textAlign: 'center' },
});
