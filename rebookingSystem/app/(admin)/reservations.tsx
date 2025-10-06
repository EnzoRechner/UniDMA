import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  MessageSquare,
  LogOut,
  Filter,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getReservationsByBranch, ReservationDetails } from '@/utils/firestore';
import { router } from 'expo-router';
import AdminActionModal from '@/components/AdminActionModal';

const statusFilters = ['All', 'Pending', 'Confirmed', 'Rejected'];

export default function AdminReservationsScreen() {
  const { user, isAdmin, adminBranch, logout } = useAuth();
  const [reservations, setReservations] = useState<ReservationDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedReservation, setSelectedReservation] = useState<ReservationDetails | null>(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && (!isAdmin || !adminBranch)) {
      router.replace('/(tabs)');
    }
  }, [isAdmin, adminBranch, loading]);

  const fetchReservations = async () => {
    if (!adminBranch) return;
    
    try {
      setLoading(true);
      
      const branchReservations = await getReservationsByBranch(adminBranch);
      
      setReservations(branchReservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      Alert.alert('Error', 'Failed to load reservations');
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
    if (isAdmin && adminBranch) {
      fetchReservations();
    }
  }, [isAdmin, adminBranch]);

  // If user is admin but has no branch assigned, show a helpful message
  if (isAdmin && !adminBranch && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
          style={styles.background}
        />
        <View style={styles.content}>
          <Text style={{ color: 'white', textAlign: 'center', marginTop: 60 }}>
            You are an admin but no branch is assigned to your account. Please ask a super admin to assign you a branch.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle size={16} color="#10B981" />;
      case 'pending':
        return <AlertCircle size={16} color="#F59E0B" />;
      case 'rejected':
        return <XCircle size={16} color="#EF4444" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
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
        return 'Pending Review';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    if (activeFilter === 'All') return true;
    return reservation.status.toLowerCase() === activeFilter.toLowerCase();
  });

  const handleAction = (reservation: ReservationDetails, action: 'approve' | 'reject') => {
    setSelectedReservation(reservation);
    setActionType(action);
    setActionModalVisible(true);
  };

  const handleActionComplete = () => {
    setActionModalVisible(false);
    setSelectedReservation(null);
    fetchReservations(); // Refresh the list
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const renderReservationCard = ({ item }: { item: ReservationDetails }) => (
    <View style={styles.reservationCard}>
      <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.reservationName}>{item.name}</Text>
              <Text style={styles.customerInfo}>Customer name: {item.customerName || item.name || 'Unknown'}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
              {getStatusIcon(item.status)}
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>

          <View style={styles.reservationDetails}>
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
              <MessageSquare size={14} color="#C89A5B" />
              <Text style={styles.messageText}>{item.message}</Text>
            </View>
          )}

          {item.status === 'rejected' && item.rejectionReason && (
            <View style={styles.rejectionContainer}>
              <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
              <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
            </View>
          )}

          {item.status === 'pending' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.approveButton}
                onPress={() => handleAction(item, 'approve')}
              >
                <CheckCircle size={16} color="#10B981" />
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.rejectButton}
                onPress={() => handleAction(item, 'reject')}
              >
                <XCircle size={16} color="#EF4444" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.cardFooter}>
            <Text style={styles.createdAt}>
              Created: {item.createdAt.toDate().toLocaleDateString()}
            </Text>
          </View>
        </View>
      </BlurView>
    </View>
  );

  const renderFilterTab = (filter: string) => (
    <TouchableOpacity
      key={filter}
      style={[styles.filterTab, activeFilter === filter && styles.activeFilterTab]}
      onPress={() => setActiveFilter(filter)}
    >
      <BlurView
        intensity={activeFilter === filter ? 30 : 15}
        tint="dark"
        style={styles.filterTabBlur}
      >
        <Text style={[styles.filterTabText, activeFilter === filter && styles.activeFilterTabText]}>
          {filter}
        </Text>
      </BlurView>
    </TouchableOpacity>
  );

  if (!isAdmin || !adminBranch) {
    return null; // Will redirect in useEffect
  }

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
              <Text style={styles.greeting}>Admin Panel</Text>
              <Text style={styles.branchName}>{adminBranch} Branch</Text>
            </View>
            <TouchableOpacity style={styles.settingsButton} onPress={handleLogout}>
              <BlurView intensity={20} tint="dark" style={styles.settingsBlur}>
                <LogOut size={20} color="#C89A5B" />
              </BlurView>
            </TouchableOpacity>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{reservations.filter(r => r.status === 'pending').length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{reservations.filter(r => r.status === 'confirmed').length}</Text>
              <Text style={styles.statLabel}>Confirmed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{reservations.filter(r => r.status === 'rejected').length}</Text>
              <Text style={styles.statLabel}>Rejected</Text>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          <View style={styles.filters}>
            {statusFilters.map(renderFilterTab)}
          </View>
        </ScrollView>

        {/* Reservations List */}
        <FlatList
          data={filteredReservations}
          renderItem={renderReservationCard}
          keyExtractor={(item) => item.id || ''}
          style={styles.reservationsList}
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
              <BlurView intensity={25} tint="dark" style={styles.emptyCard}>
                <Filter size={48} color="rgba(200, 154, 91, 0.5)" />
                <Text style={styles.emptyTitle}>No Reservations</Text>
                <Text style={styles.emptySubtitle}>
                  {activeFilter === 'All' 
                    ? 'No reservations found for this branch'
                    : `No ${activeFilter.toLowerCase()} reservations found`
                  }
                </Text>
              </BlurView>
            </View>
          }
        />

        {/* Admin Action Modal */}
        <AdminActionModal
          isVisible={actionModalVisible}
          reservation={selectedReservation}
          actionType={actionType}
          onClose={() => setActionModalVisible(false)}
          onComplete={handleActionComplete}
        />
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
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(200, 154, 91, 0.8)',
    marginBottom: 4,
    fontFamily: 'Inter-Regular',
  },
  branchName: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  filtersContainer: {
    maxHeight: 60,
    marginBottom: 20,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  filterTab: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.3)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  activeFilterTab: {
    borderColor: 'rgba(200, 154, 91, 0.8)',
    backgroundColor: 'rgba(200, 154, 91, 0.15)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  filterTabBlur: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activeFilterTabText: {
    color: '#C89A5B',
    fontFamily: 'Inter-SemiBold',
  },
  reservationsList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  reservationCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    shadowColor: '#C89A5B',
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
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  reservationName: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
    marginBottom: 4,
  },
  customerInfo: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 6,
  },
  reservationDetails: {
    marginBottom: 15,
    gap: 8,
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: 'rgba(200, 154, 91, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.2)',
    marginBottom: 15,
    gap: 8,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
  },
  rejectionContainer: {
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 15,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  approveButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  rejectButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(200, 154, 91, 0.2)',
    paddingTop: 12,
  },
  createdAt: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
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
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
});