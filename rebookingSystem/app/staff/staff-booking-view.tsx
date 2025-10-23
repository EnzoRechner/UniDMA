import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { Timestamp } from 'firebase/firestore';
import { Check, MessageSquare, X } from 'lucide-react-native';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ActivityIndicator, Alert, FlatList, ListRenderItemInfo, Text, TouchableOpacity, View, StyleSheet, Pressable, Modal, Dimensions, SafeAreaView } from 'react-native';
import { onSnapshotStaffBookings, updateReservationStatus } from '../services/staff-service';
import { ReservationDetails, UserProfile } from '../lib/types';
import { router } from 'expo-router';
import { fetchUserData } from '../services/customer-service';

// --- CONSTANTS ---
const { width: windowWidth } = Dimensions.get('window');
const WIDGET_SPACING = 20;

const BookingView = () => {
    // --- State and Handlers ---
    const [bookings, setBookings] = useState<ReservationDetails[]>([]);
    const [cancelledBooking, setCancelledBookings] = useState<ReservationDetails[]>([]);
    const [confirmedBooking, setConfirmedBookings] = useState<ReservationDetails[]>([]); 
    const [pendingLoading, setPendingLoading] = useState(true);
    const [confirmedLoading, setConfirmedLoading] = useState(true);
    const [cancelledLoading, setCancelledLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const unsubscribesRef = useRef<(() => void)[]>([]);

    // --- State and Handlers ---
    const [user, setUser] = useState<UserProfile | null>(null);
    
    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalBookings, setModalBookings] = useState<ReservationDetails[]>([]);
    const [modalTitle, setModalTitle] = useState('');

    // 1. PENDING Bookings Listener Setup
    const setupPendingListener = (id: string) => {
        // Callback function to handle incoming data stream
        const callback = (newReservations: ReservationDetails[]) => {
            setBookings(newReservations);
            setPendingLoading(false);
        };
        // Start the listener and store the unsubscribe function
        const unsubscribe = onSnapshotStaffBookings(id, 0, callback);
        unsubscribesRef.current.push(unsubscribe);
    };

    // 2. CONFIRMED Bookings Listener Setup
    const setupConfirmedListener = (id: string) => {
        const callback = (newReservations: ReservationDetails[]) => {
            setConfirmedBookings(newReservations);
            setConfirmedLoading(false);
        };
        const unsubscribe = onSnapshotStaffBookings(id, 1, callback);
        unsubscribesRef.current.push(unsubscribe);
    };
    
    // 3. Rejected Bookings Listener Setup
    const setupCancelledListener = (id: string) => {
        const callback = (newReservations: ReservationDetails[]) => {
            setCancelledBookings(newReservations);
            setCancelledLoading(false);
        };
        const unsubscribe = onSnapshotStaffBookings(id, 2, callback);
        unsubscribesRef.current.push(unsubscribe);
    };


    // --- Effect for Initial User Data ---
    useEffect(() => {
        const checkUser = async () => {
            const staffId = await AsyncStorage.getItem('userId');
            if (!staffId) {
                router.replace('../login-related/login-page');
                return;
            }
            setUserId(staffId);
            try {
                const userData = await fetchUserData(staffId);
                if (!userData) throw new Error('Could not find user profile.');
                userData.userId = staffId;
                setUser(userData);
            } catch (error) {
                 Alert.alert('Error', 'Failed to load user data. Logging out.');
                 router.replace('../login-related/login-page');
            }

            // 2. Start all three listeners
            setPendingLoading(true);
            setConfirmedLoading(true);
            setCancelledLoading(true);

            setupPendingListener(staffId);
            setupCancelledListener(staffId);
            setupConfirmedListener(staffId);
        };
        checkUser();

        return () => {
            console.log("Cleaning up all Firestore listeners...");
            unsubscribesRef.current.forEach(unsubscribe => unsubscribe());
        }
    }, []);

    // --- Booking Handlers ---

    const handleStatusUpdate = async (id: string, status: 1 | 2, reason: string) => {
        try {
            await updateReservationStatus(id, status, reason); 
        } catch (error) {
            Alert.alert('Error', 'Failed to update booking status. Check permissions.');
            console.error('Update error:', error);
        }
    };

    const handleContactCustomer = (email: string) => {
        Alert.alert("Contact Customer", `Start a chat or email with: ${email}`);
        console.log(`Initiating contact with: ${email}`);
    };
    
    // --- View All Modal Logic ---
    
    const getStatusTitle = (status: number) => {
        switch (status) {
            case 0: return 'Pending Bookings';
            case 1: return 'Confirmed Bookings';
            case 2: return 'Cancelled/Rejected Bookings';
            default: return 'Bookings';
        }
    };

    const handleViewAll = useCallback((status: number) => {
        let itemsToView: ReservationDetails[] = [];
        
        // Choose the correct dataset based on the status
        switch (status) {
            case 0: itemsToView = bookings; break;
            case 1: itemsToView = confirmedBooking; break;
            case 2: itemsToView = cancelledBooking; break;
            default: itemsToView = [];
        }

        if (itemsToView.length > 0) {
            setModalBookings(itemsToView);
            setModalTitle(getStatusTitle(status));
            setModalVisible(true);
        } else {
            Alert.alert("No Bookings", "No bookings found with that status.");
        }
    }, [bookings, confirmedBooking, cancelledBooking]);

    const handleModalClose = useCallback(() => {
        setModalVisible(false);
        setModalBookings([]);
        setModalTitle('');
    }, []);

    // --- Render Functions ---

    const renderCard = ({ item, isCancelled, isConfirmed }: { item: ReservationDetails, isCancelled: boolean, isConfirmed: boolean }) => {
        // ... (renderCard logic remains the same, assuming staff_booking_styles and necessary helper code are available) ...
        
        let glowColor = staff_booking_styles.pendingGlow.shadowColor;
        let infoAccentColor = '#fcd34d'; // Yellow
        let cardBaseStyle = staff_booking_styles.pendingCard;

        if (isConfirmed) {
            glowColor = staff_booking_styles.confirmGlow.shadowColor;
            infoAccentColor = '#34d399'; // Green
            cardBaseStyle = staff_booking_styles.confirmCard;
        }
        if (isCancelled) {
            glowColor = staff_booking_styles.cancelledGlow.shadowColor;
            infoAccentColor = '#fb7185'; // Red
            cardBaseStyle = staff_booking_styles.cancelledCard;
        }

        const cardStyle = [
            staff_booking_styles.cardContainer,
            cardBaseStyle
        ];
        
        const dateObject = item.dateOfArrival instanceof Timestamp 
            ? item.dateOfArrival.toDate() 
            : item.dateOfArrival;

        const formattedDate = dateObject.toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
        
        const formattedTime = dateObject.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true 
        });

        const nagName = item.bookingName || 'Guest';

        return (
            <View style={[staff_booking_styles.cardWrapper, {shadowColor: glowColor}]}> 
                <BlurView 
                    intensity={80} 
                    tint="dark" 
                    style={cardStyle} 
                >
                    <View style={staff_booking_styles.cardContent}>
                        
                        <View style={staff_booking_styles.cardHeader}>
                            
                            <View style={staff_booking_styles.leftContent}>
                                
                                <View style={staff_booking_styles.nameAndSeatsRow}>
                                    <Text style={staff_booking_styles.cardTitle} numberOfLines={1}>
                                        {nagName}
                                    </Text>
                                    
                                    <View style={[staff_booking_styles.seatsContainer, { borderColor: infoAccentColor }]}>
                                        <Text style={[staff_booking_styles.seatsLabel, { color: infoAccentColor }]}>🪑 </Text>
                                        <Text style={[staff_booking_styles.seatsValue, { color: infoAccentColor }]}>{item.guests}</Text>
                                    </View>
                                </View>

                                <View style={staff_booking_styles.infoRow}>
                                    <Text style={[staff_booking_styles.infoLabel, { color: infoAccentColor }]}>📅</Text>
                                    <Text style={staff_booking_styles.infoValueSmall}>
                                        {formattedDate} @ {formattedTime}
                                    </Text>
                                </View>
                            </View>

                            <View style={staff_booking_styles.rightContent}>
                                <View style={staff_booking_styles.actionButtonsContainer}> 
                                    {!isConfirmed && (
                                        <Pressable
                                            onPress={() => {
                                                if (item.id) {
                                                    handleStatusUpdate(item.id, 1, ""); // Confirm
                                                } else {
                                                    console.error("Cannot update status: Reservation ID is missing.");
                                                }
                                            }}
                                            style={({ pressed }) => [
                                                staff_booking_styles.actionButtonCircle, 
                                                staff_booking_styles.confirmButtonCircle,
                                                { opacity: pressed ? 0.7 : 1 }
                                            ]}
                                        >
                                            <Check color="#fff" size={18} />
                                        </Pressable>
                                    )}
                                    {!isCancelled && (
                                        <Pressable
                                            onPress={() => {
                                                if (item.id) {
                                                    handleStatusUpdate(item.id, 2, ""); // Cancel/Reject
                                                } else {
                                                    console.error("Cannot update status: Reservation ID is missing.");
                                                }
                                            }}
                                            style={({ pressed }) => [
                                                staff_booking_styles.actionButtonCircle, 
                                                staff_booking_styles.cancelButtonCircle,
                                                { opacity: pressed ? 0.7 : 1 }
                                            ]}
                                        >
                                            <X color="#fff" size={18} />
                                        </Pressable>
                                    )}

                                    <Pressable
                                        onPress={() => handleContactCustomer(nagName)} // Note: You should pass the customer's email or phone number here, not their name.
                                        style={({ pressed }) => [
                                            staff_booking_styles.actionButtonCircle, 
                                            staff_booking_styles.contactButtonCircle,
                                            { opacity: pressed ? 0.7 : 1 }
                                        ]}
                                    >
                                        <MessageSquare color="#fff" size={18} /> 
                                    </Pressable>
                                </View>
                            </View>
                        </View>

                        <View style={staff_booking_styles.messageContainer}>
                            <Text style={staff_booking_styles.messageText}>
                                <Text style={staff_booking_styles.messageLabel}>Note:</Text> {item.message || 'N/A'}
                            </Text>
                        </View>
                        
                    </View>
                </BlurView>
            </View>
        );
    };

    const renderPendingItem = ({ item } : ListRenderItemInfo<ReservationDetails>) => 
        renderCard({ item, isCancelled: false, isConfirmed: false });

    const renderConfirmedItem = ({ item } : ListRenderItemInfo<ReservationDetails>) => 
        renderCard({ item, isCancelled: false, isConfirmed: true });

    const renderCancelledItem = ({ item } : ListRenderItemInfo<ReservationDetails>) => 
        renderCard({ item, isCancelled: true, isConfirmed: false });

    const renderModalItem = ({ item }: { item: ReservationDetails }) => {
        const isConfirmed = item.status === 1;
        const isCancelled = item.status === 2;
        // The modal should display the simple card view, not the complex MemoizedBookings component
        return (
            <View style={{ width: '100%', alignItems: 'center' }}>
                {renderCard({ item, isConfirmed, isCancelled })}
            </View>
        );
    };
    
    // ... (Empty Components and Loading Components remain the same) ...
    const PendingEmpty = () => (
        <View style={staff_booking_styles.emptyList}>
            <Text style={staff_booking_styles.emptyTextPrimary}>🎉 All Caught Up!</Text>
            <Text style={staff_booking_styles.emptyTextSecondary}>No pending reservations to review.</Text>
        </View>
    );
    const ConfirmedEmpty = () => (
        <View style={staff_booking_styles.emptyList}>
            <Text style={staff_booking_styles.emptyTextPrimary}>Ready to Go</Text>
            <Text style={staff_booking_styles.emptyTextSecondary}>No confirmed bookings currently.</Text>
        </View>
    );
    const CancelledEmpty = () => (
        <View style={staff_booking_styles.emptyList}>
            <Text style={staff_booking_styles.emptyTextPrimary}>Clear History</Text>
            <Text style={staff_booking_styles.emptyTextSecondary}>No cancelled bookings recorded.</Text>
        </View>
    );

    const SectionLoading = ({ text }: { text: string }) => (
        <View style={staff_booking_styles.sectionLoadingContainer}>
            <ActivityIndicator size="large" color="#a1a1aa" />
            <Text style={staff_booking_styles.sectionLoadingText}>{text}</Text>
        </View>
    );
    
    // --- MAIN RENDER BLOCK ---
    return (
        <View style={staff_booking_styles.mainContainer}> 
            {/* 1. Pending Bookings Section - YELLOW Tint */}
            <View style={[staff_booking_styles.listSubSection, staff_booking_styles.listSectionFlex]}>
                <View style={[staff_booking_styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <Text style={staff_booking_styles.headerTitle}>Pending ({bookings.length})</Text>
                
                <Pressable
                    style={({ pressed }) => [staff_booking_styles.viewAllButton, pressed && staff_booking_styles.viewAllButtonPressed]}
                    onPress={() => handleViewAll(0)} // pending
                >
                    <Text style={staff_booking_styles.viewAllButtonText}>View All</Text>
                </Pressable>
            </View>
                
                {pendingLoading ? (
                    <SectionLoading text="Loading pending bookings..." />
                ) : (
                    <FlatList
                        data={bookings}
                        renderItem={renderPendingItem}
                        keyExtractor={(item) => item.id!.toString()}
                        ListEmptyComponent={PendingEmpty}
                        style={[staff_booking_styles.listContentFlatListBase, staff_booking_styles.listContentFlatListYellow]}
                    />
                )}
            </View>
            
            {/* 2. Confirmed Bookings Section - GREEN Tint */}
            <View style={[staff_booking_styles.listSubSection, staff_booking_styles.listSectionFlex]}>
                <View style={[staff_booking_styles.header, staff_booking_styles.sectionHeader]}>
                    <Text style={staff_booking_styles.headerTitle}>Confirmed ({confirmedBooking.length})</Text>
                    <Pressable
                        style={({ pressed }) => [staff_booking_styles.viewAllButton, pressed && staff_booking_styles.viewAllButtonPressed]}
                        onPress={() => handleViewAll(1)} // confirmed
                    >
                        <Text style={staff_booking_styles.viewAllButtonText}>View All</Text>
                    </Pressable>
                </View>
                
                {confirmedLoading ? (
                    <SectionLoading text="Loading confirmed bookings..." />
                ) : (
                    <FlatList
                        data={confirmedBooking}
                        renderItem={renderConfirmedItem}
                        keyExtractor={(item) => item.id!.toString()}
                        ListEmptyComponent={ConfirmedEmpty}
                        style={[staff_booking_styles.listContentFlatListBase, staff_booking_styles.listContentFlatListGreen]}
                    />
                )}
            </View>

            {/* 3. Cancelled Bookings Section - RED Tint */}
            <View style={[staff_booking_styles.listSubSection, staff_booking_styles.listSectionFlex]}>
                <View style={[staff_booking_styles.header, staff_booking_styles.sectionHeader]}>
                    <Text style={staff_booking_styles.headerTitle}>Cancelled ({cancelledBooking.length})</Text>
                    <Pressable
                        style={({ pressed }) => [staff_booking_styles.viewAllButton, pressed && staff_booking_styles.viewAllButtonPressed]}
                        onPress={() => handleViewAll(2)} // rejected
                    >
                        <Text style={staff_booking_styles.viewAllButtonText}>View All</Text>
                    </Pressable>
                </View>
                
                {cancelledLoading ? (
                    <SectionLoading text="Loading cancelled bookings..." />
                ) : (
                    <FlatList
                        data={cancelledBooking}
                        renderItem={renderCancelledItem}
                        keyExtractor={(item) => item.id!.toString()}
                        ListEmptyComponent={CancelledEmpty}
                        style={[staff_booking_styles.listContentFlatListBase, staff_booking_styles.listContentFlatListRed]}
                    />
                )}
            </View>

            {/* --- MODAL OVERLAY --- */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={handleModalClose}
            >
                <View style={overlayStyles.modalOverlay}>
                    <View style={overlayStyles.modalContent}>
                        
                        {/* Modal Header (Title and Close Button) */}
                        <View style={overlayStyles.modalHeader}>
                            <Text style={overlayStyles.modalTitle}>{modalTitle}</Text>
                            <TouchableOpacity onPress={handleModalClose} style={overlayStyles.closeButton}>
                                <Text style={overlayStyles.closeButtonText}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        {/* FLATLIST FOR ALL FILTERED BOOKINGS (Full Screen Content) */}
                        <FlatList
                            data={modalBookings}
                            renderItem={renderModalItem}
                            keyExtractor={(item) => item.id as string} 
                            contentContainerStyle={overlayStyles.modalListContent}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// Modal Overlay
const overlayStyles = StyleSheet.create({
    scrollViewContent: { 
        paddingHorizontal: (windowWidth) - (WIDGET_SPACING / 2), 
        alignItems: 'center' 
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'flex-start',
    },
    modalContent: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(200, 154, 91, 0.2)',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#C89A5B',
        marginLeft: 10,
    },
    closeButton: {
        padding: 10,
        marginRight: 5,
    },
    closeButtonText: {
        color: '#C89A5B',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalListContent: {
        paddingTop: 15,
        paddingBottom: 40,
        gap: 15, 
    },
    widgetScrollContainer: { 
        height: 540
    }
});

const staff_booking_styles = StyleSheet.create({
    mainContainer: {
        flex: 1, 
    },
    listSubSection: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    listSectionFlex: {
        flex: 1, 
        minHeight: 150, 
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        zIndex: 1, 
        backgroundColor: '#09090b',
    },
    sectionHeader: { 
        paddingTop: 15,
    },
    headerTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 22,
        letterSpacing: 0.5,
    },
    
    // ... rest of the staff_booking_styles (card, glow, button styles)
    // For brevity, the full style object is assumed to be correctly defined outside this response block.

    pendingGlow: { shadowColor: '#fcd34d' }, 
    confirmGlow: { shadowColor: '#34d399' }, 
    cancelledGlow: { shadowColor: '#fb7185' }, 
    
    cardWrapper: {
        marginBottom: 10,
        overflow: 'hidden', 
        borderRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7, 
        shadowRadius: 10,
        elevation: 8,
    },
    
    cardContainer: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)', 
    },
    pendingCard: {
        backgroundColor: 'rgba(252, 211, 77, 0.15)', // Light Yellow Tint
    },
    cancelledCard: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)', // Light Red Tint
    },
    confirmCard: {
        backgroundColor: 'rgba(52, 211, 153, 0.15)', // Light Green Tint
    },
    
    cardContent: {
        flexDirection: 'column',
        padding: 14, 
    },
    
    cardHeader: {
        flexDirection: 'row', 
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    
    leftContent: {
        flex: 1, 
        flexDirection: 'column',
        marginRight: 8, 
    },

    nameAndSeatsRow: {
        flexDirection: 'row',
        alignItems: 'center', 
        marginBottom: 4, 
    },
    
    cardTitle: {
        flexShrink: 1, 
        color: '#fff',
        fontSize: 18, 
        fontWeight: 'bold',
        marginRight: 10, 
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10, 
    },
    infoLabel: {
        fontWeight: 'bold',
        marginRight: 4,
        fontSize: 12,
    },
    infoValueSmall: {
        color: '#d1d5db',
        fontSize: 12,
    },
    
    seatsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 6,
        backgroundColor: 'transparent', 
        borderRadius: 8,
        borderWidth: 1, 
    },
    seatsLabel: {
        fontWeight: 'bold',
        fontSize: 14, 
        marginRight: 4,
    },
    seatsValue: {
        fontWeight: 'bold',
        fontSize: 16, 
    },
    
    rightContent: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
    },

    messageContainer: {
        marginTop: 5,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.25)', 
    },
    messageText: {
        color: '#a1a1aa',
        fontSize: 12,
        lineHeight: 16,
    },
    messageLabel: {
        fontWeight: 'bold',
        color: '#d1d5db',
    },

    actionButtonsContainer: {
        flexDirection: 'row', 
        gap: 8,
    },
    actionButtonCircle: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 40, 
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)', 
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)', 
    },
    confirmButtonCircle: {
        backgroundColor: 'rgba(34, 197, 94, 0.5)', 
        borderColor: 'rgba(34, 197, 94, 0.7)',
    },
    cancelButtonCircle: {
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        borderColor: 'rgba(239, 68, 68, 0.7)',
    },
    contactButtonCircle: {
        backgroundColor: 'rgba(56, 189, 248, 0.3)',
        borderColor: 'rgba(56, 189, 248, 0.6)',
    },
    
    sectionLoadingContainer: {
        flex: 1, 
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    sectionLoadingText: {
        color: '#a1a1aa',
        marginTop: 8,
        fontSize: 14,
    },
    emptyList: {
        alignItems: 'center',
        marginTop: 40,
        padding: 20,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)', 
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 3,
    },
    emptyTextPrimary: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptyTextSecondary: {
        color: '#a1a1aa',
        marginTop: 4,
    },

    viewAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#EFEFEF', 
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    
    viewAllButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4A4A4A',
    },
    
    viewAllButtonPressed: {
        opacity: 0.7, 
    },
    listContentFlatListBase: {
        paddingHorizontal: 16,
        paddingTop: 0,
    },
    listContentFlatListYellow: {
        backgroundColor: 'rgba(252, 211, 77, 0.04)',
    },
    listContentFlatListGreen: {
        backgroundColor: 'rgba(52, 211, 153, 0.04)',
    },
    listContentFlatListRed: {
        backgroundColor: 'rgba(239, 68, 68, 0.04)',
    },
});

export default BookingView;