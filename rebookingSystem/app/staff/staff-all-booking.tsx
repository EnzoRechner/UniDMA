import { BlurView } from 'expo-blur';
import { Timestamp } from 'firebase/firestore';
import { Check, MessageSquare, X, ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Alert, FlatList, ListRenderItemInfo, Text, View, StyleSheet, Pressable, StatusBar, TouchableOpacity } from 'react-native';
import { updateReservationStatus } from '../services/staff-service';
import { ReservationDetails } from '../lib/types';
import { router, useLocalSearchParams, Stack } from 'expo-router'; // Import Stack for header customization
import { useStaffBookings } from '../services/useStaffBookings'; 
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// Reusable Custom Header Component for consistency
const CustomBackHeader = ({ title }: { title: string }) => (
    <View style={styles.header}>
        <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()} // This is the key action to go back
        >
            <Ionicons name="arrow-back" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
    </View>
);


// 1. Initialize QueryClient (or use a global one if defined)
const queryClient = new QueryClient();

// Define the type for the status received from navigation params
type BookingStatus = 0 | 1 | 2;

// The main component should be wrapped with the QueryClientProvider
const StaffAllBookingView = () => (
    <QueryClientProvider client={queryClient}>
        <AllBookingViewContent />
    </QueryClientProvider>
);

const AllBookingViewContent = () => {
    const [staffId, setStaffId] = React.useState<string | null>(null);
    const [isIdLoading, setIsIdLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchStaffId = async () => {
            try {
                const id = await AsyncStorage.getItem('userId');
                setStaffId(id);
            } catch (error) {
                console.error("Failed to load staffId from storage:", error);
                setStaffId('0'); // Fallback ID
            } finally {
                setIsIdLoading(false);
            }
        };
        fetchStaffId();
    }, []);

    // Get the filterStatus from navigation parameters
    const params = useLocalSearchParams();
    const filterStatus = parseInt(params.filterStatus as string, 10) as BookingStatus;
    
    const statusTitles: { [key in BookingStatus]: string } = {
        0: 'Pending Bookings',
        1: 'Confirmed Bookings',
        2: 'Cancelled/Rejected',
    };

    // --- React Query Hook for Data ---
    const { 
        data: allBookings = [], 
        isLoading: isBookingsLoading, 
        refetch 
    } = useStaffBookings(staffId || '0', filterStatus, { 
        enabled: !isIdLoading && !!staffId 
    });

    // Determine card style based on filterStatus
    const isConfirmed = filterStatus === 1;
    const isCancelled = filterStatus === 2;

    // --- Handlers ---
    const handleStatusUpdate = async (id: string, newStatus: 1 | 2, reason: string) => {
        try {
            await updateReservationStatus(id, newStatus, reason); 
            Alert.alert('Success', 'Booking status updated.');
            // React Query will automatically update the list via the onSnapshot listener in useStaffBookings
        } catch (error) {
            Alert.alert('Error', 'Failed to update booking status.');
            console.error('Update error:', error);
        }
    };

    const handleContactCustomer = (email: string) => {
        Alert.alert("Contact Customer", `Start a chat or email with: ${email}`);
        console.log(`Initiating contact with: ${email}`);
    };

    // --- Render Logic (adapted from BookingViewContent) ---
    const renderCard = ({ item }: { item: ReservationDetails }) => {
        // Styles are now determined by the filterStatus, not the item's current status
        let glowColor = staff_booking_styles.pendingGlow.shadowColor;
        let infoAccentColor = '#fcd34d'; // Yellow
        let cardBaseStyle = staff_booking_styles.pendingCard;

        if (isConfirmed) {
            glowColor = staff_booking_styles.confirmGlow.shadowColor;
            infoAccentColor = '#34d399'; // Green
            cardBaseStyle = staff_booking_styles.confirmCard;
        } else if (isCancelled) {
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
                                    {/* Show Confirmation only for Pending view */}
                                    {!isConfirmed && !isCancelled && (
                                        <Pressable
                                            onPress={() => item.id && handleStatusUpdate(item.id, 1, "")}
                                            style={({ pressed }) => [
                                                staff_booking_styles.actionButtonCircle, 
                                                staff_booking_styles.confirmButtonCircle,
                                                { opacity: pressed ? 0.7 : 1 }
                                            ]}
                                        >
                                            <Check color="#fff" size={18} />
                                        </Pressable>
                                    )}
                                    {/* Show Cancellation/Rejection for Pending/Confirmed view */}
                                    {!isCancelled && (
                                        <Pressable
                                            onPress={() => item.id && handleStatusUpdate(item.id, 2, "")}
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
                                        onPress={() => handleContactCustomer(nagName)}
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
    
    const renderItem = ({ item } : ListRenderItemInfo<ReservationDetails>) => 
        renderCard({ item });

    const EmptyComponent = () => (
        <View style={staff_booking_styles.emptyList}>
            <Text style={staff_booking_styles.emptyTextPrimary}>
                {isConfirmed ? 'No Confirmed Bookings' : isCancelled ? 'No Cancelled Bookings' : 'No Pending Bookings'}
            </Text>
            <Text style={staff_booking_styles.emptyTextSecondary}>
                Check back later for updates.
            </Text>
        </View>
    );

    const LoadingComponent = () => (
        <View style={staff_booking_styles.sectionLoadingContainer}>
            <ActivityIndicator size="large" color="#a1a1aa" />
            <Text style={staff_booking_styles.sectionLoadingText}>Loading all {statusTitles[filterStatus].toLowerCase()}...</Text>
        </View>
    );

    // Determine the base FlatList style tint
    const listTintStyle = isConfirmed 
        ? staff_booking_styles.listContentFlatListGreen
        : isCancelled 
        ? staff_booking_styles.listContentFlatListRed 
        : staff_booking_styles.listContentFlatListYellow;


    // MAIN RENDER BLOCK 
    return (
        <View style={[staff_booking_styles.mainContainer, listTintStyle]}> 
            <CustomBackHeader title={statusTitles[filterStatus].toLowerCase()} />
            {/* Custom Header Setup for a single view */}
            <Stack.Screen 
                options={{
                    headerTitle: `${statusTitles[filterStatus]} (${allBookings.length})`,
                    headerTitleStyle: { color: '#fff', fontWeight: 'bold' },
                    headerStyle: { backgroundColor: '#09090b' },
                    headerLeft: () => (
                        <Pressable onPress={() => router.back()} style={{ marginLeft: 10 }}>
                            <ChevronLeft color="#fff" size={24} />
                        </Pressable>
                    ),
                }}
            />
            
            {isBookingsLoading ? (
                <LoadingComponent />
            ) : (
                <FlatList
                    data={allBookings}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id!.toString()}
                    ListEmptyComponent={EmptyComponent}
                    contentContainerStyle={staff_all_booking_styles.listContentContainer}
                    onRefresh={refetch}
                    refreshing={isBookingsLoading}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
  fullScreenBackground: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  // --- CUSTOM HEADER STYLES (Adapted from Dashboard) ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 40, // Increased padding to match the dashboard's internal header
    marginBottom: 20,
    backgroundColor: '#09090b', // Ensure background is consistent
  },
  title: {
    color: '#fff',
    fontSize: 24, // Slightly smaller title for sub-screen
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 20,
    // Note: justifyContent is not used here to keep the title in the center, 
    // the header itself uses 'space-between'
  },
  backButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '600',
  },
  // --- CONTENT STYLES ---
  contentText: {
    color: '#ccc',
    fontSize: 18,
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 20,
  },
  placeholderBox: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 20,
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});

// Re-use most styles from staff-booking-view, but define a new container style for the FlatList
const staff_all_booking_styles = StyleSheet.create({
    listContentContainer: {
        padding: 16, // Padding around the content
        minHeight: '100%', // Ensure it takes up full height when list is short
    },
    // Overriding mainContainer to allow listTintStyle to apply directly as the main view
    mainContainer: {
        flex: 1, 
        backgroundColor: '#09090b', // Default dark background
    },
    // We no longer need these section-specific styles as it's one main list
    listSubSection: { borderTopWidth: 0 },
    listSectionFlex: { flex: 1, minHeight: 0 },
    header: { display: 'none' }, // Hide the old header now that Stack.Screen manages it
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

    // --- View All Button Styles ---
    viewAllButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#EFEFEF', // Light gray background
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
});

export default StaffAllBookingView;