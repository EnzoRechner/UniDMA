// customer.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, View, TouchableOpacity  } from 'react-native';
// Import only the required functions
import { fetchUserData } from '../services/auth-firestore';
import { getReservationsRealtime } from '@/app/services/firestoreBookings';
import BookingWidget from './main-booking-widget';
import { ReservationDetails, UserProfile } from '../lib/types';
import { Ionicons } from "@expo/vector-icons";
import { Timestamp } from 'firebase/firestore';

const { width: windowWidth } = Dimensions.get('window');

// --- Responsive Sizing Constants ---
const WIDGET_WIDTH_PERCENT = 0.85; // Use 85% of screen width
const WIDGET_MAX_WIDTH = 360; // Max width cap for larger screens
const WIDGET_MARGIN_H = 10; // Margin applied to the widget

// Calculate dynamic width and derived constants
const DYNAMIC_WIDGET_WIDTH = Math.min(windowWidth * WIDGET_WIDTH_PERCENT, WIDGET_MAX_WIDTH);
const SNAP_INTERVAL = DYNAMIC_WIDGET_WIDTH + (WIDGET_MARGIN_H * 2);
const PADDING_HORIZONTAL_SCROLL = (windowWidth - SNAP_INTERVAL) / 2 + WIDGET_MARGIN_H; 
// --- End Sizing Constants ---

const CustomerPage: React.FC = () => {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [latestBookings, setLatestBookings] = useState<ReservationDetails[]>([]); // This holds the list of real, sorted bookings
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [bookings, setBookings] = useState<ReservationDetails[]>([]); // This now holds [...REAL, NEW, BLANK]
  const [activeIndex, setActiveIndex] = useState(0); // Start on the most recent booking index
  
  const NEW_BOOKING_ID = 'new';
  const BLANK_PLACEHOLDER_ID = 'blank';
  
  /**
   * Structures the widgets list: [Oldest Booking, ..., Newest Booking, New Booking, Placeholder]
   * @param sortedBookings The list of actual bookings, already sorted oldest to newest.
   */
  const structureWidgets = useCallback((sortedBookings: ReservationDetails[]) => {
    // New structure: [...REAL (Oldest to Newest), NEW, BLANK]
    const newBookingWidget: ReservationDetails = { 
        id: NEW_BOOKING_ID, date: '', time: '', branch: '', seat: '', dateOfArrival: Timestamp.now(), guests: 2, nagName: '', bookingName: '',
        message: '', 
        status: 0 as ReservationDetails['status'], 
        createdAt: Timestamp.now(), userId: userId || '' 
    } as ReservationDetails;
    
    // We still keep the blank placeholder in the state list to simplify index calculations 
    // but we will filter it out before rendering.
    const blankPlaceholderWidget: ReservationDetails = { 
        id: NEW_BOOKING_ID, date: '', time: '', branch: '', seat: '', dateOfArrival: Timestamp.now(), guests: 2, nagName: '', bookingName: '',
        message: '', 
        status: 0 as ReservationDetails['status'], 
        createdAt: Timestamp.now(), userId: userId || '' 
    } as ReservationDetails;

    return [
      // Index 0 onwards: The actual bookings (Oldest to Newest/Most Recent)
      ...sortedBookings,
      
      // Next Index: New Booking widget (now positioned after the real bookings)
      newBookingWidget,
      
      // Last Index: Blank Placeholder widget 
      blankPlaceholderWidget
    ];
  }, [userId]);

  // Effect for initial loading (User Data and Auth Check)
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const id = await AsyncStorage.getItem('userId');
        if (!id) {
          router.replace('../login-related/login-page');
          return;
        }
        setUserId(id);

        const userData = await fetchUserData(id);
        setUser(userData);
      } catch (error) {
        Alert.alert('Error', `Failed to load user data: ${error}.`);
      } finally {
        if (!userId) setLoading(false);
      }
    };
    
    loadUserData();
  }, [userId]);

  // Effect for real-time booking listener
  useEffect(() => {
    if (!userId) return;

    setLoading(true);

    const unsubscribe = getReservationsRealtime(userId, (fetchedBookings: any) => {
      
      // 1. Sort bookings from OLDEST to MOST RECENT (Ascending createdAt)
      const sortedBookings = fetchedBookings.sort((a: any, b: any) => a.createdAt - b.createdAt);
      
      const prevBookingCount = latestBookings.length;
      const currentBookingCount = sortedBookings.length;
      const isNewBookingAdded = currentBookingCount > prevBookingCount;
      
      setLatestBookings(sortedBookings);
      setBookings(structureWidgets(sortedBookings));
      setLoading(false);
      
      if (isNewBookingAdded) {
          // The newly created booking is the most recent, located at the end of sortedBookings.
          // In the new structure [...REAL, NEW, BLANK], the new booking is at index: sortedBookings.length - 1
          const newBookingIndex = sortedBookings.length - 1; 
          const scrollPosition = newBookingIndex * SNAP_INTERVAL;
          
          scrollViewRef.current?.scrollTo({ x: scrollPosition, animated: true });
          setActiveIndex(newBookingIndex);
      }
    });

    return () => unsubscribe();
  }, [userId, structureWidgets, latestBookings.length]);

  // Effect to scroll to the initial active widget
  useEffect(() => {
    if (!loading && latestBookings.length > 0) {
      // Index of the most recent real booking in the new structure: latestBookings.length - 1
      const initialIndex = latestBookings.length - 1;
      const scrollPosition = initialIndex * SNAP_INTERVAL;
      
      scrollViewRef.current?.scrollTo({ x: scrollPosition, animated: false }); 
      setActiveIndex(initialIndex);
    } 
    // New: If no bookings, default to the 'New Booking' widget. 
    // In the new structure, the 'New Booking' widget is at index: 0 + 0 real bookings = 0
    else if (!loading && latestBookings.length === 0) {
        // The New Booking widget is the first (and only visible) item, at index 0
        const initialIndex = 0; 
        const scrollPosition = initialIndex * SNAP_INTERVAL;
        
        scrollViewRef.current?.scrollTo({ x: scrollPosition, animated: false }); 
        setActiveIndex(initialIndex);
    }
  }, [loading, latestBookings.length]);


  const onScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(scrollPosition / SNAP_INTERVAL);
    setActiveIndex(newIndex);
  };

  /**
   * Handler when a new booking is successfully confirmed.
   * We do not need to pass data or scroll here, as the firestore snapshot listener handles the state update and scroll.
   */
  const handleBookingConfirm = () => {
    // Scroll and state update is handled by the useEffect watching for booking count changes.
  };
  
  if (loading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d97706" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
  // Filter out the blank placeholder widget before rendering. 
  // This removes the extra widget on the right.
  const widgetsToRender = bookings.filter(b => b.id !== BLANK_PLACEHOLDER_ID);
  
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>Die Nag Uil</Text>
          <Text style={styles.greetingText}>Good evening, {user.nagName}</Text>
        </View>

        {/* Logout Button with Glassy Style */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await AsyncStorage.removeItem("userId");
            router.replace("../login-related/login-page");
          }}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
         
        {/* Booking Widgets */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          decelerationRate="fast"
          snapToInterval={SNAP_INTERVAL} 
        >
          {widgetsToRender.map((booking, index) => (
            <BookingWidget
              key={booking.id}
              booking={booking.id === BLANK_PLACEHOLDER_ID ? undefined : booking}
              isActive={index === activeIndex}
              onConfirm={handleBookingConfirm}
              widgetWidth={DYNAMIC_WIDGET_WIDTH} 
              widgetMargin={WIDGET_MARGIN_H} 
            />
          ))}
        </ScrollView>

        {/* Pagination Dots */}
        <View style={styles.dotContainer}>
          {/* Use the filtered array for dots */}
          {widgetsToRender.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Loyalty Program Placeholder */}
        <View style={styles.loyaltyProgram}>
          <Text style={styles.loyaltyText}>Loyalty Program</Text>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#d97706',
    marginTop: 10,
  },
  header: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  logoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  logoutButton: {
    position: "absolute",
    top: 40, 
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)", 
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)", // Lighter top bevel/reflection
    
    // Glassy shadow for depth/gradient effect (subtle fade to black)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8, 
  },
    logoutText: {
    color: "#fff",
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
  },
  greetingText: {
    color: '#fff',
    fontSize: 15, 
    opacity: 0.8,
  },
  scrollView: {
    width: '100%',
    flexGrow: 0,
  },
  scrollViewContent: {
    paddingHorizontal: PADDING_HORIZONTAL_SCROLL, 
    alignItems: 'center',
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fff',
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  loyaltyProgram: {
    width: '90%',
    height: 150,
    backgroundColor: '#D1D5DB',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    padding: 15,
  },
  loyaltyText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CustomerPage;