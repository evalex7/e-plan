import React, { memo, useCallback } from 'react';
import { FlatList, FlatListProps } from 'react-native';
import { colors } from '@/constants/colors';

interface OptimizedFlatListProps<T> extends Omit<FlatListProps<T>, 'getItemLayout'> {
  itemHeight?: number;
  estimatedItemSize?: number;
}

function OptimizedFlatList<T>({
  itemHeight,
  estimatedItemSize = 80,
  ...props
}: OptimizedFlatListProps<T>) {
  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: itemHeight || estimatedItemSize,
      offset: (itemHeight || estimatedItemSize) * index,
      index,
    }),
    [itemHeight, estimatedItemSize]
  );

  const keyExtractor = useCallback(
    (item: any, index: number) => {
      if (item?.id) return item.id.toString();
      return index.toString();
    },
    []
  );

  return (
    <FlatList
      {...props}
      keyExtractor={keyExtractor}
      getItemLayout={itemHeight ? getItemLayout : undefined}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      style={[
        {
          backgroundColor: colors.gray50,
        },
        props.style,
      ]}
    />
  );
}

export default memo(OptimizedFlatList) as typeof OptimizedFlatList;