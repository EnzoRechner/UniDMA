import { Check, X, MessageSquare } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Booking } from '../../lib/types';
import { fetchStaffLatestBookings, updateStatus } from '../firebase/auth-firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BookingView = () => {
    // --- State and Handlers (Logic kept the same) ---
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [cancelledBooking, setCancelledBookings] = useState<Booking[]>([]);
    const [confirmedBooking, setConfirmedBookings] = useState<Booking[]>([]);    
    const [loading, setLoading] = useState(true);

    // Placeholder for data fetching logic
    const getBookings = async (id: string) => {
        setLoading(true);
        try {
            // Simulated fetch
            const allBookings = await fetchStaffLatestBookings(id, "pending");
            setBookings(allBookings);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCancelledBookings = async (id: string) => {
        try {
            // Simulated fetch
            const allCancelled = await fetchStaffLatestBookings(id, "cancelled");
            setCancelledBookings(allCancelled);
        } catch (error) {
            console.error('Error fetching cancelled bookings:', error);
        }
    };

    const getConfirmedBookings = async (id: string) => {
        try {
            // Simulated fetch
            const allConfirmed = await fetchStaffLatestBookings(id, "confirmed");
            setConfirmedBookings(allConfirmed);
        } catch (error) {
            console.error('Error fetching cancelled bookings:', error);
        }
    };

    useEffect(() => {
        const checkUserAndFetch = async () => {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) {
                Alert.alert('Authentication Error', 'You must be logged in to manage bookings.');
                setLoading(false);
                return;
            }
            // Fetch both lists on initial load
            await Promise.all([
                getBookings(userId),
                getCancelledBookings(userId),
                getConfirmedBookings(userId)
            ]);
            setLoading(false);
        };
        checkUserAndFetch();
    }, []);

    const handleStatusUpdate = async (id: string, status: 'confirmed' | 'cancelled') => {
        try {
            await updateStatus(id, status);
            const userId = await AsyncStorage.getItem('userId');
            if (userId) {
                getBookings(userId);
                getCancelledBookings(userId);
                getConfirmedBookings(userId);
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

    // --- Render Cards and Bookings ---
    const renderCard = (item: Booking, isCancelled: boolean, isConfirmed: boolean) => {

        const cardStyle = [
            styles.cardContainer,
            isCancelled ? styles.cancelledCard : (isConfirmed ? styles.confirmCard : styles.pendingCard)
        ];

        return (
            <View style={cardStyle}>
                {/* Customer Email */}
                <Text style={styles.cardTitle}>
                    {item.custEmail}
                </Text>

                {/* Date/Time */}
                <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: '#86efac' }]}>📅 Date/Time:</Text>
                    <Text style={styles.infoValue}>{item.date} @ {item.time}</Text>
                </View>

                {/* Seats */}
                <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: '#fcd34d' }]}>🪑 Seats:</Text>
                    <Text style={styles.infoValue}>{item.seats}</Text>
                </View>

                {/* Message */}
                <View style={styles.messageContainer}>
                    <Text style={styles.messageText}>
                        <Text style={styles.messageLabel}>Message:</Text> {item.message || 'N/A'}
                    </Text>
                </View>

                {/* Action Buttons Container */}
                <View style={styles.actionButtonsContainer}>
                    {!isConfirmed && (
                        <>
                            {/* Confirm Button */}
                            <TouchableOpacity
                                onPress={() => handleStatusUpdate(item.id, 'confirmed')}
                                style={[styles.actionButtonBase, styles.confirmButton]}
                            >
                                <Check color="#fff" size={18} />
                                <Text style={styles.actionButtonText}>CONFIRM</Text>
                            </TouchableOpacity>
                        </>
                    )}
                    {!isCancelled && (
                        <>
                            {/* Cancel Button */}
                            <TouchableOpacity
                                onPress={() => handleStatusUpdate(item.id, 'cancelled')}
                                style={[styles.actionButtonBase, styles.cancelButton]}
                            >
                                <X color="#fff" size={18} />
                                <Text style={styles.actionButtonText}>CANCEL</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* Contact Button (Glass style applied here) */}
                    <TouchableOpacity
                        onPress={() => handleContactCustomer(item.custEmail)}
                        style={styles.contactButton}
                    >
                        <MessageSquare color="#38bdf8" size={20} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };
    // --- End Render Item ---

    // Render the three cards here, Pending/ Cancelled and Confirmed
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#a1a1aa" />
                <Text style={styles.loadingText}>Fetching the latest booking information...</Text>
            </View>
        );
    }
    return (
      <ScrollView style={styles.listSection} contentContainerStyle={styles.scrollContent}>
          {/* Pending Bookings Section */}
          <View style={[styles.listSubSection]}>
              <View style={styles.header}>
                  <Text style={styles.headerTitle}>Pending ({bookings.length})</Text>
                  <TouchableOpacity
                      onPress={async () => {
                          const userId = await AsyncStorage.getItem('userId');
                          if (userId) getBookings(userId);
                      }}
                      style={styles.refreshButton}
                  >
                      <Text style={styles.refreshButtonText}>Refresh</Text>
                  </TouchableOpacity>
              </View>

                <View style={styles.listContent}>
                    {bookings.length > 0 ? (
                        bookings.map((item) => renderCard(item, false, false))
                    ) : (
                        <View style={styles.emptyList}>
                            <Text style={styles.emptyTextPrimary}>🎉 All Caught Up!</Text>
                            <Text style={styles.emptyTextSecondary}>No pending reservations to review.</Text>
                        </View>
                    )}
                </View>
          </View>
          
          {/* Confirmed Bookings Section */}
          <View style={[styles.listSubSection]}>
              <View style={[styles.header, styles.cancelledHeader]}>
                  <Text style={styles.headerTitle}>Confirmed ({confirmedBooking.length})</Text>
                  <TouchableOpacity
                      onPress={async () => {
                          const userId = await AsyncStorage.getItem('userId');
                          if (userId) getConfirmedBookings(userId);
                      }}
                      style={styles.refreshButton}
                  >
                      <Text style={styles.refreshButtonText}>Refresh</Text>
                  </TouchableOpacity>
              </View>

                <View style={styles.listContent}>
                    {confirmedBooking.length > 0 ? (
                        confirmedBooking.map((item) => renderCard(item, false, true))
                    ) : (
                        <View style={styles.emptyList}>
                            <Text style={styles.emptyTextPrimary}>Clear History</Text>
                            <Text style={styles.emptyTextSecondary}>No cancelled bookings recorded.</Text>
                        </View>
                    )}
                </View>
          </View>

          {/* Cancelled Bookings Section */}
          <View style={[styles.listSubSection]}>
              <View style={[styles.header, styles.cancelledHeader]}>
                  <Text style={styles.headerTitle}>Cancelled ({cancelledBooking.length})</Text>
                  <TouchableOpacity
                      onPress={async () => {
                          const userId = await AsyncStorage.getItem('userId');
                          if (userId) getCancelledBookings(userId);
                      }}
                      style={styles.refreshButton}
                  >
                      <Text style={styles.refreshButtonText}>Refresh</Text>
                  </TouchableOpacity>
              </View>

                <View style={styles.listContent}>
                    {cancelledBooking.length > 0 ? (
                        cancelledBooking.map((item) => renderCard(item, true, false))
                    ) : (
                        <View style={styles.emptyList}>
                            <Text style={styles.emptyTextPrimary}>Ready to Go</Text>
                            <Text style={styles.emptyTextSecondary}>No confirmed bookings currently.</Text>
                        </View>
                    )}
                </View>
          </View>

      </ScrollView>
    );
};

// --- StyleSheet Definitions ---
const styles = StyleSheet.create({
    listSection: {
        flex: 1,
        backgroundColor: '#09090b',
    },
    scrollContent: {
        paddingBottom: 20, 
    },
    listSubSection: {
        minHeight: 10,
        borderTopWidth: 1,
        borderTopColor: '#18181b',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
    },
    cancelledHeader: {
        paddingTop: 15,
    },
    headerTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 22,
        letterSpacing: 0.5,
    },
    refreshButton: {
        backgroundColor: 'rgba(0, 136, 255, 0.4)', // Glass button base
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 25,
        borderWidth: 1.5,
        borderColor: 'rgba(0, 27, 68, 0.81)',
        elevation: 4,
    },
    refreshButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    
    // --- Card Styles (Glassmorphism) ---
    cardContainer: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 15,
        borderWidth: 1.5,
        overflow: 'hidden',
        elevation: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    pendingCard: {
        borderColor: 'rgba(0, 136, 255, 0.5)', // Blue accent
        shadowColor: '#0088ff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    cancelledCard: {
        borderColor: 'rgba(220, 38, 38, 0.5)', // Red accent
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    confirmCard: {
        borderColor: 'rgba(34, 197, 94, 0.5)', // Green accent
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    cardTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        letterSpacing: 0.2,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 4,
        alignItems: 'center',
    },
    infoLabel: {
        fontWeight: 'bold',
        marginRight: 8,
        fontSize: 14,
    },
    infoValue: {
        color: '#d1d5db',
        fontSize: 14,
    },
    messageContainer: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    messageText: {
        color: '#a1a1aa',
        fontSize: 14,
    },
    messageLabel: {
        fontWeight: 'bold',
        color: '#d1d5db',
    },

    // --- Action Button Styles ---
    actionButtonsContainer: {
        flexDirection: 'row',
        marginTop: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    actionButtonBase: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginRight: 10,
        elevation: 4,
    },
    confirmButton: {
        backgroundColor: 'rgba(34, 197, 94, 0.6)', // Green translucent
        borderColor: 'rgba(22, 101, 52, 0.8)',
        borderWidth: 1,
    },
    cancelButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.6)', // Red translucent
        borderColor: 'rgba(153, 27, 27, 0.8)',
        borderWidth: 1,
    },
    actionButtonText: {
        color: '#fff',
        marginLeft: 6,
        fontWeight: 'bold',
        fontSize: 13,
    },
    contactButton: {
        // Subtle glass style for icon
        padding: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(2, 44, 110, 0.8)',
    },

    // --- Empty & Loading States ---
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#09090b',
    },
    loadingText: {
        color: '#a1a1aa',
        marginTop: 8,
        fontSize: 16,
    },
    emptyList: {
        alignItems: 'center',
        marginTop: 40,
        padding: 20,
        marginHorizontal: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
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