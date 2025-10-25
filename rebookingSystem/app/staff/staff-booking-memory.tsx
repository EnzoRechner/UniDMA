import { memo, type FC } from 'react';
import { View } from 'react-native';
import { ReservationDetails } from '../lib/types';
import BookingWidgetComponent from './staff-all-widget-component';

interface Props {
  item: ReservationDetails | { id: null };
  index: number;
  activeIndex: number;
  onConfirm: () => void;
}

const MemoizedBookings: FC<Props> = ({ item, index, activeIndex, onConfirm }) => {
  return (
    <View>
      <BookingWidgetComponent
        booking={item.id ? (item as ReservationDetails) : undefined}
        isActive={index === activeIndex}
        onConfirm={onConfirm}
      />
    </View>
  );
};

export default memo(MemoizedBookings);