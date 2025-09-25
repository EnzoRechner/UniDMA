import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchLatestBookings, fetchUserData } from '../firebase/auth-firestore';
import BookingWidget from '../customer/booking-widget';
import { Booking, User } from '../../lib/types';

const { width: windowWidth } = Dimensions.get('window');

const CustomerPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeIndex, setActiveIndex] = useState(1); // Start on the default blank widget

  useEffect(() => {
    const loadData = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
          router.replace('./Login');
          return;
        }
        
        setLoading(true);
        const [userData, latestBookings] = await Promise.all([
          fetchUserData(userId),
          fetchLatestBookings(userId),
        ]);

        setUser(userData);
        // Add a blank placeholder widget at the beginning for a new booking
        // and a second blank one to be the default starting position.
        setBookings([
          { id: 'new', date: '', time: '', branch: '', seats: 0, message: '', status: 'pending', createdAt: 0, userId: '' },
          ...latestBookings,
          { id: 'blank', date: '', time: '', branch: '', seats: 0, message: '', status: 'pending', createdAt: 0, userId: '' }
        ]);
        
      } catch (error) {
        Alert.alert('Error', `Failed to load user data or bookings: ${error}.`);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const onScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const widgetWidth = windowWidth * 0.8;
    const newIndex = Math.round(scrollPosition / widgetWidth);
    setActiveIndex(newIndex);
  };
  
  if (loading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d97706" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>Die Nag Uil</Text>
          <Text style={styles.greetingText}>Good evening, {user.nagName}</Text>
        </View>

        {/* Booking Widgets */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          decelerationRate="fast"
          snapToInterval={windowWidth * 0.8}
        >
          {bookings.map((booking, index) => (
            <BookingWidget
              key={booking.id}
              booking={booking.id === 'blank' ? undefined : booking}
              isActive={index === activeIndex}
              onConfirm={() => {}}
            />
          ))}
        </ScrollView>

        {/* Pagination Dots */}
        <View style={styles.dotContainer}>
          {bookings.map((_, index) => (
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
  greetingText: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.8,
  },
  scrollView: {
    width: '100%',
    flexGrow: 0,
  },
  scrollViewContent: {
    paddingHorizontal: (windowWidth - 300) / 2, // Center the first widget
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
  },
  loyaltyText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CustomerPage;
