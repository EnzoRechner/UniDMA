import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, Plus, Clock, Users, MapPin, Calendar } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import { getReservations, ReservationDetails } from '@/utils/firestore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
const CARD_SPACING = 20;

export default function HomeScreen() {
  const { user } = useAuth();
  const [activeCard, setActiveCard] = useState(0);
  const [reservations, setReservations] = useState<ReservationDetails[]>([]);
  const [loading, setLoading] = useState(true);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10B981';
      case 'pending':
        return '#C89A5B';
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
        return 'Awaiting Confirmation';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  const handleReservationPress = (reservation: ReservationDetails) => {
    // TODO: Navigate to booking confirmation screen with pre-filled details
    console.log('Book reservation:', reservation);
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
        <TouchableOpacity onPress={() => handleReservationPress(item)}>
          <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardType}>{item.name}</Text>
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
                <View style={styles.detailRow}>
                  <MapPin size={16} color="#C89A5B" />
                  <Text style={styles.detailText}>{item.seat}</Text>
                </View>
              </View>

              {item.message && (
                <View style={styles.messageContainer}>
                  <Text style={styles.messageLabel}>Note:</Text>
                  <Text style={styles.messageText}>{item.message}</Text>
                </View>
              )}
            </View>
          </BlurView>
        </TouchableOpacity>
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
      
      <View style={styles.content}>
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
              <Image source={require('../../assets/images/icon.png')}
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
      </View>
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
  content: {
    flex: 1,
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
    marginTop: 10,
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
    minHeight: 280,
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
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardType: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  cardDetails: {
    marginTop: 10,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  messageContainer: {
    marginTop: 15,
    padding: 12,
    backgroundColor: 'rgba(200, 154, 91, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.2)',
  },
  messageLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#C89A5B',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
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
    marginBottom: 15,
  },
  newCardText: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginBottom: 5,
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
    paddingVertical: 20,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  activeIndicator: {
    backgroundColor: '#C89A5B',
    width: 24,
  },
});