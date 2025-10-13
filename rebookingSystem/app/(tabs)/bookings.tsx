import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, MapPin, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getReservations } from '@/dataconnect/firestoreBookings';
import { ReservationDetails } from '@/lib/types';
import { STATUS_MAP } from '@/lib/typesConst';

const tabs = ['All', 'Upcoming', 'Completed', 'Rejected'];

export default function BookingsScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [reservations, setReservations] = useState<ReservationDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchReservations();
  }, [user]);

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 1:
        return <CheckCircle size={16} color="#10B981" />;
      case 0:
        return <AlertCircle size={16} color="#F59E0B" />;
      case 2:
        return <XCircle size={16} color="#EF4444" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1:
        return '#10B981';
      case 0:
        return '#F59E0B';
      case 2:
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Upcoming') return ['confirmed', 'pending'].includes(STATUS_MAP[reservation.status]);
    if (activeTab === 'Completed') {
      const reservationDate = reservation.dateOfArrival.toDate();
      const today = new Date();
      return reservation.status === 1 && reservationDate < today;
    }
    if (activeTab === 'Rejected') return reservation.status === 2;
    return true;
  });

  const renderBookingCard = ({ item }: { item: ReservationDetails }) => (
    <TouchableOpacity style={styles.bookingCard}>
      <BlurView intensity={20} tint="light" style={styles.cardBlur}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.serviceName}>{item.nagName}</Text>
            <View style={styles.statusContainer}>
              {getStatusIcon(item.status)}
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {STATUS_MAP[item.status].charAt(0).toUpperCase() + STATUS_MAP[item.status].slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.bookingInfo}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Calendar size={16} color="#C89A5B" />
                <Text style={styles.infoText}>{item.date}</Text>
              </View>
              <View style={styles.infoItem}>
                <Clock size={16} color="#C89A5B" />
                <Text style={styles.infoText}>{item.time}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Users size={16} color="#C89A5B" />
                <Text style={styles.infoText}>{item.guests} guests</Text>
              </View>
              <View style={styles.infoItem}>
                <MapPin size={16} color="#C89A5B" />
                <Text style={styles.infoText}>{item.branch}</Text>
              </View>
            </View>

            {item.seat && (
              <View style={styles.seatInfo}>
                <Text style={styles.seatLabel}>Seating:</Text>
                <Text style={styles.seatText}>{item.seat}</Text>
              </View>
            )}

            {item.message && (
              <View style={styles.messageInfo}>
                <Text style={styles.messageLabel}>Message:</Text>
                <Text style={styles.messageText}>{item.message}</Text>
              </View>
            )}

            {item.status === 2 && item.rejectionReason && (
              <View style={styles.rejectionInfo}>
                <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
                <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
              </View>
            )}
          </View>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
        style={styles.background}
      />
      
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Bookings</Text>
          <Text style={styles.subtitle}>Manage your appointments</Text>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          <View style={styles.tabs}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <BlurView
                  intensity={activeTab === tab ? 30 : 15}
                  tint="light"
                  style={styles.tabBlur}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                    {tab}
                  </Text>
                </BlurView>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Bookings List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#C89A5B" />
            <Text style={styles.loadingText}>Loading reservations...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredReservations}
            renderItem={renderBookingCard}
            keyExtractor={(item) => item.id || ''}
            style={styles.bookingsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#C89A5B"
                colors={['#C89A5B']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <BlurView intensity={20} tint="dark" style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No Reservations</Text>
                  <Text style={styles.emptySubtitle}>
                    {activeTab === 'All'
                      ? 'You have no reservations yet. Create your first reservation!'
                      : `No ${activeTab.toLowerCase()} reservations found.`}
                  </Text>
                </BlurView>
              </View>
            }
          />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 16,
    fontFamily: 'Inter-Regular',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
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
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  seatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200, 154, 91, 0.2)',
  },
  seatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#C89A5B',
    marginRight: 8,
  },
  seatText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  messageInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200, 154, 91, 0.2)',
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
  rejectionInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
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
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabsContainer: {
    maxHeight: 60,
    marginBottom: 20,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  tab: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: 'rgba(255, 255, 255, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  activeTab: {
    borderColor: 'rgba(200, 154, 91, 0.8)',
    backgroundColor: 'rgba(200, 154, 91, 0.15)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  tabBlur: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activeTabText: {
    color: 'white',
  },
  bookingsList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  bookingCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: 'rgba(255, 255, 255, 0.2)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  cardBlur: {
    flex: 1,
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookingInfo: {
    marginBottom: 20,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  rescheduleButton: {
    flex: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  rescheduleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  reviewButton: {
    flex: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
});