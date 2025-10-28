import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Building, Calendar, Clock, MessageSquare, Users } from 'lucide-react-native';
import { useState, type FC } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import { ReservationDetails } from '../lib/types';
import { BRANCHES, BranchId } from '../lib/typesConst';
import { updateReservationStatus } from '../services/staff-service';
import { modalService } from '../services/modal-Service';

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
  const [loading, setLoading] = useState(false);

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
        modalService.showError('Error', 'Cannot update a booking without an ID.');
        return;
    }
    const bookingIdToUpdate = booking.id;
    setLoading(true);
    try {
        await updateReservationStatus(bookingIdToUpdate, 1, ''); 
        setIsEditing(false);
        onConfirm();
    } catch (error: any) {
        modalService.showError('Update Failed', "An error occurred while updating the booking. Please try again.");
        console.log('Update booking error:', error);
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteBooking = async () => {
    if (!booking?.id) {
        modalService.showError('Error', 'Cannot delete a booking without an ID.');
        return;
    }
    const bookingIdToDelete = booking.id;

    const rejectBookingLogic = async () => {
        // NOTE: This logic runs ONLY AFTER the user presses 'Yes' in the custom modal.
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(true);
        
        try {
            await updateReservationStatus(
                bookingIdToDelete, 
                2, // Assuming 2 is the status for 'Rejected'
                'Restaurant unable to accommodate reservation.'
            );
            // Optionally: Show a success toast/alert or re-fetch data
        } catch (error: any) {
            // Step 2: Use the updated showError signature (title, message)
            modalService.showError(
                'Could Not Reject Booking', 
                error.message || 'An unknown server error occurred.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleRejectBooking = () => {
        modalService.showConfirm(
            'Reject Booking', 
            'Are you sure you want to reject this reservation? This action cannot be undone.',
            rejectBookingLogic, // Pass the function to be executed on confirmation
            'Yes, Reject Booking', 
            'No'
        );
    };

    return (
        <View>
            <TouchableOpacity 
                style={[styles.authButton, { backgroundColor: '#B91C1C' }]}
                onPress={handleRejectBooking} 
                disabled={loading}
            >
                <Text style={styles.authButtonText}>{loading ? 'Rejecting...' : 'Reject Reservation'}</Text>
            </TouchableOpacity>
        </View>
    );
  };
  

  const displayBranch = branchMap[booking?.branch as unknown as BranchId] || ''; 
  const isFormVisible = isEditing;

  return (
    <View style={[styles.widgetContainer, { opacity: isActive ? 1 : 0.7, transform: [{ scale: isActive ? 1 : 0.95 }] }]}>
      <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
        <View style={styles.content}>
          <Text style={styles.title}>
            {isEditing ? 'Edit Booking' : booking?.nagName || 'Reservation Details'}
          </Text>
          
          {isFormVisible ? (
            <>
              <View style={styles.readOnlyContainer}>
                <Text style={styles.readOnlyText}>Editing is simplified for staff. Use the mobile form to manually modify/rebook if required.</Text>
              </View>
            </>
          ) : (
            booking && (
              <View style={styles.readOnlyContainer}>
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

const styles = StyleSheet.create({
    widgetContainer: { width: '100%', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.4)', minHeight: 520 },
    cardBlur: { flex: 1 },
    content: { padding: 20, justifyContent: 'space-between', flex: 1 },
    title: { fontSize: 22, fontFamily: 'PlayfairDisplay-Bold', color: 'white', marginBottom: 10, textAlign: 'center' },
    readOnlyContainer: { flex: 1, justifyContent: 'flex-start', gap: 15, paddingVertical: 20 },
    readOnlyItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)', width: '100%'},
    readOnlyText: { color: '#E0E0E0', fontSize: 16, flex: 1, flexWrap: 'wrap' },
    confirmButton: { padding: 15, borderRadius: 12, alignItems: 'center' },
    confirmButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    deleteButton: { padding: 15, borderRadius: 12, alignItems: 'center', backgroundColor: '#EF4444' },
    deleteButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

    authButton: {
      borderRadius: 16, overflow: 'hidden', marginTop: 10, marginBottom: 20, shadowColor: '#C89A5B',
      shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16,
    },
    authButtonGradient: { paddingVertical: 16, alignItems: 'center' },
    authButtonText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'white' },
});

export default BookingWidgetComponent;