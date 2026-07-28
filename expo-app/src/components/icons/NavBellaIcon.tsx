import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

/** Espelha `frontend/components/icons/nav/NavBellaIcon.vue`. */
export default function NavBellaIcon({ size = 24, color = '#ffffff' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.35 5.1h11.3a2.85 2.85 0 0 1 2.85 2.85v6.2A2.85 2.85 0 0 1 17.65 17H11l-4.15 2.55V17h-.5a2.85 2.85 0 0 1-2.85-2.85v-6.2A2.85 2.85 0 0 1 6.35 5.1Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 7.65c.22 1.58 1.1 2.46 2.68 2.68-1.58.22-2.46 1.1-2.68 2.68-.22-1.58-1.1-2.46-2.68-2.68 1.58-.22 2.46-1.1 2.68-2.68Z"
        fill={color}
      />
      <Path
        d="M16.7 7.05c.1.72.5 1.12 1.22 1.22-.72.1-1.12.5-1.22 1.22-.1-.72-.5-1.12-1.22-1.22.72-.1 1.12-.5 1.22-1.22Z"
        fill={color}
        opacity={0.8}
      />
    </Svg>
  );
}
