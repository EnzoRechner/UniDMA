import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { LogOut, Settings } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type FC } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FlatList, GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReservationDetails, UserProfile } from '../lib/types';
import { fetchUserData, getReservationsRealtime } from '../services/customer-service';
import { modalService } from '../services/modal-Service';
import MemoizedBookingItem from './customer-booking-memory';

const { width: windowWidth } = Dimensions.get('window');
const WIDGET_WIDTH = windowWidth * 0.9;
const WIDGET_SPACING = 20;
const SNAP_INTERVAL = WIDGET_WIDTH + WIDGET_SPACING;

const bottomContentData = [
    { id: 'loyalty', title: 'Loyalty Program', subtitle: 'Subscribe to earn rewards and get exclusive offers.' },
    { id: 'events', title: 'Current Events', subtitle: 'Wednesday - Burger Special' },
];

const getDotColorByStatus = (status: ReservationDetails['status'] | undefined): string => {
    switch (status) {
        case 0: return '#F59E0B'; // Pending
        case 1: return '#10B981'; // Confirmed
        case 2: return '#EF4444'; // Rejected
        case 3: return '#3B82F6'; // Completed
        case 4: return '#EF4444'; // Cancelled
        case 5: return '#C89A5B'; // Rebookable
        default: return 'rgba(255, 255, 255, 0.4)'; // Default
    }
};

const CustomerPage: FC = () => {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [widgets, setWidgets] = useState<(ReservationDetails | { id: null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingScrollToBookingId, setPendingScrollToBookingId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteTip, setShowDeleteTip] = useState(false);

  const setupWidgets = useCallback((realBookings: ReservationDetails[], scrollToId?: string) => {
    const newBookingPlaceholder = { id: null };
    // Sort by date ascending (earliest first, latest last)
    const sortedBookings = realBookings.sort((a, b) => 
      a.dateOfArrival.toMillis() - b.dateOfArrival.toMillis()
    );
    // Only include the new booking placeholder if under max of 5
    const withOptionalPlaceholder = sortedBookings.length < 5
      ? [...sortedBookings, newBookingPlaceholder]
      : [...sortedBookings];
    setWidgets(withOptionalPlaceholder);
    
    // If we need to scroll to a specific booking, do it after widgets update
    if (scrollToId) {
      console.log('Attempting to scroll to booking:', scrollToId);
  const index = sortedBookings.findIndex(b => b.id === scrollToId);
      console.log('Found at index:', index);
      console.log('Total bookings:', sortedBookings.length);
      
      if (index > -1) {
        // --- MODIFICATION: Use scrollToOffset for reliability ---
        const offset = index * SNAP_INTERVAL;
        setTimeout(() => {
          console.log('Scrolling to offset:', offset);
          flatListRef.current?.scrollToOffset({ 
            offset, 
            animated: true
          });
          setActiveIndex(index);
        }, 500); // Increased timeout to ensure FlatList is ready
      } else {
        console.log('Booking not found in sorted list');
      }
    }
  }, []);

  const scrollToNewBooking = useCallback(() => {
    if (!flatListRef.current || widgets.length === 0) return;
    // Only scroll if the last item is the 'new booking' placeholder
    const lastItem = widgets[widgets.length - 1];
    if ((lastItem as any).id === null) {
      const newBookingIndex = widgets.length - 1;
      const offset = newBookingIndex * SNAP_INTERVAL;
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset, animated: true });
        setActiveIndex(newBookingIndex);
      }, 100);
    }
  }, [widgets]);

  useEffect(() => {
    let unsubscribe = () => {};
    const loadData = async () => {
      setLoading(true);
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
          router.replace('/auth/auth-login');
          return;
        }
        const userData = await fetchUserData(userId);
        if (!userData) throw new Error('Could not find user profile.');
        userData.userId = userId;
        setUser(userData);

        unsubscribe = getReservationsRealtime(userId, (fetchedBookings) => {
          // Check if we have a pending scroll target
          const scrollTarget = pendingScrollToBookingId;
          
          if (scrollTarget) {
            console.log('Looking for booking ID:', scrollTarget);
            console.log('Available bookings:', fetchedBookings.map(b => ({ id: b.id, date: b.dateOfArrival.toDate() })));
          }
          
          setupWidgets(fetchedBookings, scrollTarget || undefined);
          
          // Clear the pending scroll after it's been handled
          if (scrollTarget) {
            setPendingScrollToBookingId(null);
          }
          
          setLoading(false);
        });
      } catch (error: any) {
        setLoading(false);
        modalService.showError('Error', error.message || 'An unexpected error occurred.');
        await AsyncStorage.removeItem('userId');
        await AsyncStorage.removeItem('userRole');
        router.replace('/auth/auth-login');
      }
    };
    
    loadData();
    
    return () => {
        unsubscribe();
    };
  }, [router, setupWidgets, pendingScrollToBookingId]);

  // Show the delete tip only once per install (first time user hits 5 bookings)
  useEffect(() => {
    const syncTip = async () => {
      const count = widgets.filter(w => (w as any).id !== null).length;
      if (count >= 5) {
        const shownOnce = await AsyncStorage.getItem('deleteTipShownOnce');
        setShowDeleteTip(shownOnce !== 'true');
      } else {
        setShowDeleteTip(false);
      }
    };
    syncTip();
  }, [widgets]);

  // Scroll to "Make New Booking" only on initial load
  const hasScrolledToNew = useRef(false);
  
  useEffect(() => {
    if (!loading && widgets.length > 0 && !hasScrolledToNew.current) {
      scrollToNewBooking();
      hasScrolledToNew.current = true;
    }
  }, [loading, widgets.length, scrollToNewBooking]);
  
  const handleLogout = async () => {
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userRole');
      router.replace('/auth/auth-login');
  }

  const handleBookingConfirm = useCallback((newBookingId?: string) => {
    if (newBookingId) {
      console.log('Booking confirmed with ID:', newBookingId);
      // Set the booking ID we want to scroll to
      setPendingScrollToBookingId(newBookingId);
    }
  }, []);

  const renderWidgetItem = useCallback(({ item, index }: { item: ReservationDetails | { id: null }, index: number }) => {
    // Calculate count of real bookings only
    const realBookingsCount = widgets.filter(w => (w as any).id !== null).length;

    return (
      <MemoizedBookingItem
          item={item}
          index={index}
          activeIndex={activeIndex}
          userProfile={user!}
          onConfirm={handleBookingConfirm}
          realBookingsCount={realBookingsCount}
          isEditMode={isEditMode}
          onLongPress={() => setIsEditMode(true)}
      />
    );
  }, [activeIndex, user, handleBookingConfirm, widgets, isEditMode]);

  const realBookingsCount = useCallback(() => widgets.filter(w => (w as any).id !== null).length, [widgets]);


  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SNAP_INTERVAL,
    offset: SNAP_INTERVAL * index,
    index,
  }), []);

  const handleScrollToIndexFailed = useCallback((info: any) => {
    // Fallback: scroll to offset manually
    const offset = info.index * SNAP_INTERVAL;
    flatListRef.current?.scrollToOffset({ offset, animated: true });
    
    // Try again after a delay
    setTimeout(() => {
      // --- MODIFICATION: Use scrollToOffset here too ---
      flatListRef.current?.scrollToOffset({ 
        offset, 
        animated: true,
      });
    }, 100);
  }, []);

  if (loading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C89A5B" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#0D0D0D', '#1A1A1A']} style={styles.background} />
        <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Die Nag Uil</Text>
                <Text style={styles.subtitle}>Good evening, {user?.nagName}</Text>
              </View>
              <View style={styles.headerIcons}>
                  <TouchableOpacity style={styles.iconButton} onPress={() => router.push("../customer/profile")}>
                    <Settings size={22} color="#C89A5B" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
                    <LogOut size={22} color="#C89A5B" />
                  </TouchableOpacity>
              </View>
            </View>
            {realBookingsCount() >= 5 && showDeleteTip && (
              <View style={[styles.tipCard, { marginTop: 8 }] }>
                <Text style={styles.tipText}>
                  You’ve reached the maximum of 5 bookings. Long‑press a reservation to enter edit mode, then tap the red X to delete. Tap “Done” to finish.
                </Text>
                <TouchableOpacity 
                  onPress={async () => {
                    setShowDeleteTip(false);
                    await AsyncStorage.setItem('deleteTipShownOnce', 'true');
                  }} 
                  style={styles.tipClose}
                >
                  <Text style={{ color: '#0D0D0D', fontWeight: '800' }}>Got it</Text>
                </TouchableOpacity>
              </View>
            )}

            <Animated.View style={[styles.widgetScrollContainer, { opacity: fadeAnim }]}>
              <FlatList
                ref={flatListRef}
                data={widgets}
                renderItem={renderWidgetItem}
                keyExtractor={(item, index) => (item as any).id || `new-booking-${index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollViewContent}
                snapToInterval={SNAP_INTERVAL}
                decelerationRate="fast"
                disableIntervalMomentum={true}
                getItemLayout={getItemLayout}
                onScrollToIndexFailed={handleScrollToIndexFailed}
                onScroll={(e) => {
                  const newIndex = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
                  setActiveIndex(newIndex);
                }}
                scrollEventThrottle={16}
                removeClippedSubviews={false}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={5}
              />
            </Animated.View>

            {isEditMode && (
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() => setIsEditMode(false)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 18,
                    backgroundColor: 'rgba(200, 154, 91, 0.9)'
                  }}
                >
                  <Text style={{ color: '#0D0D0D', fontWeight: '700' }}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.dotContainer}>
                {widgets.map((widget, index) => {
                    const statusColor = getDotColorByStatus(widget.id ? (widget as ReservationDetails).status : undefined);
                    const isActiveDot = index === activeIndex;
                    const finalColor = isActiveDot ? styles.activeDot.backgroundColor : statusColor;
                    return (
                        <View 
                          key={`${widget.id || 'new'}-${index}`} 
                          style={[
                            styles.dot, 
                            { backgroundColor: finalColor },
                            isActiveDot && styles.activeDot
                          ]} 
                        />
                    );
                })}
            </View>

            {bottomContentData.map(item => (
                <View key={item.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                </View>
            ))}
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000', paddingTop: 0},
    background: { position: 'absolute', left: 0, right: 0, top: 0, height: '100%' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0D' },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerIcons: { flexDirection: 'row', gap: 15 },
    iconButton: { padding: 5 },
    title: { fontSize: 28, fontFamily: 'PlayfairDisplay-Bold', color: '#C89A5B' },
    subtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.8)' },
  widgetScrollContainer: { height: 620 },
    scrollViewContent: { paddingHorizontal: (windowWidth - WIDGET_WIDTH) / 2 - (WIDGET_SPACING / 2), alignItems: 'center' },
    dotContainer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 10, marginBottom: 20 },
    dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
    activeDot: { backgroundColor: '#C89A5B', width: 24 },
  tipCard: { backgroundColor: 'rgba(200, 154, 91, 0.12)', borderRadius: 12, marginHorizontal: 20, marginBottom: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.35)' },
  tipText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 18 },
  tipClose: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: '#C89A5B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    card: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 20, marginHorizontal: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.2)' },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 5 },
    cardSubtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' },
});

export default CustomerPage;