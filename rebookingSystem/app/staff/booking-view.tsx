import { Check, X, MessageSquare } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, FlatList, ListRenderItemInfo } from 'react-native';
import { Booking } from '../../lib/types';
import { fetchStaffLatestBookings, updateStatus } from '../../dataconnect/firestoreCrud';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur'; 
import { Timestamp } from 'firebase/firestore';

const BookingView = () => {
    const router = useRouter();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [cancelledBooking, setCancelledBookings] = useState<Booking[]>([]);
    const [confirmedBooking, setConfirmedBookings] = useState<Booking[]>([]); 
    
    const [pendingLoading, setPendingLoading] = useState(true);
    const [confirmedLoading, setConfirmedLoading] = useState(true);
    const [cancelledLoading, setCancelledLoading] = useState(true);
    
    const [userId, setUserId] = useState<string | null>(null);

    const getBookings = async (id: string) => {
        setPendingLoading(true);
        try {
            const allBookings = await fetchStaffLatestBookings(id, "pending");
            setBookings(allBookings);
        } catch (error) {
            console.error('Error fetching pending bookings:', error);
        } finally {
            setPendingLoading(false);
        }
    };

    const getCancelledBookings = async (id: string) => {
        setCancelledLoading(true);
        try {
            const allCancelled = await fetchStaffLatestBookings(id, "cancelled");
            setCancelledBookings(allCancelled);
        } catch (error) {
            console.error('Error fetching cancelled bookings:', error);
        } finally {
            setCancelledLoading(false);
        }
    };

    const getConfirmedBookings = async (id: string) => {
        setConfirmedLoading(true);
        try {
            const allConfirmed = await fetchStaffLatestBookings(id, "confirmed");
            setConfirmedBookings(allConfirmed);
        } catch (error) {
            console.error('Error fetching confirmed bookings:', error);
        } finally {
            setConfirmedLoading(false);
        }
    };

    useEffect(() => {
        const checkUserAndFetch = async () => {
          try {
            const Id = await AsyncStorage.getItem('userId');
            if (!Id) {
              router.replace('../login-related/login-page');
              return;
            }
            setUserId(Id);

            await Promise.all([
                getBookings(Id),
                getCancelledBookings(Id),
                getConfirmedBookings(Id)
            ]);
          } catch (error) {
            Alert.alert('Error', `Failed to load initial user data: ${error}.`);
          }
        };
        checkUserAndFetch();
    }, []);

    const handleStatusUpdate = async (id: string, status: 'confirmed' | 'cancelled') => {
        try {
            await updateStatus(id, status);
            const currentUserId = await AsyncStorage.getItem('userId');
            if (currentUserId) {
                getBookings(currentUserId);
                getCancelledBookings(currentUserId);
                getConfirmedBookings(currentUserId);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update booking status.');
            console.error('Update error:', error);
        }
    };

    const handleContactCustomer = (email: string) => {
        Alert.alert("Contact Customer", `Start a chat or email with: ${email}`);
        console.log(`Initiating contact with: ${email}`);
    };

    const renderCard = ({ item, isCancelled, isConfirmed }: { item: Booking, isCancelled: boolean, isConfirmed: boolean }) => {
        
        // Define the status-specific color for the GLOW/shadow and text accent
        let glowColor = styles.pendingGlow.shadowColor;
        let infoAccentColor = '#fcd34d'; // Yellow
        let cardBaseStyle = styles.pendingCard;

        if (isConfirmed) {
            glowColor = styles.confirmGlow.shadowColor;
            infoAccentColor = '#34d399'; // Green
            cardBaseStyle = styles.confirmCard;
        }
        if (isCancelled) {
            glowColor = styles.cancelledGlow.shadowColor;
            infoAccentColor = '#fb7185'; // Red
            cardBaseStyle = styles.cancelledCard;
        }

        const cardStyle = [
            styles.cardContainer,
            cardBaseStyle // This now carries the translucent background color
        ];
        
        const dateObject = item.dateOfArrival instanceof Timestamp 
            ? item.dateOfArrival.toDate() 
            : item.dateOfArrival;

        // Format the date using locale-aware methods
        const formattedDate = dateObject.toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
        
        // Format the time using locale-aware methods
        const formattedTime = dateObject.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: true // '02:00 PM' format
        });

        const customerDisplayEmail = item.custEmail ?? 'N/A';
        const customerDisplayName = item.custEmail?.split('@')[0] ?? 'Guest';

        return (
            // cardWrapper handles the GLOW effect
            <View style={[styles.cardWrapper, {shadowColor: glowColor}]}> 
                <BlurView 
                    intensity={80} 
                    tint="dark" 
                    style={cardStyle} 
                >
                    <View style={styles.cardContent}>
                        
                        <View style={styles.cardHeader}>
                            
                            {/* LEFT COLUMN: Name + Seat (on one line) and Date/Time (next line) */}
                            <View style={styles.leftContent}>
                                
                                {/* 1. Name & Seats Row (Horizontal) */}
                                <View style={styles.nameAndSeatsRow}>
                                    {/* Name */}
                                    <Text style={styles.cardTitle} numberOfLines={1}>
                                        {customerDisplayName}
                                    </Text>
                                    
                                    {/* Seats container (Directly to the right of the name) */}
                                    <View style={[styles.seatsContainer, { borderColor: infoAccentColor }]}>
                                        <Text style={[styles.seatsLabel, { color: infoAccentColor }]}>🪑 </Text>
                                        <Text style={[styles.seatsValue, { color: infoAccentColor }]}>{item.seats}</Text>
                                    </View>
                                </View>

                                {/* 2. Date/Time Row (Below Name/Seats) */}
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoLabel, { color: infoAccentColor }]}>📅</Text>
                                    <Text style={styles.infoValueSmall}>
                                        {formattedDate} @ {formattedTime}
                                    </Text>
                                </View>
                            </View>

                            {/* RIGHT COLUMN: Action Buttons (Stacked Vertically) */}
                            <View style={styles.rightContent}>
                                <View style={styles.actionButtonsContainer}> 
                                    
                                    {!isConfirmed && (
                                        <TouchableOpacity
                                            onPress={() => handleStatusUpdate(item.id, 'confirmed')}
                                            style={[styles.actionButtonCircle, styles.confirmButtonCircle]}
                                        >
                                            <Check color="#fff" size={18} />
                                        </TouchableOpacity>
                                    )}
                                    
                                    {!isCancelled && (
                                        <TouchableOpacity
                                            onPress={() => handleStatusUpdate(item.id, 'cancelled')}
                                            style={[styles.actionButtonCircle, styles.cancelButtonCircle]}
                                        >
                                            <X color="#fff" size={18} />
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        onPress={() => handleContactCustomer(customerDisplayEmail)}
                                        style={[styles.actionButtonCircle, styles.contactButtonCircle]}
                                    >
                                        <MessageSquare color="#fff" size={18} /> 
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View style={styles.messageContainer}>
                            <Text style={styles.messageText}>
                                <Text style={styles.messageLabel}>Note:</Text> {item.message || 'N/A'}
                            </Text>
                        </View>
                        
                    </View>
                </BlurView>
            </View>
        );
    };
    
    // RENDER WRAPPERS (KEPT)
    const renderPendingItem = ({ item } : ListRenderItemInfo<Booking>) => 
        renderCard({ item, isCancelled: false, isConfirmed: false });

    const renderConfirmedItem = ({ item } : ListRenderItemInfo<Booking>) => 
        renderCard({ item, isCancelled: false, isConfirmed: true });

    const renderCancelledItem = ({ item } : ListRenderItemInfo<Booking>) => 
        renderCard({ item, isCancelled: true, isConfirmed: false });
    
    // EMPTY COMPONENTS (KEPT)
    const PendingEmpty = () => (
        <View style={styles.emptyList}>
            <Text style={styles.emptyTextPrimary}>🎉 All Caught Up!</Text>
            <Text style={styles.emptyTextSecondary}>No pending reservations to review.</Text>
        </View>
    );
    const ConfirmedEmpty = () => (
        <View style={styles.emptyList}>
            <Text style={styles.emptyTextPrimary}>Ready to Go</Text>
            <Text style={styles.emptyTextSecondary}>No confirmed bookings currently.</Text>
        </View>
    );
    const CancelledEmpty = () => (
        <View style={styles.emptyList}>
            <Text style={styles.emptyTextPrimary}>Clear History</Text>
            <Text style={styles.emptyTextSecondary}>No cancelled bookings recorded.</Text>
        </View>
    );

    const SectionLoading = ({ text }: { text: string }) => (
        <View style={styles.sectionLoadingContainer}>
            <ActivityIndicator size="large" color="#a1a1aa" />
            <Text style={styles.sectionLoadingText}>{text}</Text>
        </View>
    );

    // MAIN RENDER BLOCK 
    return (
        <View style={styles.mainContainer}> 
            
            {/* 1. Pending Bookings Section - YELLOW Tint */}
            <View style={[styles.listSubSection, styles.listSectionFlex]}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Pending ({bookings.length})</Text>
                    
                    <TouchableOpacity
                        onPress={async () => {
                            if (userId) {
                                getBookings(userId);
                                getConfirmedBookings(userId);
                                getCancelledBookings(userId);
                            }
                        }}
                        style={styles.refreshButton}
                    >
                        <Text style={styles.refreshButtonText}>Refresh</Text>
                    </TouchableOpacity>
                </View>
                
                {pendingLoading ? (
                    <SectionLoading text="Loading pending bookings..." />
                ) : (
                    <FlatList
                        data={bookings}
                        renderItem={renderPendingItem}
                        keyExtractor={(item) => item.id.toString()}
                        ListEmptyComponent={PendingEmpty}
                        // APPLYING YELLOW TINT TO FLATLIST BACKGROUND
                        style={[styles.listContentFlatListBase, styles.listContentFlatListYellow]}
                    />
                )}
            </View>
            
            {/* 2. Confirmed Bookings Section - GREEN Tint */}
            <View style={[styles.listSubSection, styles.listSectionFlex]}>
                <View style={[styles.header, styles.sectionHeader]}>
                    <Text style={styles.headerTitle}>Confirmed ({confirmedBooking.length})</Text>
                    <View style={styles.refreshPlaceholder} />
                </View>
                
                {confirmedLoading ? (
                    <SectionLoading text="Loading confirmed bookings..." />
                ) : (
                    <FlatList
                        data={confirmedBooking}
                        renderItem={renderConfirmedItem}
                        keyExtractor={(item) => item.id.toString()}
                        ListEmptyComponent={ConfirmedEmpty}
                        // APPLYING GREEN TINT TO FLATLIST BACKGROUND
                        style={[styles.listContentFlatListBase, styles.listContentFlatListGreen]}
                    />
                )}
            </View>

            {/* 3. Cancelled Bookings Section - RED Tint */}
            <View style={[styles.listSubSection, styles.listSectionFlex]}>
                <View style={[styles.header, styles.sectionHeader]}>
                    <Text style={styles.headerTitle}>Cancelled ({cancelledBooking.length})</Text>
                    <View style={styles.refreshPlaceholder} />
                </View>
                
                {cancelledLoading ? (
                    <SectionLoading text="Loading cancelled bookings..." />
                ) : (
                    <FlatList
                        data={cancelledBooking}
                        renderItem={renderCancelledItem}
                        keyExtractor={(item) => item.id.toString()}
                        ListEmptyComponent={CancelledEmpty}
                        // APPLYING RED TINT TO FLATLIST BACKGROUND
                        style={[styles.listContentFlatListBase, styles.listContentFlatListRed]}
                    />
                )}
            </View>

        </View>
    );
};

// --- StyleSheet Definitions ---
const styles = StyleSheet.create({
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
        backgroundColor: '#09090b', // Ensures header remains dark and readable
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
    // NEW: TINTED FLATLIST BACKGROUNDS (Very low opacity for glow-through)
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
    
    // MODIFIED: cardHeader is the primary row container (Left Content vs Right Buttons)
    cardHeader: {
        flexDirection: 'row', 
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    
    // NEW: Left content stack (Name, Seats, Date)
    leftContent: {
        flex: 1, // Takes up horizontal space (allowing action buttons room)
        flexDirection: 'column',
        marginRight: 8, // Space between left content and buttons
    },

    // NEW: Row to hold Name and Seats (Horizontal inside Left Column)
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