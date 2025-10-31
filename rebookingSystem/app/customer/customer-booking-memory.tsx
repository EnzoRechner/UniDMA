import { memo, useEffect, useRef, type FC } from 'react';
import { Animated, Dimensions, Easing } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
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
  // --- FIX: Changed prop name for clarity ---
  onConfirm: (newBookingData?: ReservationDetails) => void;
  realBookingsCount: number;
  isEditMode?: boolean;
  onLongPress?: () => void;
}

const MemoizedBookingItem: FC<Props> = ({ 
  item, 
  index, 
  activeIndex, 
  userProfile, 
  onConfirm, 
  realBookingsCount,
  isEditMode = false,
  onLongPress,
}) => {
  const rotate = useRef(new Animated.Value(0)).current;
  const jiggleY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isEditMode) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(rotate, { toValue: 0.7, duration: 220, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(jiggleY, { toValue: -6, duration: 220, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(rotate, { toValue: -0.7, duration: 240, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(jiggleY, { toValue: 6, duration: 240, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(rotate, { toValue: 0, duration: 200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(jiggleY, { toValue: 0, duration: 200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ]),
        ])
      );
      animation.start();
    } else {
      rotate.stopAnimation();
      rotate.setValue(0);
      jiggleY.stopAnimation();
      jiggleY.setValue(0);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [isEditMode, rotate, jiggleY]);

  const rotation = rotate.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-1.2deg', '0deg', '1.2deg'] });

  return (
  <Animated.View style={{ width: WIDGET_WIDTH, marginHorizontal: WIDGET_SPACING / 2, transform: [ { translateY: isEditMode ? jiggleY : 0 }, { rotate: isEditMode ? rotation as any : '0deg' } ] }}>
      <TouchableOpacity onLongPress={onLongPress} delayLongPress={250} activeOpacity={1}>
        <BookingWidgetComponent
          booking={item.id ? (item as ReservationDetails) : undefined}
          userProfile={userProfile}
          isActive={index === activeIndex}
          onConfirm={onConfirm}
          realBookingsCount={realBookingsCount}
          isEditMode={isEditMode}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default memo(MemoizedBookingItem);