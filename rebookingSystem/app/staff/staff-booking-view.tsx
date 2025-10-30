import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Calendar, Check, ChevronDown, ChevronUp, MessageSquare, Users, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    LayoutAnimation,
    ListRenderItemInfo,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View,
    Modal,
} from 'react-native';
import { ReservationDetails } from '../lib/types';
import { fetchUserData } from '../services/customer-service';
import { onSnapshotStaffBookings, updateReservationStatus } from '../services/staff-service';
import { modalService } from '../services/modal-Service';
import { BRANCHES, getPrettyBranchName } from '../lib/typesConst';

// Enable LayoutAnimation only on the old architecture; it's a no-op (and warns) on Fabric
const isFabric = (global as any)?.nativeFabricUIManager != null;
if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental &&
    !isFabric
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SectionHeader: React.FC<{
  title: string;
  count: number;
  isExpanded: boolean;
  onPress: () => void;
  color: string;
}> = ({ title, count, isExpanded, onPress, color }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
    <BlurView intensity={20} tint="dark" style={styles.sectionHeader}>
      <View style={[styles.sectionTitleContainer, { borderLeftColor: color }]}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={[styles.countBadge, { backgroundColor: `${color}40` }]}>
          <Text style={[styles.countText, { color }]}>{count}</Text>
        </View>
      </View>
      {isExpanded ? <ChevronUp size={20} color="#C89A5B" /> : <ChevronDown size={20} color="#C89A5B" />}
    </BlurView>
  </TouchableOpacity>
);

const BookingView = () => {
    const [bookings, setBookings] = useState<ReservationDetails[]>([]);
    const [cancelledBooking, setCancelledBookings] = useState<ReservationDetails[]>([]);
    const [confirmedBooking, setConfirmedBookings] = useState<ReservationDetails[]>([]); 
    const [pendingLoading, setPendingLoading] = useState(true);
    const [confirmedLoading, setConfirmedLoading] = useState(true);
    const [cancelledLoading, setCancelledLoading] = useState(true);
    const [userRole, setUserRole] = useState<number | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<number | 'ALL'>('ALL');

    const unsubscribesRef = useRef<(() => void)[]>([]);
    // Rejection modal state
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectSubmitting, setRejectSubmitting] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState<ReservationDetails | null>(null);
    
    const [expandedSections, setExpandedSections] = useState({
        pending: true,
        confirmed: false,
        cancelled: false,
    });

    const setupPendingListener = (id: string) => {
        const callback = (newReservations: ReservationDetails[]) => {
            setBookings(newReservations);
            setPendingLoading(false);
        };
        const unsubscribe = onSnapshotStaffBookings(id, 0, callback);
        unsubscribesRef.current.push(unsubscribe);
    };

    const setupConfirmedListener = (id: string) => {
        const callback = (newReservations: ReservationDetails[]) => {
            setConfirmedBookings(newReservations);
            setConfirmedLoading(false);
        };
        const unsubscribe = onSnapshotStaffBookings(id, 1, callback);
        unsubscribesRef.current.push(unsubscribe);
    };
    
    const setupCancelledListener = (id: string) => {
        const callback = (newReservations: ReservationDetails[]) => {
            setCancelledBookings(newReservations);
            setCancelledLoading(false);
        };
        const unsubscribe = onSnapshotStaffBookings(id, 2, callback);
        unsubscribesRef.current.push(unsubscribe);
    };

    useEffect(() => {
        const checkUser = async () => {
            const staffId = await AsyncStorage.getItem('userId');
            if (!staffId) {
                 await AsyncStorage.removeItem('userId');
                 await AsyncStorage.removeItem('userRole');
                router.replace('../auth/auth-login');
                return;
            }
            try {
                const userData = await fetchUserData(staffId);
                if (!userData) throw new Error('Could not find user profile.');
                userData.userId = staffId;
                // set role for UI filters
                try {
                  const roleString = await AsyncStorage.getItem('userRole');
                  if (roleString) setUserRole(parseInt(roleString, 10));
                } catch {}
            } catch (error) {
                 console.log('Error', error);
                 await AsyncStorage.removeItem('userId');
                 await AsyncStorage.removeItem('userRole');
                 router.replace('../auth/auth-login');
            }

            setPendingLoading(true);
            setConfirmedLoading(true);
            setCancelledLoading(true);

            setupPendingListener(staffId);
            setupCancelledListener(staffId);
            setupConfirmedListener(staffId);
        };
        checkUser();

        const currentUnsubs = unsubscribesRef.current;
        return () => {
            console.log("Cleaning up all Firestore listeners...");
            currentUnsubs.forEach(unsubscribe => unsubscribe());
        }
    }, []);

    // Derived lists based on selectedBranch (only when role 3 and branch filter is active)
    const filteredPending = selectedBranch === 'ALL' ? bookings : bookings.filter(b => Number(b.branch) === Number(selectedBranch));
    const filteredConfirmed = selectedBranch === 'ALL' ? confirmedBooking : confirmedBooking.filter(b => Number(b.branch) === Number(selectedBranch));
    const filteredCancelled = selectedBranch === 'ALL' ? cancelledBooking : cancelledBooking.filter(b => Number(b.branch) === Number(selectedBranch));

    const handleStatusUpdate = async (id: string, status: 1 | 2, reason: string) => {
        try {
            await updateReservationStatus(id, status, reason); 
        } catch (error) {
            modalService.showError('Error', 'Failed to update booking status. Check permissions.');
            console.log('Update error:', error);
        }
    };

    const openRejectModal = (reservation: ReservationDetails) => {
        setSelectedReservation(reservation);
        setRejectReason('');
        setRejectModalVisible(true);
    };

    const submitRejection = async () => {
        if (!selectedReservation) return;
        if (!rejectReason.trim()) {
            modalService.showError('Rejection Reason Required', 'Please provide a reason for rejecting this booking.');
            return;
        }
        try {
            setRejectSubmitting(true);
            await handleStatusUpdate(selectedReservation.id!, 2, rejectReason.trim());
            setRejectModalVisible(false);
            setSelectedReservation(null);
            setRejectReason('');
        } catch {
            // handleStatusUpdate already alerts; keep here for completeness
        } finally {
            setRejectSubmitting(false);
        }
    };
    
    const toggleSection = (section: 'pending' | 'confirmed' | 'cancelled') => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const renderCard = ({ 
        item, 
        statusColor,
        showActions,
    }: { 
        item: ReservationDetails, 
        statusColor: string,
        showActions: boolean,
    }) => {
        
        const dateObject = item.dateOfArrival.toDate();
        const formattedDate = dateObject.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const formattedTime = dateObject.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        //console.log(item.nagName);
        const nagName = item.nagName || 'Guest';

        return (
            <View style={[styles.card, { borderColor: `${statusColor}80` }]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{nagName}</Text>
                    <View style={styles.cardInfoChip}>
                        <Users size={14} color="#C89A5B" />
                        <Text style={styles.cardInfoChipText}>{item.guests}</Text>
                    </View>
                </View>

                <View style={styles.cardInfoRow}>
                    <Calendar size={14} color="#ccc" />
                    <Text style={styles.cardInfoText}>{formattedDate} at {formattedTime}</Text>
                </View>

                {item.message ? (
                    <View style={styles.cardInfoRow}>
                        <MessageSquare size={14} color="#ccc" />
                        <Text style={styles.cardInfoText} numberOfLines={2}>{item.message}</Text>
                    </View>
                ) : null}
                
                {showActions && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                                onPress={() => openRejectModal(item)} 
                                style={[styles.actionButton, styles.rejectButton]} >
                                <X size={16} color="#FCA5A5" />
                                <Text style={[styles.actionButtonText, { color: '#FCA5A5' }]}>Reject</Text>
                            </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleStatusUpdate(item.id!, 1, "")}
                            style={[styles.actionButton, styles.confirmButton]}
                        >
                            <Check size={16} color="#6EE7B7" />
                            <Text style={[styles.actionButtonText, { color: '#6EE7B7' }]}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Rejection reason display for cancelled/rejected bookings */}
                {item.status === 2 && !!item.rejectionReason && (
                    <View style={styles.rejectionContainer}>
                        <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
                        <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
                    </View>
                )}
            </View>
        );
    };

    const renderPendingItem = ({ item } : ListRenderItemInfo<ReservationDetails>) => 
        renderCard({ item, statusColor: '#F59E0B', showActions: true });

    const renderConfirmedItem = ({ item } : ListRenderItemInfo<ReservationDetails>) => 
        renderCard({ item, statusColor: '#10B981', showActions: false });

    const renderCancelledItem = ({ item } : ListRenderItemInfo<ReservationDetails>) => 
        renderCard({ item, statusColor: '#EF4444', showActions: false });

    const ListEmptyComponent = ({ text }: { text: string }) => (
        <View style={styles.emptyList}>
            <Text style={styles.emptyText}>{text}</Text>
        </View>
    );

    const SectionLoading = () => (
        <View style={styles.sectionLoadingContainer}>
            <ActivityIndicator size="small" color="#a1a1aa" />
        </View>
    );
    
    return (
        <ScrollView style={styles.mainContainer}> 
            {/* Reject modal */}
            <Modal
                transparent
                animationType="fade"
                visible={rejectModalVisible}
                onRequestClose={() => setRejectModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Reject Booking</Text>
                        <Text style={styles.modalSubtitle}>Please provide a reason for rejecting this booking.</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Type your reason..."
                            placeholderTextColor="#9CA3AF"
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            multiline
                            numberOfLines={4}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                onPress={() => {
                                    setRejectModalVisible(false);
                                    setSelectedReservation(null);
                                    setRejectReason('');
                                }}
                                style={[styles.actionButton, styles.modalCancelButton]}
                                disabled={rejectSubmitting}
                            >
                                <Text style={[styles.actionButtonText, { color: '#9CA3AF' }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={submitRejection}
                                style={[styles.actionButton, styles.modalSubmitButton, rejectSubmitting || !rejectReason.trim() ? styles.buttonDisabled : null]}
                                disabled={rejectSubmitting || !rejectReason.trim()}
                            >
                                {rejectSubmitting ? (
                                    <ActivityIndicator size="small" color="#111827" />
                                ) : (
                                    <Text style={[styles.actionButtonText, { color: '#111827' }]}>Submit</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Branch filter for Super Admins */}
            {userRole === 3 && (
              <View style={styles.branchFilterRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    onPress={() => setSelectedBranch('ALL')}
                    style={[styles.branchChip, selectedBranch === 'ALL' && styles.branchChipActive]}
                  >
                    <Text style={[styles.branchChipText, selectedBranch === 'ALL' && styles.branchChipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {Object.values(BRANCHES).map((id) => (
                    <TouchableOpacity
                      key={String(id)}
                      onPress={() => setSelectedBranch(Number(id))}
                      style={[styles.branchChip, selectedBranch === Number(id) && styles.branchChipActive]}
                    >
                      <Text style={[styles.branchChipText, selectedBranch === Number(id) && styles.branchChipTextActive]}>
                        {getPrettyBranchName(Number(id))}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <SectionHeader
                title="Pending"
                count={filteredPending.length}
                isExpanded={expandedSections.pending}
                onPress={() => toggleSection('pending')}
                color="#F59E0B"
            />
            {expandedSections.pending && (
                <View style={styles.listContainer}>
                    {pendingLoading ? (
                        <SectionLoading />
                    ) : (
                        <FlatList
                            data={filteredPending}
                            renderItem={renderPendingItem}
                            keyExtractor={(item) => item.id!.toString()}
                            ListEmptyComponent={<ListEmptyComponent text="No pending bookings." />}
                            scrollEnabled={false}
                        />
                    )}
                </View>
            )}
            
            <SectionHeader
                title="Confirmed"
                count={filteredConfirmed.length}
                isExpanded={expandedSections.confirmed}
                onPress={() => toggleSection('confirmed')}
                color="#10B981"
            />
            {expandedSections.confirmed && (
                <View style={styles.listContainer}>
                    {confirmedLoading ? (
                        <SectionLoading />
                    ) : (
                        <FlatList
                            data={filteredConfirmed}
                            renderItem={renderConfirmedItem}
                            keyExtractor={(item) => item.id!.toString()}
                            ListEmptyComponent={<ListEmptyComponent text="No confirmed bookings." />}
                            scrollEnabled={false}
                        />
                    )}
                </View>
            )}

            <SectionHeader
                title="Cancelled / Rejected"
                count={filteredCancelled.length}
                isExpanded={expandedSections.cancelled}
                onPress={() => toggleSection('cancelled')}
                color="#EF4444"
            />
            {expandedSections.cancelled && (
                <View style={styles.listContainer}>
                    {cancelledLoading ? (
                        <SectionLoading />
                    ) : (
                        <FlatList
                            data={filteredCancelled}
                            renderItem={renderCancelledItem}
                            keyExtractor={(item) => item.id!.toString()}
                            ListEmptyComponent={<ListEmptyComponent text="No cancelled bookings." />}
                            scrollEnabled={false}
                        />
                    )}
                </View>
            )}
            <View style={{ height: 50 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(23, 23, 23, 0.8)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        marginTop: 10,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderLeftWidth: 3,
        paddingLeft: 10,
    },
    sectionTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 20,
        fontFamily: 'PlayfairDisplay-Bold',
    },
    countBadge: {
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    countText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    listContainer: {
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardTitle: {
        color: '#fff',
        fontSize: 18, 
        fontWeight: 'bold',
        fontFamily: 'PlayfairDisplay-Bold',
        flex: 1,
        marginRight: 10,
    },
    cardInfoChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(200, 154, 91, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(200, 154, 91, 0.4)',
    },
    cardInfoChipText: {
        color: '#C89A5B',
        fontSize: 14,
        fontWeight: '600',
    },
    cardInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    cardInfoText: {
        color: '#d1d5db',
        fontSize: 13,
        flex: 1,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    rejectButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    confirmButton: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    // Rejection reason display styles
    rejectionContainer: {
        padding: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        marginTop: 12,
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
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: '100%',
        backgroundColor: '#111827',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6,
        fontFamily: 'PlayfairDisplay-Bold',
    },
    modalSubtitle: {
        color: '#d1d5db',
        fontSize: 13,
        marginBottom: 10,
    },
    modalInput: {
        minHeight: 90,
        color: '#fff',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: 10,
        textAlignVertical: 'top',
        marginBottom: 12,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    modalCancelButton: {
        backgroundColor: 'rgba(156, 163, 175, 0.15)',
    },
    modalSubmitButton: {
        backgroundColor: '#93C5FD',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    sectionLoadingContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyList: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#a1a1aa',
        fontSize: 14,
    },
    branchFilterRow: {
        paddingHorizontal: 10,
        paddingTop: 6,
    },
    branchChip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(200, 154, 91, 0.4)',
        marginRight: 8,
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    branchChipActive: {
        backgroundColor: 'rgba(200, 154, 91, 0.2)',
        borderColor: 'rgba(200, 154, 91, 0.8)'
    },
    branchChipText: {
        color: 'rgba(255,255,255,0.9)'
    },
    branchChipTextActive: {
        color: '#C89A5B',
        fontWeight: '700'
    },
    authButton: {
      borderRadius: 16, overflow: 'hidden', marginTop: 10, marginBottom: 20, shadowColor: '#C89A5B',
      shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16,
    },
    authButtonGradient: { paddingVertical: 16, alignItems: 'center' },
    authButtonText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'white' },
});

export default BookingView;