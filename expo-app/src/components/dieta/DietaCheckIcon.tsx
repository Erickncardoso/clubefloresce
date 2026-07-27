import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const GREEN = '#63ba8a';
const GRAY = '#e2e8f0';

const UNCHECKED_BLOB =
  'M151.255 667.282C227.952 779.244 360.846 838.021 487.002 826.266C640.206 812.026 746.435 732.08 805.69 586.429C813.049 568.174 821.029 535.107 829.631 487.225C831.496 476.447 837.505 466.826 846.374 460.423C855.242 454.019 866.265 451.342 877.083 452.963L879.807 453.393C890.506 454.982 900.136 460.764 906.586 469.471C913.036 478.178 915.778 489.1 914.213 499.841C903.031 575.916 883.152 637.846 854.575 685.632C750.783 859.811 554.954 946.829 355.685 903.249C266.42 883.752 188.289 837.83 121.293 765.482C98.7375 741.207 84.6405 724.96 79.0017 716.741C73.4585 708.617 63.4234 689.646 48.8963 659.828C5.69739 571.233 -8.87751 481.778 5.1717 391.462C36.5674 189.902 188.528 38.8028 388.371 4.9704C443.325 -4.39563 508.267 -0.524902 583.196 16.5824C593.767 18.9855 602.959 25.4626 608.762 34.5968C614.565 43.7311 616.507 54.779 614.162 65.324L613.445 68.0477C611.07 78.7259 604.61 88.0502 595.447 94.025C586.283 99.9999 575.145 102.151 564.416 100.017C516.63 90.6505 482.893 86.1108 463.205 86.3975C305.987 88.9779 193.068 159.128 124.447 296.846C67.8197 410.242 74.5576 555.463 151.255 667.282Z';

const CHECKED_BLOB =
  'M418.112 568.386C463.031 555.866 499.54 530.969 527.638 493.696C558.7 457.666 579.152 410.645 588.996 352.633C590.325 344.784 594.303 337.623 600.271 332.332C606.24 327.041 613.844 323.936 621.826 323.531L622.972 323.388C626.782 323.198 630.608 323.795 634.144 325.131C637.679 326.467 640.827 328.505 643.334 331.082C645.842 333.659 647.64 336.704 648.585 339.973C649.53 343.242 649.596 346.645 648.777 349.909L619.245 466.889L582.115 528.962C538.056 577.417 487.498 612.253 430.441 633.47L356.898 647.089C266.486 656.264 188.881 634.33 124.082 581.288C39.3091 511.903 -2.02627 422.161 0.0763319 312.062C1.03206 261.887 18.0919 207.985 51.2557 150.355C71.8994 114.373 93.69 104.624 115.767 76.8128C119.877 71.6519 130.103 63.624 146.446 52.7288C193.181 21.668 245.03 4.32168 301.991 0.689952C347.388 -2.1772 390.587 3.89166 431.588 18.8964C433.586 19.6536 435.316 20.9814 436.565 22.7146C437.814 24.4479 438.526 26.51 438.612 28.6446C439.281 50.1483 435.506 62.3814 427.287 65.3441C415.627 69.6448 401.721 70.3138 385.569 67.3511C310.64 54.0667 245.316 64.5797 189.597 98.8899C122.218 140.464 81.0743 198.81 66.165 273.929C51.2556 348.571 67.7898 418.147 115.767 482.658C182.955 572.878 275.9 605.898 394.601 581.718C402.916 579.998 410.753 575.553 418.112 568.386Z';

const CHECK_PATH =
  'M332.097 354.497L645.193 23.0548C650.99 16.9511 658.801 13.1527 667.181 12.3621C675.562 11.5715 683.946 13.8421 690.782 18.7541L691.355 19.1841C694.45 21.4902 697.022 24.4245 698.902 27.7944C700.783 31.1643 701.931 34.8937 702.269 38.7381C702.607 42.5824 702.129 46.4549 700.866 50.1015C699.603 53.7481 697.583 57.0865 694.939 59.8978L332.097 443.666C330.71 445.118 328.813 445.974 326.807 446.054C324.801 446.135 322.843 445.432 321.345 444.096L182.286 318.945C176.491 313.677 172.932 306.396 172.345 298.605C171.758 290.815 174.188 283.11 179.132 277.084L181.569 274.217C185.685 269.213 191.615 266.042 198.063 265.398C204.51 264.753 210.95 266.687 215.975 270.777L319.481 355.358C321.307 356.827 323.619 357.554 325.957 357.395C328.295 357.235 330.487 356.201 332.097 354.497Z';

type Props = {
  completed: boolean;
};

/** Espelha `frontend/components/dieta/CheckIcon.vue` — blob cinza ↔ check verde animado. */
export default function DietaCheckIcon({ completed }: Props) {
  const skipNext = useRef(completed);
  const grayOpacity = useSharedValue(completed ? 0 : 1);
  const greenOpacity = useSharedValue(completed ? 1 : 0);
  const blobOpacity = useSharedValue(completed ? 1 : 0);
  const wipe = useSharedValue(completed ? 1 : 0);

  useEffect(() => {
    if (completed && skipNext.current) {
      skipNext.current = false;
      grayOpacity.value = 0;
      greenOpacity.value = 1;
      blobOpacity.value = 1;
      wipe.value = 1;
      return;
    }

    if (completed) {
      grayOpacity.value = withTiming(0, { duration: 200 });
      greenOpacity.value = withTiming(1, { duration: 0 });
      blobOpacity.value = withTiming(1, { duration: 400 });
      wipe.value = withDelay(200, withTiming(1, { duration: 400 }));
      return;
    }

    wipe.value = withTiming(0, { duration: 400 });
    blobOpacity.value = withDelay(200, withTiming(0, { duration: 400 }));
    grayOpacity.value = withDelay(400, withTiming(1, { duration: 200 }));
    greenOpacity.value = withDelay(400, withTiming(0, { duration: 0 }));
  }, [completed, blobOpacity, grayOpacity, greenOpacity, wipe]);

  const grayStyle = useAnimatedStyle(() => ({ opacity: grayOpacity.value }));
  const greenWrapStyle = useAnimatedStyle(() => ({ opacity: greenOpacity.value }));
  const blobStyle = useAnimatedStyle(() => ({ opacity: blobOpacity.value }));
  const wipeStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, wipe.value * 100))}%`,
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.layer, grayStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 915 915">
          <Path d={UNCHECKED_BLOB} fill={GRAY} />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.layer, greenWrapStyle]}>
        <Animated.View style={[StyleSheet.absoluteFillObject, blobStyle]}>
          <Svg width="100%" height="100%" viewBox="0 0 703 650">
            <Path d={CHECKED_BLOB} fill={GREEN} />
          </Svg>
        </Animated.View>
        <View style={styles.checkClip} pointerEvents="none">
          <Animated.View style={[styles.checkWipe, wipeStyle]}>
            <Svg width={SIZE} height={SIZE} viewBox="0 0 703 650">
              <Path d={CHECK_PATH} fill={GREEN} />
            </Svg>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const SIZE = 28;

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    flexShrink: 0,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  checkClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  checkWipe: {
    height: '100%',
    overflow: 'hidden',
  },
});
