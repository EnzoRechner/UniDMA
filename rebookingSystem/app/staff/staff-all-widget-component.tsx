import { useState, useMemo, useEffect, type FC } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Users, MessageSquare, Tag, Calendar, Building, Edit, Trash2, Clock } from 'lucide-react-native';
import { Timestamp } from 'firebase/firestore';
import { ReservationDetails} from '../lib/types';
import { BRANCHES, BranchId } from '../lib/typesConst';
import * as Haptics from 'expo-haptics';
import { updateReservationStatus } from '../services/staff-service'; 


const branchMap: { [key in BranchId]: string } = {
  [BRANCHES.PAARL]: 'Paarl',
  [BRANCHES.BELLVILLE]: 'Bellville',
  [BRANCHES.SOMERSET_WEST]: 'Somerset West',
};

const BookingWidgetComponent: FC<{
  booking?: ReservationDetails;
  isActive: boolean;
  onConfirm: () => void;
}> = ({ booking, isActive, onConfirm }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [bookingName, setBookingName] = useState('My Booking');
  const [date, setDate] = useState<Date>(() => new Date());
  const [seats, setSeats] = useState<number>(2);
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing && booking) {
        setDate(booking.dateOfArrival.toDate());
        setSeats(booking.guests);
        setMessage(booking.message || '');
        setBookingName(booking.bookingName);
    } else {
    }
  }, [isEditing, booking]);

  const getStatusStyle = (status?: number) => {
    switch (status) {
      case 1: return { text: 'Confirmed', color: '#10B981' };
      case 0: return { text: 'Awaiting Confirmation', color: '#F59E0B' };
      case 2: return { text: 'Rejected', color: '#EF4444' };
      default: return { text: 'Confirm Booking', color: '#C89A5B' };
    }
  };
  const statusInfo = getStatusStyle(booking?.status);

  const handleUpdateBooking = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!booking?.id) {
        Alert.alert('Error', 'Cannot update a booking without an ID.');
        return;
    }
    const bookingIdToUpdate = booking.id;
    setLoading(true);
    try {
        await updateReservationStatus(bookingIdToUpdate, 1, ''); 
        setIsEditing(false);
        onConfirm();
    } catch (error: any) {
        Alert.alert('Update Failed', error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteBooking = async () => {
    if (!booking?.id) {
        Alert.alert('Error', 'Cannot delete a booking without an ID.');
        return;
    }
    const bookingIdToDelete = booking.id;
    Alert.alert(
        'Reject Booking', 'Are you sure you want to reject this reservation?',
        [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes, Reject Booking',
                style: 'destructive',
                onPress: async () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    setLoading(true);
                    try {
                        // Update status to 2 (Rejected)
                        await updateReservationStatus(bookingIdToDelete, 2, 'Restaurant unable to accommodate reservation.');
                    } catch (error: any) {
                        Alert.alert('Error', 'Could not reject the booking.');
                    } finally {
                        setLoading(false);
                    }
                },
            },
        ]
    );
  };
  

  const displaySeats = `${isEditing ? seats : booking?.guests ?? seats} Seats`;
  const displayBranch = branchMap[booking?.branch as unknown as BranchId] || ''; 
  const isFormVisible = isEditing;

  return (
    <View style={[styles.widgetContainer, { opacity: isActive ? 1 : 0.7, transform: [{ scale: isActive ? 1 : 0.95 }] }]}>
      <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
        <View style={styles.content}>
          <Text style={styles.title}>
            {isEditing ? 'Edit Booking' : booking?.bookingName || 'Reservation Details'}
          </Text>
          
          {isFormVisible ? (
            <>
              {/* Simplified Form View for Staff Editing */}
              <View style={styles.readOnlyContainer}>
                <Text style={styles.readOnlyText}>Editing is simplified for staff. Use the mobile form to manually modify/rebook if required.</Text>
              </View>
            </>
          ) : (
            booking && (
              <View style={styles.readOnlyContainer}> {/* ✅ Removed conditional style */}
                <View style={styles.readOnlyItem}><Calendar size={18} color="#ccc" /><Text style={styles.readOnlyText}> {booking.dateOfArrival.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' '} @ {' '}
                    {booking.dateOfArrival.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text></View>
                <View style={styles.readOnlyItem}><Users size={18} color="#ccc" /><Text style={styles.readOnlyText}>{booking.guests} Seats</Text></View>
                <View style={styles.readOnlyItem}><Building size={18} color="#ccc" /><Text style={styles.readOnlyText}>{displayBranch}</Text></View>
                {booking.message ? <View style={styles.readOnlyItem}><MessageSquare size={18} color="#ccc" /><Text style={styles.readOnlyText} numberOfLines={2}>{booking.message}</Text></View> : null}
                <View style={styles.readOnlyItem}><Clock size={18} color="#ccc" /><Text style={styles.readOnlyText}>Booked: {booking.createdAt.toDate().toLocaleDateString()}</Text></View>
            </View>
            )
          )}
          
          {/* Action Buttons Section */}
          {booking && !isEditing && (
              <View>
                  <TouchableOpacity
                      style={[styles.confirmButton, { backgroundColor: statusInfo.color }]}
                      onPress={handleUpdateBooking} 
                      disabled={loading || booking.status !== 0} 
                  >
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>
                          {booking.status === 0 ? 'Confirm Booking' : statusInfo.text}
                      </Text>}
                  </TouchableOpacity>
                  
                  {/* Delete/Reject Button (Visible if not already Rejected/Cancelled) */}
                  {booking.status !== 2 && (
                      <TouchableOpacity
                          style={[styles.deleteButton, { marginTop: 10 }]}
                          onPress={handleDeleteBooking}
                          disabled={loading}
                      >
                          <Text style={styles.deleteButtonText}>Reject / Cancel</Text>
                      </TouchableOpacity>
                  )}
              </View>
          )}

        </View>
      </BlurView>
    </View>
  );
};

// ... (The styles object definition is omitted here but must be present in the original file)
const styles = StyleSheet.create({
    widgetContainer: { width: '100%', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.4)', minHeight: 520 },
    cardBlur: { flex: 1 },
    content: { padding: 20, justifyContent: 'space-between', flex: 1 },
    title: { fontSize: 22, fontWeight: 'bold', color: 'white', marginBottom: 10, textAlign: 'center' },
    readOnlyContainer: { flex: 1, justifyContent: 'flex-start', gap: 15, paddingVertical: 20 },
    readOnlyItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)', width: '100%'},
    readOnlyText: { color: '#E0E0E0', fontSize: 16, flex: 1, flexWrap: 'wrap' },
    confirmButton: { padding: 15, borderRadius: 12, alignItems: 'center' },
    confirmButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    deleteButton: { padding: 15, borderRadius: 12, alignItems: 'center', backgroundColor: '#EF4444' },
    deleteButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    // ... (rest of the required styles for inputs/pickers)
});

export default BookingWidgetComponent;