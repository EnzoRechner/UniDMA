import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Timestamp, collection, doc, setDoc } from 'firebase/firestore';
import { Building, Calendar, Clock, Edit, MessageSquare, Tag, Trash2, Users, X } from 'lucide-react-native';
import { useEffect, useMemo, useState, type FC } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ReservationDetails, UserProfile } from '../lib/types';
import { BRANCHES, BranchId } from '../lib/typesConst';
import { cancelReservation } from '../services/customer-service';
import { db } from '../services/firebase-initilisation';
import { modalService } from '../services/modal-Service';
import CustomWheelPicker from './customer-wheel';

const branchMap: { [key in BranchId]: string } = {
  [BRANCHES.PAARL]: 'Paarl',
  [BRANCHES.BELLVILLE]: 'Bellville',
  [BRANCHES.SOMERSET_WEST]: 'Somerset West',
};

const generatePickerData = () => {
    const dates: Date[] = [];
    for (let i = 0; i < 90; i++) {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + i);
        dates.push(newDate);
    }
    const dateLabels = dates.map(d => {
        if (d.toDateString() === new Date().toDateString()) return 'Today';
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    });
    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minutes = Array.from({ length: 4 }, (_, i) => (i * 15).toString().padStart(2, '0'));
    const periods = ['AM', 'PM'];
    const seats = Array.from({ length: 30 }, (_, i) => (i + 1).toString());
    return { dates, dateLabels, hours, minutes, periods, seats };
};

// --- MODIFICATION: Updated props interface ---
interface BookingWidgetComponentProps {
  booking?: ReservationDetails;
  userProfile: UserProfile;
  isActive: boolean;
  onConfirm: (newBookingId?: string) => void;
  realBookingsCount: number; // Prop to receive the count
  isEditMode?: boolean;
}

const BookingWidgetComponent: FC<BookingWidgetComponentProps> = ({ 
  booking, 
  userProfile, 
  isActive, 
  onConfirm,
  realBookingsCount, // --- MODIFICATION: Destructure the prop ---
  isEditMode = false,
}) => {
  const isNewBooking = !booking;
  const [isEditing, setIsEditing] = useState(false);
  const [bookingName, setBookingName] = useState('My Booking');
  const [date, setDate] = useState<Date>(() => new Date());
  const [seats, setSeats] = useState<number>(2);
  const [branch, setBranch] = useState<BranchId>(userProfile.branch || BRANCHES.PAARL);
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isSeatPickerVisible, setSeatPickerVisible] = useState(false);
  const [isBranchPickerVisible, setBranchPickerVisible] = useState(false);
  const pickerData = useMemo(() => generatePickerData(), []);
  const [tempSeats, setTempSeats] = useState(seats.toString());
  const [tempBranch, setTempBranch] = useState<BranchId>(branch);

  useEffect(() => {
    if (isEditing && booking) {
        setDate(booking.dateOfArrival.toDate());
        setSeats(booking.guests);
        setBranch(booking.branch as unknown as BranchId);
        setMessage(booking.message || '');
        setBookingName(booking.bookingName);
    } else if (isNewBooking) {
        const now = new Date();
        now.setHours(19, 0, 0, 0);
        setDate(now);
    }
  }, [isEditing, booking, isNewBooking]);

  const isRebookable = useMemo(() => {
    if (!booking) return false;
    if (booking.status === 5) return true;
    if (booking.status !== 2) return false;
    const reason = (booking.rejectionReason || '').toLowerCase();
    return /(rebook|unpause|paused|resume|resumed)/.test(reason);
  }, [booking]);

  const getStatusStyle = (status?: number) => {
    if (isRebookable) return { text: 'Rebook', color: '#C89A5B' };
    switch (status) {
      case 1: return { text: 'Confirmed', color: '#10B981' };
      case 0: return { text: 'Awaiting Confirmation', color: '#F59E0B' };
      case 2: return { text: 'Rejected', color: '#EF4444' };
      default: return { text: 'Confirm Booking', color: '#C89A5B' };
    }
  };
  const statusInfo = getStatusStyle(booking?.status);

  const createBookingData = (newId: string) => {
    return {
      userId: userProfile.userId,
      branch: branch,
      dateOfArrival: Timestamp.fromDate(date),
      guests: seats,
      message: message,
      bookingName: bookingName,
      seat: "Any",
      nagName: userProfile.nagName,
      
      id: newId,
      status: 0,
      createdAt: Timestamp.now(),
      restaurant: userProfile.restaurant || 0,
    };
  };

  const handleCreateBooking = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // --- MODIFICATION: Booking limit check ---
    if (realBookingsCount >= 5) {
      modalService.showError(
        'Booking Limit Reached',
        'Error please delete a booking to making a new booking.'
      );
      return; // Stop the function
    }
    // --- End of modification ---

    if (!userProfile?.userId) return modalService.showError('Error', 'Could not find User ID.');
    setLoading(true);
    try {
      const newDocRef = doc(collection(db, 'nagbookings'));
      const newId = newDocRef.id;
      const newBookingData = createBookingData(newId);
      await setDoc(newDocRef, newBookingData);
      onConfirm(newId);
  } catch {
      modalService.showError('Booking Failed', 'There was a problem creating your booking. Please try again.');
    } finally { setLoading(false); }
  };

  const handleUpdateBooking = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!booking?.id) {
        modalService.showError('Error', 'Cannot update a booking without an ID.');
        return;
    }
    const bookingIdToUpdate = booking.id;
    setLoading(true);
    try {
        await cancelReservation(bookingIdToUpdate);
        
        const newDocRef = doc(collection(db, 'nagbookings'));
        const newId = newDocRef.id;
        const newBookingData = createBookingData(newId);
        await setDoc(newDocRef, newBookingData);

        setIsEditing(false);
        setShowOptions(false);
        onConfirm(newId);
  } catch {
        modalService.showError('Update Failed', "There was a problem updating your booking. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const startEditingFromBooking = () => {
    if (!booking) return;
    setDate(booking.dateOfArrival.toDate());
    setSeats(booking.guests);
    setBranch(booking.branch as unknown as BranchId);
    setMessage(booking.message || '');
    setBookingName(booking.bookingName);
    setIsEditing(true);
    setShowOptions(false);
  };

  const cancelBookingLogic = async (bookingIdToDelete: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setLoading(true);

    try {
        // Assuming cancelReservation handles the API call to update the status to cancelled/deleted
        await cancelReservation(bookingIdToDelete);
        
        // Optional: Provide success feedback
        modalService.showSuccess('Success', 'Booking has been successfully deleted.'); 

  } catch {
        // Use the centralized error modal for reporting failure
        modalService.showError('Error', 'Could not delete the booking.');
    } finally {
        setLoading(false);
        // Hide options menu regardless of success/failure
        setShowOptions(false); 
    }
};

  const handleDeleteBooking = async () => {
    if (!booking?.id) {
        modalService.showError('Error', 'Cannot delete a booking without an ID.');
        return;
    }
    const bookingIdToDelete = booking.id;

    modalService.showConfirm(
        'Delete Booking', 
        'Are you sure you want to delete this booking? This action cannot be undone.',
        () => cancelBookingLogic(bookingIdToDelete), 
        'Yes, Delete Booking', 
        'No'
    );
  };

  const handleSeatPickerConfirm = () => { setSeats(parseInt(tempSeats, 10)); setSeatPickerVisible(false); };
  const handleBranchPickerConfirm = () => { setBranch(tempBranch); setBranchPickerVisible(false); };
  const handleBranchSelect = (selectedBranchId: BranchId) => { setTempBranch(selectedBranchId); };
  
  const handleDatePartChange = (part: 'date' | 'hour' | 'minute' | 'period', value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
    const newDate = new Date(date);
    switch (part) {
        case 'date':
            const idx = pickerData.dateLabels.indexOf(value);
            if (idx !== -1) {
                const chosenDate = pickerData.dates[idx];
                newDate.setFullYear(chosenDate.getFullYear(), chosenDate.getMonth(), chosenDate.getDate());
            }
            break;
        case 'hour':
            const currentHour = newDate.getHours();
            let newHour = parseInt(value, 10);
            if (newHour === 12) newHour = 0;
            if (currentHour >= 12) {
                if (newHour < 12) newHour += 12;
            }
            newDate.setHours(newHour);
            break;
        case 'minute':
            newDate.setMinutes(parseInt(value, 10));
            break;
        case 'period':
            const h = newDate.getHours();
            if (value === 'PM' && h < 12) newDate.setHours(h + 12);
            else if (value === 'AM' && h >= 12) newDate.setHours(h - 12);
            break;
    }
    setDate(newDate);
  };

  const displaySeats = `${isEditing ? seats : booking?.guests ?? seats} Seats`;
  const displayBranch = branchMap[isEditing ? branch : (booking?.branch as unknown as BranchId) ?? branch];
  const initialDateLabel = pickerData.dateLabels.find((_, index) => pickerData.dates[index].toDateString() === date.toDateString()) || 'Today';
  const isFormVisible = isNewBooking || isEditing;

  return (
    <View style={[styles.widgetContainer, { opacity: isActive ? 1 : 0.7, transform: [{ scale: isActive ? 1 : 0.95 }] }]}> 
      {isEditMode && !!booking && (
        <TouchableOpacity
          onPress={handleDeleteBooking}
          style={styles.deleteBadge}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={16} color="#0D0D0D" />
        </TouchableOpacity>
      )}
      <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
        <View style={styles.content}>
          <Text style={styles.title}>
            {isNewBooking ? 'Make a New Booking' : isEditing ? 'Edit Booking' : booking!.bookingName}
          </Text>
          
          {isFormVisible ? (
            <>
              <View style={styles.fieldContainer}><View style={styles.inputWrapper}><Tag size={18} color="#C89A5B" style={{marginRight: 8}} /><TextInput value={bookingName} onChangeText={setBookingName} placeholder="Name your booking" placeholderTextColor="#999" style={styles.textInput} /></View></View>
              <View style={styles.pickerRow}>
                  <CustomWheelPicker width={140} data={pickerData.dateLabels} initialValue={initialDateLabel} onSelect={(val) => handleDatePartChange('date', val)} />
                  <CustomWheelPicker width={60} data={pickerData.hours} initialValue={(date.getHours() % 12 || 12).toString().padStart(2, '0')} onSelect={(val) => handleDatePartChange('hour', val)} />
                  <Text style={styles.timeSeparator}>:</Text>
                  <CustomWheelPicker width={60} data={pickerData.minutes} initialValue={(Math.floor(date.getMinutes() / 15) * 15).toString().padStart(2, '0')} onSelect={(val) => handleDatePartChange('minute', val)} />
                  <CustomWheelPicker width={60} data={pickerData.periods} initialValue={date.getHours() >= 12 ? 'PM' : 'AM'} onSelect={(val) => handleDatePartChange('period', val)} />
              </View>
              <View style={styles.fieldContainer}><TouchableOpacity onPress={() => setSeatPickerVisible(true)} style={styles.pickerButton}><Users size={18} color="#C89A5B" /><Text style={styles.inputText}>{displaySeats}</Text></TouchableOpacity></View>
              <View style={styles.fieldContainer}><TouchableOpacity onPress={() => setBranchPickerVisible(true)} style={styles.pickerButton}><Building size={18} color="#C89A5B" /><Text style={styles.inputText}>{displayBranch}</Text></TouchableOpacity></View>
              <View style={styles.fieldContainer}><View style={styles.inputWrapper}><MessageSquare size={18} color="#C89A5B" style={{marginRight: 8}} /><TextInput value={message} onChangeText={setMessage} placeholder="Message (optional)" placeholderTextColor="#999" style={styles.textInput} multiline /></View></View>
            </>
          ) : (
            booking && (
                <View style={[styles.readOnlyContainer, !booking.message && { justifyContent: 'space-around' }]}>
                    {(booking.status === 2 || booking.status === 5) && (
                      <View style={styles.infoBanner}>
                        <Text style={styles.infoBannerText}>
                          {booking.rejectionReason || 'This booking was paused by the branch. Please rebook to confirm a new time.'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.readOnlyItem}><Calendar size={18} color="#ccc" /><Text style={styles.readOnlyText}>{booking.dateOfArrival.toDate().toLocaleString('en-US', { weekday: 'short', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text></View>
                    <View style={styles.readOnlyItem}><Users size={18} color="#ccc" /><Text style={styles.readOnlyText}>{booking.guests} Seats</Text></View>
                    <View style={styles.readOnlyItem}><Building size={18} color="#ccc" /><Text style={styles.readOnlyText}>{branchMap[booking.branch as unknown as BranchId]}</Text></View>
                    {booking.message ? <View style={styles.readOnlyItem}><MessageSquare size={18} color="#ccc" /><Text style={styles.readOnlyText} numberOfLines={2}>{booking.message}</Text></View> : null}
                    <View style={styles.readOnlyItem}><Clock size={18} color="#ccc" /><Text style={styles.readOnlyText}>Booked: {booking.createdAt.toDate().toLocaleDateString()}</Text></View>
                </View>
            )
          )}
          <View>
      {showOptions && !isFormVisible && (
                <View style={styles.expandedOptionsContainer}>
          <TouchableOpacity style={[styles.optionButton, {backgroundColor: '#3B82F6'}]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startEditingFromBooking(); }}>
                        <Edit size={20} color="white" />
                        <Text style={styles.optionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.optionButton, {backgroundColor: '#EF4444'}]} onPress={handleDeleteBooking}>
                        <Trash2 size={20} color="white" />
                        <Text style={styles.optionButtonText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            )}
            <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: statusInfo.color }]}
                onPress={
                  isNewBooking
                    ? handleCreateBooking
                    : isEditing
                      ? handleUpdateBooking
                      : isRebookable
            ? () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); startEditingFromBooking(); }
                        : () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowOptions(!showOptions); }
                }
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>{isEditing ? 'Save Changes' : statusInfo.text}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
      
      <Modal animationType="slide" transparent={true} visible={isSeatPickerVisible} onRequestClose={() => setSeatPickerVisible(false)}>
         <View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>Select Number of Seats</Text><CustomWheelPicker data={pickerData.seats} initialValue={seats.toString()} onSelect={setTempSeats} /><View style={styles.modalActions}><TouchableOpacity style={styles.modalButton} onPress={() => setSeatPickerVisible(false)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.confirmModalButton]} onPress={handleSeatPickerConfirm}><Text style={[styles.modalButtonText, {color: '#fff'}]}>Confirm</Text></TouchableOpacity></View></View></View>
      </Modal>
      <Modal animationType="slide" transparent={true} visible={isBranchPickerVisible} onRequestClose={() => setBranchPickerVisible(false)}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}><Text style={styles.modalTitle}>Select Branch</Text>{Object.entries(branchMap).map(([id, name]) => ( <TouchableOpacity key={id} style={[ styles.modalListItem, tempBranch === Number(id) && styles.modalListItemSelected ]} onPress={() => handleBranchSelect(Number(id) as BranchId)}>
                    <Text style={styles.modalListItemText}>{name}</Text>
                </TouchableOpacity>
              ))}<View style={styles.modalActions}><TouchableOpacity style={styles.modalButton} onPress={() => setBranchPickerVisible(false)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.modalButton, styles.confirmModalButton]} onPress={handleBranchPickerConfirm}><Text style={[styles.modalButtonText, {color: '#fff'}]}>Confirm</Text></TouchableOpacity></View></View></View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
    widgetContainer: { width: '100%', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.4)', minHeight: 520 },
    cardBlur: { flex: 1 },
    content: { padding: 20, justifyContent: 'space-between', flex: 1 },
    title: { fontSize: 22, fontFamily: 'PlayfairDisplay-Bold', color: 'white', marginBottom: 10, textAlign: 'center' },
    fieldContainer: { marginVertical: 6 },
    pickerButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.5)', minHeight: 48 },
    inputText: { color: 'white', fontSize: 14, fontWeight: '600', flex: 1 },
    textInput: { color: 'white', fontSize: 14, flex: 1, paddingTop: Platform.OS === 'ios' ? 0 : 8, paddingBottom: Platform.OS === 'ios' ? 0 : 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.3)', paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.5)', minHeight: 48 },
    confirmButton: { padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    confirmButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', marginVertical: 10, paddingHorizontal: 5 },
    timeSeparator: { fontSize: 18, fontWeight: 'bold', color: 'white', marginHorizontal: -10 },
    readOnlyContainer: { flex: 1, justifyContent: 'center', gap: 15, paddingVertical: 20 },
    readOnlyItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)'},
    readOnlyText: { color: '#E0E0E0', fontSize: 15, flex: 1 },
    expandedOptionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        gap: 10,
    },
    optionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    optionButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    modalContent: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
    modalActions: { flexDirection: 'row', marginTop: 20, width: '100%', justifyContent: 'space-around' },
    modalButton: { paddingVertical: 10, paddingHorizontal: 30, borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
    confirmModalButton: { backgroundColor: '#C89A5B' },
    modalButtonText: { color: '#C89A5B', fontSize: 16, fontWeight: '600' },
    modalListItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)', width: '100%', alignItems: 'center' },
    modalListItemSelected: { backgroundColor: 'rgba(200, 154, 91, 0.2)' },
    modalListItemText: { color: 'white', fontSize: 16,},
  infoBanner: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.4)', borderWidth: 1, borderRadius: 8, padding: 10 },
  infoBannerText: { color: '#FCA5A5', fontSize: 13, fontWeight: '600' },
  deleteBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(13,13,13,0.4)'
  },
});

export default BookingWidgetComponent;