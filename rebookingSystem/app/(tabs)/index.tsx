import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, Plus, Clock, Users, MapPin, Calendar } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import { getReservations, addReservation } from '@/dataconnect/firestoreBookings';
import ReservationConfirmationModal from '@/components/ReservationConfirmationModal';
import { Timestamp } from 'firebase/firestore';
import { ReservationDetails } from '@/lib/types';
const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
const CARD_SPACING = 20;

export default function HomeScreen() {
  const { user } = useAuth();
  const [activeCard, setActiveCard] = useState(0);
  const [reservations, setReservations] = useState<ReservationDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConfirmationModalVisible, setIsConfirmationModalVisible] = useState(false);
  const [selectedReservationToConfirm, setSelectedReservationToConfirm] = useState<ReservationDetails | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const fetchReservations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userReservations = await getReservations(user.uid);
      setReservations(userReservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchReservations();
    }, [user])
  );

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1:
        return '#10B981';
      case 0:
        return '#C89A5B';
      case 2:
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 1:
        return 'Confirmed';
      case 0:
        return 'Awaiting Confirmation';
      case 2:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  const handleBookReservation = (reservation: ReservationDetails) => {
    setSelectedReservationToConfirm(reservation);
    setIsConfirmationModalVisible(true);
  };

  const handleConfirmBooking = async (reservation: ReservationDetails) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to make a reservation');
      return;
    }

    const dateObject = reservation.dateOfArrival instanceof Timestamp 
              ? reservation.dateOfArrival.toDate() 
              : reservation.dateOfArrival;
              
    // Format the date using locale-aware methods
    reservation.date = dateObject.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
          
    // Format the time using locale-aware methods
    reservation.time = dateObject.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true // '02:00 PM' format
    });

    if (!reservation.date || !reservation.time) {
        Alert.alert('Error', 'Missing date or time information for reservation.');
        console.error('Reservation object missing date/time:', reservation);
        return; 
    }

    // const combinedDate = combineDateTimeStrings(reservation.date, reservation.time);

    // Convert to Firestore Timestamp
    const dateOfArrival = Timestamp.fromDate(dateObject);

    try {
      await addReservation(user.uid, {
        bookingName: reservation.bookingName.trim(),
        nagName: reservation.nagName.trim(),
        dateOfArrival : dateOfArrival,
        guests: reservation.guests,
        branch: reservation.branch.toLowerCase(),
        seat: reservation.seat,
        message: reservation.message || '',
      });

      Alert.alert('Success', 'Your reservation has been confirmed!', [
        { text: 'OK', onPress: () => {
          setIsConfirmationModalVisible(false);
          fetchReservations(); // Refresh the reservations list
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm reservation. Please try again.');
    }
  };

  const renderReservationCard = (item: ReservationDetails, index: number) => {
    const inputRange = [
      (index - 1) * (CARD_WIDTH + CARD_SPACING),
      index * (CARD_WIDTH + CARD_SPACING),
      (index + 1) * (CARD_WIDTH + CARD_SPACING),
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.7, 1, 0.7],
      extrapolate: 'clamp',
    });

    const isActive = activeCard === index;

    return (
      <Animated.View
        key={item.id}
        style={[
          styles.reservationCard,
          {
            transform: [{ scale }],
            opacity,
          },
          isActive && styles.activeCard,
        ]}
      >
        <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardType}>{item.bookingName}</Text>
              <View style={[styles.statusPill, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {getStatusText(item.status)}
                </Text>
              </View>
            </View>

            <View style={styles.cardDetails}>
              <View style={styles.detailRow}>
                <Calendar size={16} color="#C89A5B" />
                <Text style={styles.detailText}>{item.date}</Text>
              </View>
              <View style={styles.detailRow}>
                <Clock size={16} color="#C89A5B" />
                <Text style={styles.detailText}>{item.time}</Text>
              </View>
              <View style={styles.detailRow}>
                <Users size={16} color="#C89A5B" />
                <Text style={styles.detailText}>{item.guests} guests</Text>
              </View>
              <View style={styles.detailRow}>
                <MapPin size={16} color="#C89A5B" />
                <Text style={styles.detailText}>{item.branch}</Text>
              </View>
            </View>

            {item.message && (
              <View style={styles.messageContainer}>
                <Text style={styles.messageLabel}>Note:</Text>
                <Text style={styles.messageText}>{item.message}</Text>
              </View>
            )}

            <View style={styles.bookButtonContainer}>
              <TouchableOpacity 
                style={styles.bookButton}
                onPress={() => handleBookReservation(item)}
              >
                <LinearGradient
                  colors={['#C89A5B', '#B8864A']}
                  style={styles.bookButtonGradient}
                >
                  <Text style={styles.bookButtonText}>Book Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Animated.View>
    );
  };

  const renderNewCard = () => (
    <TouchableOpacity 
      style={[styles.reservationCard, styles.newCard]}
      onPress={() => router.push('/(tabs)/create-reservation')}
    >
      <BlurView intensity={20} tint="dark" style={styles.cardBlur}>
        <View style={styles.newCardContent}>
          <View style={styles.plusIcon}>
            <Plus size={32} color="#C89A5B" />
          </View>
          <Text style={styles.newCardText}>Create New</Text>
          <Text style={styles.newCardSubtext}>Reservation template</Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <BlurView intensity={25} tint="dark" style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>No Reservations Yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first reservation template for quick booking
        </Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => router.push('/(tabs)/create-reservation')}
        >
          <LinearGradient
            colors={['#C89A5B', '#B8864A']}
            style={styles.createButtonGradient}
          >
            <Plus size={20} color="white" />
            <Text style={styles.createButtonText}>Create Reservation</Text>
          </LinearGradient>
        </TouchableOpacity>
      </BlurView>
    </View>
  );

  const totalCards = reservations.length + 1; // +1 for the "Make New" card

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
        style={styles.background}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Good Evening</Text>
              <Text style={styles.userName}>{user?.displayName || 'Guest'}</Text>
            </View>
            <TouchableOpacity style={styles.settingsButton}>
              <BlurView intensity={20} tint="dark" style={styles.settingsBlur}>
                <Settings size={20} color="#C89A5B" />
              </BlurView>
            </TouchableOpacity>
          </View>
          
          <View style={styles.logoContainer}>
            <BlurView intensity={30} tint="dark" style={styles.logoBlur}>
              <Image 
                source={require('../../assets/images/icon.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </BlurView>
          </View>
          
          <Text style={styles.restaurantName}>Die Nag Uil</Text>
          <Text style={styles.subtitle}>Kroeg • Eetsaal</Text>
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#C89A5B" />
            <Text style={styles.loadingText}>Loading reservations...</Text>
          </View>
        ) : reservations.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            {/* Reservation Cards */}
            <View style={styles.cardsSection}>
              <Text style={styles.sectionTitle}>Your Reservations</Text>
              
              <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH + CARD_SPACING}
                decelerationRate="fast"
                contentContainerStyle={styles.cardsContainer}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { 
                    useNativeDriver: true,
                    listener: (event: any) => {
                      const index = Math.round(event.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_SPACING));
                      setActiveCard(index);
                    }
                  }
                )}
                scrollEventThrottle={16}
              >
                {reservations.map((item, index) => renderReservationCard(item, index))}
                {renderNewCard()}
              </Animated.ScrollView>
            </View>

            {/* Card Indicators */}
            <View style={styles.indicators}>
              {Array.from({ length: totalCards }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    activeCard === index && styles.activeIndicator,
                  ]}
                />
              ))}
            </View>
          </>
        )}

        {/* Reservation Confirmation Modal */}
        <ReservationConfirmationModal
          isVisible={isConfirmationModalVisible}
          reservation={selectedReservationToConfirm}
          onClose={() => setIsConfirmationModalVisible(false)}
          onConfirm={handleConfirmBooking}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(200, 154, 91, 0.8)',
    marginBottom: 4,
    fontFamily: 'Inter-Regular',
  },
  userName: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  settingsBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(200, 154, 91, 0.6)',
    marginBottom: 15,
    position: 'relative',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  logoBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 240,
    height: 240,
  },
  restaurantName: {
    fontSize: 36,
    fontFamily: 'PlayfairDisplay-Black',
    color: '#C89A5B',
    textAlign: 'center',
    marginBottom: 5,
    textShadowColor: 'rgba(200, 154, 91, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  emptyStateLogo: {
    width: 48,
    height: 48,
    tintColor: 'rgba(200, 154, 91, 0.5)',
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  cardsSection: {
    flex: 1,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  cardsContainer: {
    paddingHorizontal: (width - CARD_WIDTH) / 2,
    paddingVertical: 10,
  },
  reservationCard: {
    width: CARD_WIDTH,
    minHeight: 380,
    marginHorizontal: CARD_SPACING / 2,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  activeCard: {
    borderColor: 'rgba(200, 154, 91, 0.8)',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    backgroundColor: 'rgba(200, 154, 91, 0.1)',
  },
  cardBlur: {
    flex: 1,
  },
  cardContent: {
    flex: 1,
    padding: 20,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardType: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
    flex: 1,
    marginRight: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'space-around',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  messageContainer: {
    padding: 12,
    backgroundColor: 'rgba(200, 154, 91, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.2)',
    marginVertical: 12,
  },
  messageLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#C89A5B',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  rejectionContainer: {
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginVertical: 12,
  },
  rejectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
  },
  bookButtonContainer: {
    marginTop: 12,
  },
  bookButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bookButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  newCard: {
    borderStyle: 'dashed',
    borderColor: 'rgba(200, 154, 91, 0.6)',
    backgroundColor: 'rgba(200, 154, 91, 0.05)',
  },
  newCardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(200, 154, 91, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  newCardText: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginBottom: 12,
  },
  newCardSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(200, 154, 91, 0.3)',
    marginRight: 6,
  },
  activeIndicator: {
    backgroundColor: '#C89A5B',
    width: 24,
  },
});