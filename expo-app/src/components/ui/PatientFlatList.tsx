import { forwardRef } from 'react';
import { FlatList, type FlatListProps } from 'react-native';
import { usePatientScrollProps } from '@/hooks/usePatientScrollProps';

type Props<ItemT> = FlatListProps<ItemT>;

function PatientFlatListInner<ItemT>(
  { onScroll, scrollEventThrottle, ...rest }: Props<ItemT>,
  ref: React.Ref<FlatList<ItemT>>,
) {
  const scrollProps = usePatientScrollProps();

  return (
    <FlatList
      ref={ref}
      {...rest}
      scrollEventThrottle={scrollEventThrottle ?? scrollProps.scrollEventThrottle}
      onScroll={(event) => {
        scrollProps.onScroll(event);
        onScroll?.(event);
      }}
    />
  );
}

const PatientFlatList = forwardRef(PatientFlatListInner) as <ItemT>(
  props: Props<ItemT> & { ref?: React.Ref<FlatList<ItemT>> },
) => React.ReactElement | null;

export default PatientFlatList;
