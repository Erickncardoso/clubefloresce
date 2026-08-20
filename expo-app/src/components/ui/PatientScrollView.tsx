import { forwardRef } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { usePatientScrollProps } from '@/hooks/usePatientScrollProps';

type Props = ScrollViewProps;

const PatientScrollView = forwardRef<ScrollView, Props>(function PatientScrollView(
  { onScroll, scrollEventThrottle, horizontal, ...rest },
  ref,
) {
  const scrollProps = usePatientScrollProps();
  const trackTabBar = !horizontal;

  return (
    <ScrollView
      ref={ref}
      {...rest}
      horizontal={horizontal}
      scrollEventThrottle={
        scrollEventThrottle ?? (trackTabBar ? scrollProps.scrollEventThrottle : 16)
      }
      onScroll={(event) => {
        if (trackTabBar) scrollProps.onScroll(event);
        onScroll?.(event);
      }}
    />
  );
});

export default PatientScrollView;
