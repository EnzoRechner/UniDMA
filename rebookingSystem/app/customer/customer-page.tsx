import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { LogOut, Settings } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type FC } from 'react';
import {
  ActivityIndicator,
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
import MemoizedBookingItem from './customer-booking-memory';
import { modalService } from '../services/modal-Service';

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
  const [pendingNewBookingId, setPendingNewBookingId] = useState<string | null>(null);

  const setupWidgets = useCallback((realBookings: ReservationDetails[]) => {
    const newBookingPlaceholder = { id: null };
    const sortedBookings = realBookings.sort((a, b) => a.dateOfArrival.toMillis() - b.dateOfArrival.toMillis());
    setWidgets([...sortedBookings, newBookingPlaceholder]);
  }, []);

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
          setupWidgets(fetchedBookings);
          setLoading(false);

          if (pendingNewBookingId) {
            const sortedList = fetchedBookings.sort((a, b) => a.dateOfArrival.toMillis() - b.dateOfArrival.toMillis());
            const finalIndex = sortedList.findIndex(b => b.id === pendingNewBookingId);
            
            if (finalIndex > -1) {
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: finalIndex, animated: true });
                setActiveIndex(finalIndex);
              }, 250);
            }
            setPendingNewBookingId(null);
          }
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
  }, [router, setupWidgets, pendingNewBookingId]);
  
  const handleLogout = async () => {
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userRole');
      router.replace('/auth/auth-login');
  }

  const renderWidgetItem = useCallback(({ item, index }: { item: ReservationDetails | { id: null }, index: number }) => (
    <MemoizedBookingItem
        item={item} index={index} activeIndex={activeIndex} userProfile={user!}
        onConfirm={(newBookingId?: string) => {
          if (newBookingId) {
            setPendingNewBookingId(newBookingId);
          } else {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: 0, animated: true });
            }, 500);
          }
        }}
    />
  ), [activeIndex, user]);

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
        <ScrollView>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Die Nag Uil</Text>
                <Text style={styles.subtitle}>Good evening, {user?.nagName}</Text>
              </View>
              <View style={styles.headerIcons}>
                  <TouchableOpacity style={styles.iconButton} onPress={() => router.push("../customer/profile")}><Settings size={22} color="#C89A5B" /></TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton} onPress={handleLogout}><LogOut size={22} color="#C89A5B" /></TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.widgetScrollContainer}>
              <FlatList
                  ref={flatListRef}
                  data={widgets}
                  renderItem={renderWidgetItem}
                  keyExtractor={(item) => item.id || 'new-booking'}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.scrollViewContent}
                  snapToInterval={SNAP_INTERVAL}
                  decelerationRate="normal"
                  disableIntervalMomentum={true}
                  onScroll={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL))}
                  scrollEventThrottle={16}
              />
            </View>
            
            <View style={styles.dotContainer}>
                {widgets.map((widget, index) => {
                    const statusColor = getDotColorByStatus(widget.id ? (widget as ReservationDetails).status : undefined);
                    const isActiveDot = index === activeIndex;
                    const finalColor = isActiveDot ? styles.activeDot.backgroundColor : statusColor;
                    return (
                        <View key={index} style={[ styles.dot, { backgroundColor: finalColor }]} />
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
    background: { position: 'absolute', left: 0, right: 0, top: 0, height: '0%' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0D' },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerIcons: { flexDirection: 'row', gap: 15 },
    iconButton: { padding: 5 },
    title: { fontSize: 28, fontFamily: 'PlayfairDisplay-Bold', color: '#C89A5B' },
    subtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.8)' },
    widgetScrollContainer: { height: 540 },
    scrollViewContent: { paddingHorizontal: (windowWidth - WIDGET_WIDTH) / 2 - (WIDGET_SPACING / 2), alignItems: 'center' },
    dotContainer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 10, marginBottom: 20 },
    dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
    activeDot: { backgroundColor: '#C89A5B' },
    card: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, padding: 20, marginHorizontal: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.2)' },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 5 },
    cardSubtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' },
});

export default CustomerPage;