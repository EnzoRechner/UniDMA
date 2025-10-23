import { memo, type FC } from 'react';
import { View, Dimensions } from 'react-native';
import BookingWidgetComponent from './staff-all-widget-component';
import { ReservationDetails, UserProfile } from '../lib/types';

const { width: windowWidth } = Dimensions.get('window');
const WIDGET_WIDTH = windowWidth * 0.9;
const WIDGET_SPACING = 20;

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