import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Path,
  Rect,
} from 'react-native-svg';

type Props = {
  kind?: 'glass' | 'bottle';
  fillPercent?: number;
  width?: number;
  height?: number;
};

const GLASS_PATH = 'M14 16H50L45 78C45 81 43 82 40 82H24C21 82 19 81 19 78Z';
const BOTTLE_PATH =
  'M26 10H38V20C38 24 40 26 43 28C47 31 49 35 49 40V74C49 79 46 82 42 83H22C18 82 15 79 15 74V40C15 35 17 31 21 28C24 26 26 24 26 20Z';

function waterTop(kind: 'glass' | 'bottle', fill: number) {
  const top = kind === 'bottle' ? 22 : 17;
  const bottom = 81;
  return bottom - ((bottom - top) * fill) / 100;
}

function waveLinePath(y: number) {
  return `M-32 ${y} Q-24 ${y - 1.15} -16 ${y} T0 ${y} T16 ${y} T32 ${y} T48 ${y} T64 ${y} T80 ${y} T96 ${y}`;
}

function waveFillPath(y: number) {
  return `${waveLinePath(y)} V88 H-32 Z`;
}

function waveBackFillPath(y: number) {
  const backY = y - 0.55;
  return `M-40 ${backY} Q-32 ${backY + 0.9} -24 ${backY} T-8 ${backY} T8 ${backY} T24 ${backY} T40 ${backY} T56 ${backY} T72 ${backY} T88 ${backY} T104 ${backY} V88 H-40 Z`;
}

/** Espelha `WaterVesselIcon.vue` — copo/garrafa com nível de água. */
export default function EvolucaoWaterVesselIcon({
  kind = 'glass',
  fillPercent = 70,
  width = 32,
  height = 54,
}: Props) {
  const safeFill = Math.max(0, Math.min(100, Number(fillPercent) || 0));
  const vesselPath = kind === 'bottle' ? BOTTLE_PATH : GLASS_PATH;
  const top = waterTop(kind, safeFill);
  const clipId = useMemo(() => `vessel-${kind}-${Math.random().toString(36).slice(2, 8)}`, [kind]);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 64 88" accessibilityLabel={kind === 'glass' ? 'Copo de água' : 'Garrafa de água'}>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={vesselPath} />
          </ClipPath>
        </Defs>

        <G clipPath={`url(#${clipId})`}>
          {safeFill > 0 ? (
            <>
              <Path d={waveBackFillPath(top)} fill="#8bcbea" />
              <Path d={waveFillPath(top)} fill="#63b2df" />
              <Path
                d={waveLinePath(top)}
                fill="none"
                stroke="rgba(220, 245, 255, 0.78)"
                strokeWidth={1.4}
                strokeLinecap="round"
              />
              {safeFill > 8 ? (
                <>
                  <Circle cx={25} cy={70} r={1.5} fill="rgba(235, 249, 255, 0.82)" opacity={0.7} />
                  <Circle cx={38} cy={75} r={1.1} fill="rgba(235, 249, 255, 0.82)" opacity={0.7} />
                  <Circle cx={33} cy={63} r={0.9} fill="rgba(235, 249, 255, 0.82)" opacity={0.7} />
                </>
              ) : null}
            </>
          ) : null}
        </G>

        <Path
          d={vesselPath}
          fill="rgba(91, 164, 217, 0.04)"
          stroke="#8fc5e7"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {kind === 'bottle' ? (
          <>
            <Rect x={25} y={3} width={14} height={7} rx={2.2} fill="#65aeda" />
            <Path d="M28 5.3h8M28 7.7h8" fill="none" stroke="rgba(255,255,255,0.58)" strokeWidth={0.8} strokeLinecap="round" />
            <Path d="M26 15h12M21 76Q32 79 43 76" fill="none" stroke="#c4e1f1" strokeWidth={1.5} strokeLinecap="round" />
            <Path d="M21 38C19.5 48 19.8 62 21 70" fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth={1.6} strokeLinecap="round" />
          </>
        ) : (
          <Path d="M18 24h28" fill="none" stroke="#c4e1f1" strokeWidth={1.5} strokeLinecap="round" />
        )}
      </Svg>
    </View>
  );
}
