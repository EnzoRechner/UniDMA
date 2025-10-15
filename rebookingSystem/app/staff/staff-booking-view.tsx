import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { Timestamp } from 'firebase/firestore';
import { Check, MessageSquare, X } from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Alert, FlatList, ListRenderItemInfo, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { onSnapshotStaffBookings, updateReservationStatus } from '../services/staff-service';
import { ReservationDetails } from '../lib/types';
import { router } from 'expo-router';

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

    useEffect(() => {
        const checkUserAndFetch = async () => {
            // 1. Check User ID
            const staffId = await AsyncStorage.getItem('userId');
            if (!staffId) {
                router.replace('../login-related/login-page');
                return;
            }
            setUserId(staffId);
            
            // 2. Start all three listeners
            setPendingLoading(true);
            setConfirmedLoading(true);
            setCancelledLoading(true);

            setupPendingListener(staffId);
            setupCancelledListener(staffId);
            setupConfirmedListener(staffId);
        };
        checkUserAndFetch();

        // 3. Cleanup Function: Unsubscribe from all listeners
        return () => {
            console.log("Cleaning up all Firestore listeners...");
            unsubscribesRef.current.forEach(unsubscribe => unsubscribe());
        }
    }, []);

    const handleStatusUpdate = async (id: string, status: 1 | 2, reason: string) => {
        try {
            await updateReservationStatus(id, status, reason); 
        } catch (error) {
            Alert.alert('Error', 'Failed to update booking status.');
            console.error('Update error:', error);
        }
    };

    const handleContactCustomer = (email: string) => {
        Alert.alert("Contact Customer", `Start a chat or email with: ${email}`);
        console.log(`Initiating contact with: ${email}`);
    };

    const renderCard = ({ item, isCancelled, isConfirmed }: { item: ReservationDetails, isCancelled: boolean, isConfirmed: boolean }) => {
        
        // Define the status-specific color for the GLOW/shadow and text accent
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
            hour12: true // '02:00 PM' format
        });

        const nagName = 'Guest'; // item.nagName ?? 

        return (
            // cardWrapper handles the GLOW effect
            <View style={[staff_booking_styles.cardWrapper, {shadowColor: glowColor}]}> 
                <BlurView 
                    intensity={80} 
                    tint="dark" 
                    style={cardStyle} 
                >
                    <View style={staff_booking_styles.cardContent}>
                        
                        <View style={staff_booking_styles.cardHeader}>
                            
                            {/* LEFT COLUMN: Name + Seat (on one line) and Date/Time (next line) */}
                            <View style={staff_booking_styles.leftContent}>
                                
                                {/* 1. Name & Seats Row (Horizontal) */}
                                <View style={staff_booking_styles.nameAndSeatsRow}>
                                    {/* Name */}
                                    <Text style={staff_booking_styles.cardTitle} numberOfLines={1}>
                                        {nagName}
                                    </Text>
                                    
                                    {/* Seats container (Directly to the right of the name) */}
                                    <View style={[staff_booking_styles.seatsContainer, { borderColor: infoAccentColor }]}>
                                        <Text style={[staff_booking_styles.seatsLabel, { color: infoAccentColor }]}>🪑 </Text>
                                        <Text style={[staff_booking_styles.seatsValue, { color: infoAccentColor }]}>{item.guests}</Text>
                                    </View>
                                </View>

                                {/* 2. Date/Time Row (Below Name/Seats) */}
                                <View style={staff_booking_styles.infoRow}>
                                    <Text style={[staff_booking_styles.infoLabel, { color: infoAccentColor }]}>📅</Text>
                                    <Text style={staff_booking_styles.infoValueSmall}>
                                        {formattedDate} @ {formattedTime}
                                    </Text>
                                </View>
                            </View>

                            {/* RIGHT COLUMN: Action Buttons (Stacked Vertically) */}
                            <View style={staff_booking_styles.rightContent}>
                                <View style={staff_booking_styles.actionButtonsContainer}> 
                                    {/*Check to see if the reservation is already confirmed and if status wants to be changed*/}
                                    {!isConfirmed && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                        if (item.id) {
                                                            handleStatusUpdate(item.id, 1, ""); // Using 'confirmed' for status code '1'
                                                        } else {
                                                            console.error("Cannot update status: Reservation ID is missing.");
                                                        }
                                                    }}
                                            style={[staff_booking_styles.actionButtonCircle, staff_booking_styles.confirmButtonCircle]}
                                        >
                                            <Check color="#fff" size={18} />
                                        </TouchableOpacity>
                                    )}
                                    {/*Check to see if the reservation is already cancelled and if status wants to be changed*/}
                                    {!isCancelled && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                        if (item.id) {
                                                            handleStatusUpdate(item.id, 2, ""); // Using 'cancelled' for status code '2'
                                                        } else {
                                                            console.error("Cannot update status: Reservation ID is missing.");
                                                        }
                                                    }}
                                            style={[staff_booking_styles.actionButtonCircle, staff_booking_styles.cancelButtonCircle]}
                                        >
                                            <X color="#fff" size={18} />
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        onPress={() => handleContactCustomer(nagName)}
                                        style={[staff_booking_styles.actionButtonCircle, staff_booking_styles.contactButtonCircle]}
                                    >
                                        <MessageSquare color="#fff" size={18} /> 
                                    </TouchableOpacity>
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
    
    // RENDER WRAPPERS (KEPT)
    const renderPendingItem = ({ item } : ListRenderItemInfo<ReservationDetails>) => 
        renderCard({ item, isCancelled: false, isConfirmed: false });

    const renderConfirmedItem = ({ item } : ListRenderItemInfo<ReservationDetails>) => 
        renderCard({ item, isCancelled: false, isConfirmed: true });

    const renderCancelledItem = ({ item } : ListRenderItemInfo<ReservationDetails>) => 
        renderCard({ item, isCancelled: true, isConfirmed: false });
    
    // EMPTY COMPONENTS (KEPT)
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

    // MAIN RENDER BLOCK 
    return (
        <View style={staff_booking_styles.mainContainer}> 
            
            {/* 1. Pending Bookings Section - YELLOW Tint */}
            <View style={[staff_booking_styles.listSubSection, staff_booking_styles.listSectionFlex]}>
                <View style={staff_booking_styles.header}>
                    <Text style={staff_booking_styles.headerTitle}>Pending ({bookings.length})</Text>
                </View>
                
                {pendingLoading ? (
                    <SectionLoading text="Loading pending bookings..." />
                ) : (
                    <FlatList
                        data={bookings}
                        renderItem={renderPendingItem}
                        keyExtractor={(item) => item.id!.toString()}
                        ListEmptyComponent={PendingEmpty}
                        // APPLYING YELLOW TINT TO FLATLIST BACKGROUND
                        style={[staff_booking_styles.listContentFlatListBase, staff_booking_styles.listContentFlatListYellow]}
                    />
                )}
            </View>
            
            {/* 2. Confirmed Bookings Section - GREEN Tint */}
            <View style={[staff_booking_styles.listSubSection, staff_booking_styles.listSectionFlex]}>
                <View style={[staff_booking_styles.header, staff_booking_styles.sectionHeader]}>
                    <Text style={staff_booking_styles.headerTitle}>Confirmed ({confirmedBooking.length})</Text>
                    <View style={staff_booking_styles.refreshPlaceholder} />
                </View>
                
                {confirmedLoading ? (
                    <SectionLoading text="Loading confirmed bookings..." />
                ) : (
                    <FlatList
                        data={confirmedBooking}
                        renderItem={renderConfirmedItem}
                        keyExtractor={(item) => item.id!.toString()}
                        ListEmptyComponent={ConfirmedEmpty}
                        // APPLYING GREEN TINT TO FLATLIST BACKGROUND
                        style={[staff_booking_styles.listContentFlatListBase, staff_booking_styles.listContentFlatListGreen]}
                    />
                )}
            </View>

            {/* 3. Cancelled Bookings Section - RED Tint */}
            <View style={[staff_booking_styles.listSubSection, staff_booking_styles.listSectionFlex]}>
                <View style={[staff_booking_styles.header, staff_booking_styles.sectionHeader]}>
                    <Text style={staff_booking_styles.headerTitle}>Cancelled ({cancelledBooking.length})</Text>
                    <View style={staff_booking_styles.refreshPlaceholder} />
                </View>
                
                {cancelledLoading ? (
                    <SectionLoading text="Loading cancelled bookings..." />
                ) : (
                    <FlatList
                        data={cancelledBooking}
                        renderItem={renderCancelledItem}
                        keyExtractor={(item) => item.id!.toString()}
                        ListEmptyComponent={CancelledEmpty}
                        // APPLYING RED TINT TO FLATLIST BACKGROUND
                        style={[staff_booking_styles.listContentFlatListBase, staff_booking_styles.listContentFlatListRed]}
                    />
                )}
            </View>

        </View>
    );
};

// --- StyleSheet Definitions ---
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
    refreshButton: {
        backgroundColor: 'rgba(0, 136, 255, 0.3)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 25,
        borderWidth: 1.5,
        borderColor: 'rgba(0, 136, 255, 0.6)',
        elevation: 4,
    },
    refreshButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    refreshPlaceholder: {
        height: 38,
        width: 100,
    },
    
    // Base style for FlatList content
    listContentFlatListBase: {
        paddingHorizontal: 16,
        paddingTop: 0,
    },
    // TINTED FLATLIST BACKGROUNDS (Very low opacity for glow-through)
    listContentFlatListYellow: {
        backgroundColor: 'rgba(252, 211, 77, 0.04)', // Very subtle yellow tint
    },
    listContentFlatListGreen: {
        backgroundColor: 'rgba(52, 211, 153, 0.04)', // Very subtle green tint
    },
    listContentFlatListRed: {
        backgroundColor: 'rgba(239, 68, 68, 0.04)', // Very subtle red tint
    },
    
    // --- Card Styles (TINTED GLASS) ---
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
    
    // cardHeader is the primary row container (Left Content vs Right Buttons)
    cardHeader: {
        flexDirection: 'row', 
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    
    // Left content stack (Name, Seats, Date)
    leftContent: {
        flex: 1, // Takes up horizontal space (allowing action buttons room)
        flexDirection: 'column',
        marginRight: 8, // Space between left content and buttons
    },

    // Row to hold Name and Seats (Horizontal inside Left Column)
    nameAndSeatsRow: {
        flexDirection: 'row',
        alignItems: 'center', // Align vertically
        marginBottom: 4, 
    },
    
    cardTitle: {
        flexShrink: 1, // Allow name to wrap/truncate
        color: '#fff',
        fontSize: 18, 
        fontWeight: 'bold',
        marginRight: 10, // Space between name and seats
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10, // Space before the message container
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
    
    // Seats styling 
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
    
    // Right content stack (Action Buttons)
    rightContent: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        justifyContent: 'flex-start', // Align buttons to the top
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

    // --- Action Buttons (Clean Translucent) ---
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
    
    // --- Loading & Empty Styles---
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
});

export default BookingView;