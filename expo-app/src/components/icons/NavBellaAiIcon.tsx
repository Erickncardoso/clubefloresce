import Svg, { Circle, G, Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

/** Sparkle IA — estrelas + pontos (Gemini / Apple Intelligence vibe). */
export default function NavBellaAiIcon({ size = 22, color = '#ffffff' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.8 13.55 8.15 18.9 9.7 13.55 11.25 12 16.6 10.45 11.25 5.1 9.7 10.45 8.15Z"
        fill={color}
      />
      <Path
        d="M19.1 4.35 19.72 6.22 21.6 6.84 19.72 7.46 19.1 9.33 18.48 7.46 16.6 6.84 18.48 6.22Z"
        fill={color}
        opacity={0.88}
      />
      <Path
        d="M5.4 14.95 5.88 16.42 7.35 16.9 5.88 17.38 5.4 18.85 4.92 17.38 3.45 16.9 4.92 16.42Z"
        fill={color}
        opacity={0.72}
      />
      <Circle cx={12} cy={9.7} r={1.15} fill={color} opacity={0.95} />
      <Circle cx={15.8} cy={13.2} r={0.75} fill={color} opacity={0.55} />
      <Circle cx={8.4} cy={12.5} r={0.65} fill={color} opacity={0.5} />
    </Svg>
  );
}
