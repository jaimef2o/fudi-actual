import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../lib/theme/colors';

interface AvatarProps {
  uri?: string | null;
  size?: number;
  radius?: number;
}

export default function Avatar({ uri, size = 48, radius }: AvatarProps) {
  const r = radius ?? size / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: r }}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: COLORS.surfaceContainerHighest,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialIcons name="person" size={size * 0.5} color={COLORS.outline} />
    </View>
  );
}
