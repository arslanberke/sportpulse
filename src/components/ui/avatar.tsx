import { Image } from 'expo-image';
import { Text, View } from 'react-native';

interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Circular avatar: photo when available, otherwise initials on an accent tint. */
export function Avatar({ name, imageUrl, size = 'md' }: AvatarProps) {
  const box = size === 'sm' ? 'h-9 w-9' : size === 'lg' ? 'h-16 w-16' : 'h-12 w-12';
  const px = size === 'sm' ? 36 : size === 'lg' ? 64 : 48;
  const label = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-xl' : 'text-base';
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: px, height: px, borderRadius: px / 2 }}
        cachePolicy="memory-disk"
        transition={120}
      />
    );
  }
  return (
    <View className={`${box} items-center justify-center rounded-full bg-primary-light`}>
      <Text className={`${label} font-bold text-primary`}>{initials(name) || '?'}</Text>
    </View>
  );
}
