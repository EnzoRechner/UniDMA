import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchUserData, getReservationsRealtime } from '../services/customer-service';
import BookingWidgetComponent from './customer-booking-widget-component';
import { ReservationDetails, UserProfile } from '../lib/types';

const { width: windowWidth } = Dimensions.get('window');
const WIDGET_WIDTH = windowWidth * 0.9;
const WIDGET_SPACING = 20;
const SNAP_INTERVAL = WIDGET_WIDTH + WIDGET_SPACING;

const CustomerPage = () => {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [widgets, setWidgets] = useState<(ReservationDetails | { id: null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const setupWidgets = useCallback((realBookings: ReservationDetails[]) => {
    const newBookingPlaceholder = { id: null };
    setWidgets([newBookingPlaceholder, ...realBookings]);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
          router.replace('/auth/auth-login');
          return;
        }
        // Fetch user data from 'rebooking-accounts'
        const userData = await fetchUserData(userId);
        if (!userData) throw new Error('Could not find user profile.');
        setUser(userData);

        // Setup real-time listener for 'nagbookings'
        const unsubscribe = getReservationsRealtime(userId, (fetchedBookings) => {
          setupWidgets(fetchedBookings);
          setLoading(false);
        });
        return () => unsubscribe();
      } catch (error: any) {
        Alert.alert('Error', error.message);
        await AsyncStorage.removeItem('userId');
        router.replace('/auth/auth-login');
      }
    };
    const unsubscribePromise = loadData();
    
    return () => {
        unsubscribePromise.then(unsubscribe => {
            if (unsubscribe) {
                unsubscribe();
            }
        });
    };
  }, [router, setupWidgets]);
  
  const handleLogout = async () => {
      await AsyncStorage.removeItem('userId');
      router.replace('/auth/auth-login');
  }

  const onScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SNAP_INTERVAL);
    setActiveIndex(index);
  };

  if (loading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C89A5B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0D0D0D', '#1A1A1A']} style={styles.background} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Die Nag Uil</Text>
          <Text style={styles.subtitle}>Good evening, {user.nagName}</Text>
        </View>
        <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}><Settings size={22} color="#C89A5B" /></TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleLogout}><LogOut size={22} color="#C89A5B" /></TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.widgetScrollContainer}>
        <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollViewContent}
            snapToInterval={SNAP_INTERVAL}
            decelerationRate="fast"
            onScroll={onScroll}
            scrollEventThrottle={16}
        >
            {widgets.map((item, index) => (
                <View key={item.id || 'new-booking'} style={{width: WIDGET_WIDTH, marginHorizontal: WIDGET_SPACING / 2}}>
                    <BookingWidgetComponent
                        booking={item.id ? item as ReservationDetails : undefined}
                        userProfile={user}
                        isActive={index === activeIndex}
                        onConfirm={() => {
                          setTimeout(() => {
                            scrollViewRef.current?.scrollTo({ x: SNAP_INTERVAL, animated: true });
                          }, 500);
                        }}
                    />
                </View>
            ))}
        </ScrollView>
      </View>
      
      <View style={styles.dotContainer}>
          {widgets.map((_, index) => (
              <View key={index} style={[ styles.dot, index === activeIndex ? styles.activeDot : {}]} />
          ))}
      </View>

      <ScrollView style={styles.bottomContent}>
          <View style={styles.card}>
              <Text style={styles.cardTitle}>Loyalty Program</Text>
              <Text style={styles.cardSubtitle}>Subscribe to earn rewards and get exclusive offers.</Text>
          </View>
          <View style={styles.card}>
              <Text style={styles.cardTitle}>Current Events</Text>
              <Text style={styles.cardSubtitle}>Wednesday - Burger Special</Text>
          </View>
      </ScrollView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D0D0D',
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: '100%',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0D0D0D',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerIcons: {
        flexDirection: 'row',
        gap: 15,
    },
    iconButton: {
        padding: 5,
    },
    title: {
        fontSize: 28,
        fontFamily: 'PlayfairDisplay-Bold',
        color: '#C89A5B',
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    widgetScrollContainer: {
        height: 520, 
    },
    scrollViewContent: {
        paddingHorizontal: (windowWidth - WIDGET_WIDTH) / 2 - (WIDGET_SPACING / 2),
        alignItems: 'center',
    },
    dotContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        marginHorizontal: 4,
    },
    activeDot: {
        backgroundColor: '#C89A5B',
    },
    bottomContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(200, 154, 91, 0.2)',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5,
    },
    cardSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
    },
});

export default CustomerPage;

