import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { BRAND, SPRINT_P, SPRINT_S, sprintPath } from '@/constants/brand';

const sPath = sprintPath([SPRINT_S]);
const pPath = sprintPath(SPRINT_P);

export function BrandMark({ width = 160 }: { width?: number }) {
  return (
    <Svg width={width} height={width * 0.75} viewBox="0 0 160 120" accessible={false}>
      <G transform={BRAND.transform}>
        <Path d={sPath} fill={BRAND.green} />
        <Path d={pPath} fill={BRAND.mint} fillRule="evenodd" />
      </G>
    </Svg>
  );
}

export function BrandIcon({ size = 80 }: { size?: number }) {
  return (
    <View accessibilityLabel="SportPulse" accessibilityRole="image" style={{ width: size, height: size, borderRadius: size * 0.24, backgroundColor: BRAND.navy, alignItems: 'center', justifyContent: 'center' }}>
      <BrandMark width={size * 0.78} />
    </View>
  );
}
