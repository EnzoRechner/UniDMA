import { memo, type FC } from 'react';
import { Dimensions, View } from 'react-native';
import { ReservationDetails, UserProfile } from '../lib/types';
import BookingWidgetComponent from './customer-booking-widget-component';

const { width: windowWidth } = Dimensions.get('window');
const WIDGET_WIDTH = windowWidth * 0.9;
const WIDGET_SPACING = 20;

interface Props {
  item: ReservationDetails | { id: null };
  index: number;
  activeIndex: number;
  userProfile: UserProfile;
  onConfirm: (newBookingId?: string) => void;
  realBookingsCount: number; // --- ADDED PROP ---
}

const MemoizedBookingItem: FC<Props> = ({ 
  item, 
  index, 
  activeIndex, 
  userProfile, 
  onConfirm, 
  realBookingsCount // --- ADDED PROP ---
}) => {
  return (
    <View style={{ width: WIDGET_WIDTH, marginHorizontal: WIDGET_SPACING / 2 }}>
      <BookingWidgetComponent
        booking={item.id ? (item as ReservationDetails) : undefined}
        userProfile={userProfile}
        isActive={index === activeIndex}
        onConfirm={onConfirm}
        realBookingsCount={realBookingsCount} // --- PASS PROP ---
      />
    </View>
  );
};

export default memo(MemoizedBookingItem);