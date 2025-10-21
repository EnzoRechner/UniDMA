// In app/customer/customer-booking-memory.tsx

import { memo, type FC } from 'react';
import { View, Dimensions } from 'react-native';
import BookingWidgetComponent from './customer-booking-widget-component';
import { ReservationDetails, UserProfile } from '../lib/types';

const { width: windowWidth } = Dimensions.get('window');
const WIDGET_WIDTH = windowWidth * 0.9;
const WIDGET_SPACING = 20;

interface Props {
  item: ReservationDetails | { id: null };
  index: number;
  activeIndex: number;
  userProfile: UserProfile;
  onConfirm: () => void;
}

const MemoizedBookingItem: FC<Props> = ({ item, index, activeIndex, userProfile, onConfirm }) => {
  return (
    <View style={{ width: WIDGET_WIDTH, marginHorizontal: WIDGET_SPACING / 2 }}>
      <BookingWidgetComponent
        booking={item.id ? (item as ReservationDetails) : undefined}
        userProfile={userProfile}
        isActive={index === activeIndex}
        onConfirm={onConfirm}
      />
    </View>
  );
};

export default memo(MemoizedBookingItem);