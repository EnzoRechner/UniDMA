import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Timestamp } from 'firebase/firestore';
import { Check, MessageSquare, X, Calendar, Clock, Users, User } from 'lucide-react-native';

import { getStaffUserProfile, onSnapshotStaffBookings, updateBookingStatus } from './staff-service';
import { ReservationDetails, UserProfile, ROLES, BranchId, BRANCHES } from '../lib/types';

// Helper to get Branch Name from ID
const branchMap: { [key in BranchId]: string } = {
    [BRANCHES.PAARL]: 'Paarl',
    [BRANCHES.BELLVILLE]: 'Bellville',
    [BRANCHES.SOMERSET_WEST]: 'Somerset West',
};

// Card Component for displaying a single booking
const BookingCard = ({ item }: { item: ReservationDetails }) => {
    const statusStyles = {
        0: { name: 'Pending', color: '#F59E0B' }, // Yellow
        1: { name: 'Confirmed', color: '#10B981' }, // Green
        2: { name: 'Rejected', color: '#EF4444' },  // Red
    };
    const status = statusStyles[item.status as 0 | 1 | 2];

    const handleStatusUpdate = (newStatus: 1 | 2) => {
        Alert.alert(
            `${newStatus === 1 ? 'Confirm' : 'Reject'} Booking`,
            `Are you sure you want to ${newStatus === 1 ? 'confirm' : 'reject'} this booking for ${item.nagName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Yes', 
                    onPress: async () => {
                        try {
                            await updateBookingStatus(item.id, newStatus);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to update booking status.');
                        }
                    }
                }
            ]
        );
    };
    
    return (
        <View style={styles.cardWrapper}>
            <BlurView intensity={25} tint="dark" style={[styles.cardBlur, { borderColor: status.color }]}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.bookingName}</Text>
                    <View style={[styles.statusPill, { backgroundColor: `${status.color}30` }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>{status.name}</Text>
                    </View>
                </View>
                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}><User size={14} color="#C89A5B" /><Text style={styles.infoText}>{item.nagName}</Text></View>
                    <View style={styles.infoItem}><Users size={14} color="#C89A5B" /><Text style={styles.infoText}>{item.guests} Guests</Text></View>
                    <View style={styles.infoItem}><Calendar size={14} color="#C89A5B" /><Text style={styles.infoText}>{item.dateOfArrival.toDate().toLocaleDateString('en-GB')}</Text></View>
                    <View style={styles.infoItem}><Clock size={14} color="#C89A5B" /><Text style={styles.infoText}>{item.dateOfArrival.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text></View>
                </View>

                {item.message && (
                    <View style={styles.messageContainer}>
                        <MessageSquare size={14} color="#C89A5B" style={{ marginTop: 2 }} />
                        <Text style={styles.messageText}>{item.message}</Text>
                    </View>
                )}

                {item.status === 0 && (
                    <View style={styles.actionContainer}>
                        <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => handleStatusUpdate(2)}>
                            <X size={16} color="white" />
                            <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.confirmButton]} onPress={() => handleStatusUpdate(1)}>
                            <Check size={16} color="white" />
                            <Text style={styles.actionButtonText}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </BlurView>
        </View>
    );
};

// Main Screen Component
const StaffBookingView = () => {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [pendingBookings, setPendingBookings] = useState<ReservationDetails[]>([]);
    const [confirmedBookings, setConfirmedBookings] = useState<ReservationDetails[]>([]);
    const [rejectedBookings, setRejectedBookings] = useState<ReservationDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const unsubscribesRef = useRef<(() => void)[]>([]);

    useEffect(() => {
        const loadStaffData = async () => {
            try {
                const userId = await AsyncStorage.getItem('userId');
                if (!userId) {
                    router.replace('./auth/auth-login');
                    return;
                }

                const profile = await getStaffUserProfile(userId);
                if (!profile || (profile.role !== ROLES.STAFF && profile.role !== ROLES.ADMIN && profile.role !== ROLES.SUPER_ADMIN)) {
                    Alert.alert('Access Denied', 'You do not have permission to view this page.');
                    router.replace('/customer/customer-page');
                    return;
                }
                setUserProfile(profile);

                // Setup listeners
                unsubscribesRef.current.push(onSnapshotStaffBookings(profile.branch, 0, setPendingBookings));
                unsubscribesRef.current.push(onSnapshotStaffBookings(profile.branch, 1, setConfirmedBookings));
                unsubscribesRef.current.push(onSnapshotStaffBookings(profile.branch, 2, setRejectedBookings));
                
            } catch (error) {
                Alert.alert('Error', 'Could not load staff data.');
                router.replace('./auth/auth-login');
            } finally {
                setLoading(false);
            }
        };

        loadStaffData();

        return () => {
            unsubscribesRef.current.forEach(unsubscribe => unsubscribe());
        };
    }, []);

    if (loading) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#C89A5B" /></View>;
    }

    const renderListSection = (title: string, data: ReservationDetails[]) => (
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{title} ({data.length})</Text>
            <FlatList
                data={data}
                renderItem={({ item }) => <BookingCard item={item} />}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={<Text style={styles.emptyText}>No bookings in this category.</Text>}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#0D0D0D', '#1A1A1A']} style={styles.background} />
            <ScrollView>
                <View style={styles.header}>
                    <Text style={styles.title}>Manage Bookings</Text>
                    <Text style={styles.subtitle}>{userProfile ? `${branchMap[userProfile.branch]} Branch` : ''}</Text>
                </View>
                {renderListSection('Pending Review', pendingBookings)}
                {renderListSection('Confirmed', confirmedBookings)}
                {renderListSection('Rejected / Cancelled', rejectedBookings)}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0D' },
    header: { padding: 20, paddingTop: 30, alignItems: 'center' },
    title: { fontSize: 28, fontFamily: 'PlayfairDisplay-Bold', color: '#C89A5B' },
    subtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4 },
    sectionContainer: { marginBottom: 20 },
    sectionTitle: { fontSize: 20, fontFamily: 'PlayfairDisplay-Bold', color: 'white', marginLeft: 20, marginBottom: 15 },
    listContent: { paddingHorizontal: 20 },
    emptyText: { color: '#888', fontStyle: 'italic', padding: 20 },
    
    // Card Styles
    cardWrapper: { width: 320, marginRight: 15, borderRadius: 16 },
    cardBlur: { padding: 15, borderRadius: 16, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    cardTitle: { fontSize: 18, fontFamily: 'Inter-Bold', color: 'white', flex: 1 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { fontSize: 12, fontFamily: 'Inter-SemiBold' },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
    infoItem: { flexDirection: 'row', alignItems: 'center', width: '50%', marginBottom: 8, gap: 6 },
    infoText: { color: '#DDD', fontSize: 13, fontFamily: 'Inter-Regular' },
    messageContainer: { flexDirection: 'row', gap: 6, backgroundColor: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 8, marginTop: 4 },
    messageText: { color: '#BBB', fontSize: 13, fontStyle: 'italic', flex: 1 },

    // Action Buttons
    actionContainer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(200, 154, 91, 0.2)', paddingTop: 12, marginTop: 12 },
    actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
    actionButtonText: { color: 'white', fontFamily: 'Inter-SemiBold', fontSize: 14 },
    confirmButton: { backgroundColor: 'rgba(16, 185, 129, 0.8)' },
    rejectButton: { backgroundColor: 'rgba(239, 68, 68, 0.8)' },
});

export default StaffBookingView;
