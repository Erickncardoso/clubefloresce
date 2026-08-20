import type { ReactNode } from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

type NavIconProps = {
  size?: number;
  color?: string;
};

function NavIconFrame({ size = 24, children }: NavIconProps & { children: ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

/** Espelha `frontend2/components/icons/nav/NavHomeIcon.vue` — leve ajuste óptico no eixo Y. */
export function NavHomeIcon({ size = 24, color = 'currentColor' }: NavIconProps) {
  return (
    <NavIconFrame size={size}>
      <G transform="translate(0 -0.8)">
        <Path d="m3.75 10.65 7.1-6a1.75 1.75 0 0 1 2.3 0l7.1 6" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M5.65 9.4v8.7a1.8 1.8 0 0 0 1.8 1.8h9.1a1.8 1.8 0 0 0 1.8-1.8V9.4" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9.55 19.9v-4.65a1.35 1.35 0 0 1 1.35-1.35h2.2a1.35 1.35 0 0 1 1.35 1.35v4.65" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      </G>
    </NavIconFrame>
  );
}

export function NavEvolutionIcon({ size = 24, color = 'currentColor' }: NavIconProps) {
  return (
    <NavIconFrame size={size}>
      <Path d="M4.25 19.5h15.5" stroke={color} strokeWidth={1.75} strokeLinecap="round" opacity={0.55} />
      <Path d="m4.75 16.4 4.45-4.45 3.15 2.8 6.9-7.35" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15.65 7.4h3.6V11" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={4.75} cy={16.4} r={1} fill={color} />
    </NavIconFrame>
  );
}

export function NavLibraryIcon({ size = 24, color = 'currentColor' }: NavIconProps) {
  return (
    <NavIconFrame size={size}>
      <Path d="M4 5.15h4.55A3.45 3.45 0 0 1 12 8.6v11.1a3.45 3.45 0 0 0-3.45-3.45H4V5.15Z" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 5.15h-4.55A3.45 3.45 0 0 0 12 8.6v11.1a3.45 3.45 0 0 1 3.45-3.45H20V5.15Z" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.75 8.25h2.1M15.15 8.25h2.1" stroke={color} strokeWidth={1.75} strokeLinecap="round" opacity={0.55} />
    </NavIconFrame>
  );
}

export function NavDiarioIcon({ size = 24, color = 'currentColor' }: NavIconProps) {
  return (
    <NavIconFrame size={size}>
      <Circle cx={12} cy={12} r={6.35} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={12} r={3.15} stroke={color} strokeWidth={1.7} opacity={0.5} />
      <Path d="M3.3 4.65v5.25M5.25 4.65v5.25M3.3 7.2h1.95M4.28 9.9v9.45" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20.1 4.65c-1.55 1.55-1.7 4.6-.3 6.15l.3.3v8.25" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </NavIconFrame>
  );
}

export function NavCommunityIcon({ size = 24, color = 'currentColor' }: NavIconProps) {
  return (
    <NavIconFrame size={size}>
      <Circle cx={8.25} cy={8.15} r={2.65} stroke={color} strokeWidth={1.75} />
      <Circle cx={16.35} cy={8.15} r={2.65} stroke={color} strokeWidth={1.75} />
      <Path d="M3.75 19.1c.35-3.15 2.15-4.85 4.5-4.85 1.6 0 2.95.8 3.75 2.3" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 16.55c.85-1.5 2.35-2.3 4.35-2.3 2.35 0 4.15 1.7 4.5 4.85" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9.6 19.1h4.8" stroke={color} strokeWidth={1.75} strokeLinecap="round" opacity={0.55} />
    </NavIconFrame>
  );
}
