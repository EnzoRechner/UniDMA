import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Calendar, Clock, Users, MessageSquare, Tag } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Timestamp } from 'firebase/firestore';
import { addReservation } from '../services/customer-service';
import { ReservationDetails, UserProfile, BranchId, BRANCHES } from '../lib/types';

interface BookingWidgetProps {
  booking?: ReservationDetails;
  userProfile: UserProfile;
  isActive: boolean;
  onConfirm: () => void;
}

const timeSlots = ['12:00', '13:00', '14:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
const branchMap: { [key in BranchId]: string } = {
    [BRANCHES.PAARL]: 'Paarl',
    [BRANCHES.BELLVILLE]: 'Bellville',
    [BRANCHES.SOMERSET_WEST]: 'Somerset West',
};


const BookingWidgetComponent: React.FC<BookingWidgetProps> = ({ booking, userProfile, isActive, onConfirm }) => {
  const isNewBooking = !booking;

  // Form state for new bookings
  const [bookingName, setBookingName] = useState('My Booking');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState<string>('19:00');
  const [seats, setSeats] = useState<number>(2);
  const [branch, setBranch] = useState<BranchId>(userProfile.branch || BRANCHES.PAARL);
  const [message, setMessage] = useState<string>('');
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

  const handleBooking = async () => {
    if (!userProfile?.userId) {
      Alert.alert('Authentication Error', 'Could not find your User ID.');
      return;
    }
    setLoading(true);
    try {
      const [hour, minute] = time.split(':').map(Number);
      const bookingDate = new Date(date);
      bookingDate.setHours(hour, minute, 0, 0);

      const newBookingData: Omit<ReservationDetails, 'id' | 'createdAt' | 'status'> = {
        dateOfArrival: Timestamp.fromDate(bookingDate),
        guests: seats,
        branch,
        message,
        userId: userProfile.userId,
        nagName: userProfile.nagName,
        bookingName: bookingName,
      };

      await addReservation(newBookingData);
      Alert.alert('Success', 'Your booking request has been sent!');
      onConfirm();
    } catch (error: any) {
      Alert.alert('Booking Failed', error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };
  
  const displayDate = isNewBooking ? date.toLocaleDateString('en-GB') : booking.dateOfArrival.toDate().toLocaleDateString('en-GB');
  const displayTime = isNewBooking ? time : booking.dateOfArrival.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.widgetContainer, { opacity: isActive ? 1 : 0.7, transform: [{ scale: isActive ? 1 : 0.95 }] }]}>
      <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
        <View style={styles.content}>
          <Text style={styles.title}>{isNewBooking ? 'Make a New Booking' : booking.bookingName}</Text>

          {/* Booking Name (Only for new bookings) */}
          {isNewBooking && (
            <View style={styles.fieldContainer}>
                <View style={styles.inputWrapper}>
                    <Tag size={18} color="#C89A5B" style={{marginRight: 8}} />
                    <TextInput
                        value={bookingName}
                        onChangeText={setBookingName}
                        placeholder="Name your booking (e.g., Date Night)"
                        placeholderTextColor="#999"
                        style={styles.textInput}
                    />
                </View>
            </View>
          )}

          {/* Date and Time */}
          <View style={styles.fieldContainer}>
             <View style={styles.inputRow}>
                <TouchableOpacity onPress={() => isNewBooking && setShowDatePicker(true)} style={styles.datePickerButton} disabled={!isNewBooking}>
                    <Calendar size={18} color="#C89A5B" />
                    <Text style={styles.inputText}>{displayDate}</Text>
                </TouchableOpacity>
                <View style={[styles.pickerContainer, {width: 120}]}>
                  {isNewBooking ? (
                    <Picker selectedValue={time} onValueChange={setTime} style={styles.picker} dropdownIconColor="#fff">
                      {timeSlots.map(slot => <Picker.Item key={slot} label={slot} value={slot} />)}
                    </Picker>
                  ) : (
                    <Text style={styles.readOnlyText}>{displayTime}</Text>
                  )}
                </View>
             </View>
          </View>

          {showDatePicker && isNewBooking && (
            <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} minimumDate={new Date()} />
          )}

          {/* Seats */}
          <View style={styles.fieldContainer}>
            <View style={styles.inputWrapper}>
              <Users size={18} color="#C89A5B" />
              {isNewBooking ? (
                <>
                  <TouchableOpacity onPress={() => setSeats(Math.max(1, seats - 1))} style={styles.seatButton}><Text style={styles.seatButtonText}>-</Text></TouchableOpacity>
                  <Text style={styles.seatText}>{seats} Seats</Text>
                  <TouchableOpacity onPress={() => setSeats(seats + 1)} style={styles.seatButton}><Text style={styles.seatButtonText}>+</Text></TouchableOpacity>
                </>
              ) : (
                <Text style={styles.readOnlyText}>{booking.guests} Seats</Text>
              )}
            </View>
          </View>
          
          {/* Branch */}
          <View style={styles.fieldContainer}>
            {isNewBooking ? (
                <View style={styles.pickerContainer}>
                    <Picker selectedValue={branch} onValueChange={(itemValue) => setBranch(itemValue)} style={styles.picker} dropdownIconColor="#fff">
                        {Object.entries(branchMap).map(([id, name]) => <Picker.Item key={id} label={name} value={Number(id)} />)}
                    </Picker>
                </View>
            ) : (
                <Text style={styles.readOnlyText}>{branchMap[booking.branch]}</Text>
            )}
          </View>

          {/* Message */}
          <View style={styles.fieldContainer}>
            <View style={styles.inputWrapper}>
                <MessageSquare size={18} color="#C89A5B" style={{marginRight: 8}} />
                <TextInput
                    value={isNewBooking ? message : booking.message}
                    onChangeText={setMessage}
                    placeholder="Message (optional)"
                    placeholderTextColor="#999"
                    style={styles.textInput}
                    editable={isNewBooking}
                    multiline
                />
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: statusInfo.color }]}
            onPress={isNewBooking ? handleBooking : undefined}
            disabled={loading || !isNewBooking}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>{statusInfo.text}</Text>}
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
    widgetContainer: {
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(200, 154, 91, 0.4)',
        minHeight: 500,
    },
    cardBlur: { flex: 1 },
    content: { padding: 20, justifyContent: 'space-between', flex: 1 },
    title: {
        fontSize: 22,
        fontFamily: 'PlayfairDisplay-Bold',
        color: 'white',
        marginBottom: 20,
        textAlign: 'center',
    },
    fieldContainer: { marginBottom: 15 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    datePickerButton: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: 12, borderRadius: 8,
        borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.5)',
    },
    inputText: { color: 'white', fontSize: 14 },
    textInput: { color: 'white', fontSize: 14, flex: 1 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.3)',
        paddingHorizontal: 12, borderRadius: 8, borderWidth: 1,
        borderColor: 'rgba(200, 154, 91, 0.5)', minHeight: 48,
    },
    pickerContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 8, borderWidth: 1,
        borderColor: 'rgba(200, 154, 91, 0.5)',
    },
    picker: { color: 'white', height: 48 },
    seatButton: { paddingHorizontal: 15, paddingVertical: 5 },
    seatButtonText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    seatText: { color: 'white', fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'center' },
    confirmButton: {
        padding: 15, borderRadius: 12, alignItems: 'center',
    },
    confirmButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    readOnlyText: { color: '#ccc', fontSize: 14, padding: 12 },
});

export default BookingWidgetComponent;

