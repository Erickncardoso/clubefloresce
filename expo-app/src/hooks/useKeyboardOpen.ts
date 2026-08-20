import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';

function readKeyboardHeight(event: KeyboardEvent) {
  const frame = event.endCoordinates;
  if (!frame) return 0;
  const windowHeight = Dimensions.get('window').height;
  const fromScreen = windowHeight - frame.screenY;
  if (fromScreen > 0) return fromScreen;
  return Math.max(0, frame.height);
}

/** Altura do teclado em px (0 quando fechado). */
export function useKeyboardInset() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const onShow = (event: KeyboardEvent) => setHeight(readKeyboardHeight(event));
    const onHide = () => setHeight(0);

    const showSubs = [
      Keyboard.addListener('keyboardWillShow', onShow),
      Keyboard.addListener('keyboardDidShow', onShow),
    ];
    const hideSubs = [
      Keyboard.addListener('keyboardWillHide', onHide),
      Keyboard.addListener('keyboardDidHide', onHide),
    ];

    return () => {
      showSubs.forEach((sub) => sub.remove());
      hideSubs.forEach((sub) => sub.remove());
    };
  }, []);

  return height;
}

/** True enquanto o teclado nativo estiver visível. */
export function useKeyboardOpen() {
  return useKeyboardInset() > 0;
}
