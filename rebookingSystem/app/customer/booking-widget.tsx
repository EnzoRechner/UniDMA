import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// NOTE: Assuming createBooking is correctly imported from the relative path based on your provided code structure
import { createBooking } from '../../dataconnect/firestoreCrud'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Booking } from '../../lib/types';


interface BookingWidgetProps {
  booking?: Booking;
  isActive: boolean;
  onConfirm: () => void; // Parent handles scroll and state via snapshot
  widgetWidth: number; 
  widgetMargin: number; 
}

// User-specified colors
const CUSTOM_COLORS = {
  confirmed: '#00FF04', // Bright Green
  pending: '#FF9913', // Orange/Yellow
  cancelled: '#FF0A0A', // Bright Red (used for cancelled and denied)
  default: '#43CA04', // Primary Green for "Book"
};

const timeSlots = ['12:00 PM', '1:00 PM', '2:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'];
const branches = [
  { id: 'branch1', name: 'Paarl' },
  { id: 'branch2', name: 'Stellenbosch' },
  { id: 'branch3', name: 'Franschhoek' },
];

const BookingWidget: React.FC<BookingWidgetProps> = ({ booking, isActive, onConfirm, widgetWidth, widgetMargin }) => {
  const isNewBooking = !booking || booking.id === 'new';

  const [date, setDate] = useState<Date>(isNewBooking ? new Date() : (booking?.date ? new Date(booking.date) : new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState<string>(isNewBooking ? '7:00 PM' : booking?.time || '7:00 PM');
  const [seats, setSeats] = useState<number>(isNewBooking ? 2 : booking?.seats || 2);
  const [branch, setBranch] = useState<string>(isNewBooking ? 'branch1' : booking?.branch || 'branch1');
  const [message, setMessage] = useState<string>(isNewBooking ? '' : booking?.message || '');
  const [loading, setLoading] = useState(false);
  // isSubmitting handles the visual change to the pending button
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  // Display Status Text logic using custom colors
  const getStatusStyle = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed': return { text: 'Confirmed', color: CUSTOM_COLORS.confirmed };
      case 'pending': return { text: 'Pending Confirmation', color: CUSTOM_COLORS.pending }; // Updated text for clarity
      case 'cancelled': return { text: 'Cancelled', color: CUSTOM_COLORS.cancelled };
      default: return { text: 'Book', color: CUSTOM_COLORS.pending };
    }
  };
  const statusInfo = booking?.status ? getStatusStyle(booking.status) : undefined;


  const handleBooking = async () => {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      Alert.alert('Authentication Error', 'You must be logged in to make a booking.');
      return;
    }

    if (!date || !time || !branch || !seats) {
      Alert.alert('Booking Error', 'Please fill in all required fields.');
      return;
    }
    
    if (!isNewBooking) {
      Alert.alert('Error', 'Internal: This card is read-only.');
      return;
    }

    setLoading(true);
    setIsSubmitting(true); // Start the button transition immediately (Green -> Yellow)
    
    try {
      const bookingData: Omit<Booking, 'id' | 'status' | 'createdAt' | 'userId' | 'custEmail'> = {
        date: date.toISOString().split('T')[0], // YYYY-MM-DD
        time,
        branch,
        seats,
        message,
      };
      
      // The createBooking function must be updated in 'firestoreCrud.ts' to handle userId, 
      // but the call here looks correct based on the previous context.
      await createBooking(bookingData, userId);
      
      // Reset the form for the next booking
      setDate(new Date());
      setTime('7:00 PM');
      setSeats(2);
      setBranch('branch1');
      setMessage('');
      
      onConfirm(); // Trigger parent's snapshot listener
      
    } catch (error) {
      console.error("Booking submission error:", error);
      Alert.alert('Booking Failed', 'There was an error submitting your booking. Please try again.');
      setIsSubmitting(false); // Revert button if failure
    } finally {
      setLoading(false);
      // isSubmitting will be reset when parent rerenders after successful snapshot update
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const widgetOpacity = isActive ? 1 : 0.8;
  const widgetScale = isActive ? 1 : 0.95;
  const zIndex = isActive ? 10 : 1;
  const displayDate = isNewBooking ? date.toLocaleDateString() : new Date(booking!.date).toLocaleDateString();

  // Button colors
  // Animate from default green to pending yellow on submission
  const newBookingButtonColor = isSubmitting ? CUSTOM_COLORS.pending : CUSTOM_COLORS.default; 
  const newBookingButtonText = isSubmitting ? 'Pending...' : 'Confirm Booking';
  
  // Status button for existing bookings
  const existingStatusColor = statusInfo?.color || CUSTOM_COLORS.pending;
  const existingStatusText = statusInfo?.text || 'Pending Confirmation'; // Updated text for clarity


  return (
    <View 
      style={[
        styles.widgetContainer, 
        { 
          zIndex, 
          opacity: widgetOpacity, 
          transform: [{ scale: widgetScale }],
          width: widgetWidth, 
          marginHorizontal: widgetMargin, 
        }
      ]}
    >
      <View style={styles.glassContainer}>

        {/* Status or Title - Removed Status Pill for cleaner look */}
        <View style={styles.statusContainer}>
          {isNewBooking ? (
            <Text style={styles.newBookingTitle}>New Booking</Text>
          ) : (
            <Text style={styles.newBookingTitle}>Booking ID: {booking!.id.slice(0, 8)}...</Text>
          )}
        </View>

        {/* Booking Time */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Date:</Text>
          <View style={styles.inputRow}>
            {/* Date Picker Button (for responsive text/padding) */}
            <TouchableOpacity 
              onPress={() => isNewBooking && setShowDatePicker(true)} 
              style={[styles.datePickerButton, !isNewBooking && { opacity: 0.7 }]}
              disabled={!isNewBooking || isSubmitting}
            >
              <Text style={styles.inputText}>{displayDate}</Text>
            </TouchableOpacity>
            
            {/* Time Picker Container */}
            <View style={styles.pickerContainerSmall}>
              {isNewBooking ? (
                <Picker
                  selectedValue={time}
                  onValueChange={setTime}
                  style={styles.picker}
                  dropdownIconColor="#fff"
                  enabled={!isSubmitting}
                >
                  {timeSlots.map(slot => (
                    <Picker.Item key={slot} label={slot} value={slot} />
                  ))}
                </Picker>
              ) : (
                <Text style={[styles.inputText, styles.displayOnlyText]}>{booking?.time}</Text>
              )}
            </View>
            
            {showDatePicker && isNewBooking && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>
        </View>

        {/* Amount of Seats */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Amount of Seats:</Text>
          <View style={styles.seatControl}>
            {isNewBooking ? (
              <>
                <TouchableOpacity onPress={() => setSeats(Math.max(1, seats - 1))} style={styles.seatButton} disabled={isSubmitting}>
                  <Ionicons name="remove-circle" size={24} color={isSubmitting ? 'rgba(255,255,255,0.5)' : '#fff'} />
                </TouchableOpacity>
                <Text style={styles.seatText}>{seats}</Text>
                <TouchableOpacity onPress={() => setSeats(Math.min(10, seats + 1))} style={styles.seatButton} disabled={isSubmitting}>
                  <Ionicons name="add-circle" size={24} color={isSubmitting ? 'rgba(255,255,255,0.5)' : '#fff'} />
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.seatText}>{booking?.seats}</Text>
            )}
          </View>
        </View>

        {/* Branch Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Branch:</Text>
          <View style={styles.pickerContainerFull}>
            {isNewBooking ? (
              <Picker
                selectedValue={branch}
                onValueChange={setBranch}
                style={styles.picker}
                dropdownIconColor="#fff"
                enabled={!isSubmitting}
              >
                {branches.map(b => (
                  <Picker.Item key={b.id} label={b.name} value={b.id} />
                ))}
              </Picker>
            ) : (
              <Text style={[styles.inputText, styles.displayOnlyText]}>
                {branches.find(b => b.id === booking?.branch)?.name || 'N/A'}
              </Text>
            )}
          </View>
        </View>

        {/* Message */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{isNewBooking ? 'Message (Optional):' : 'Message Sent:'}</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={isNewBooking ? "Add a special request..." : "Previous Sent Message"}
            placeholderTextColor="#aaa"
            multiline
            numberOfLines={4}
            style={[styles.messageInput, !isNewBooking && styles.messageInputReadOnly]}
            editable={isNewBooking && !isSubmitting}
          />
        </View>
        
        {/* Button Section (New vs Status) */}
        {isNewBooking ? (
          <TouchableOpacity 
            onPress={handleBooking}
            style={[
              styles.confirmButton, 
              { backgroundColor: newBookingButtonColor, marginTop: 'auto' }
            ]}
            disabled={loading || isSubmitting}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>{newBookingButtonText}</Text>
            )}
          </TouchableOpacity>
        ) : (
          // Status button for existing bookings (Read-Only)
          <View 
            style={[
              styles.confirmButton, 
              { backgroundColor: existingStatusColor, marginTop: 'auto' }
            ]}
          >
            <Text style={styles.confirmButtonText}>{existingStatusText}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  widgetContainer: {
    height: 500, 
    padding: 2,
    borderRadius: 20,
    backgroundColor: 'rgba(231, 217, 199, 0.3)', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, 
    shadowRadius: 10, 
    elevation: 12,
  },
  glassContainer: {
    flex: 1,
    padding: 16, 
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)', 
    backfaceVisibility: 'hidden',
    overflow: 'hidden', 
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start', // Only showing one element now
    alignItems: 'center',
    marginBottom: 12, // Increased spacing from 1 to 12
  },
  newBookingTitle: {
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#fff',
  },
  
  // Removed bookingIdText, statusPill, and statusText styles

  fieldContainer: {
    marginBottom: 14, // Reduced from 20 to 14 for better fit
  },
  label: {
    color: '#D1D5DB',
    fontSize: 13, 
    marginBottom: 6, 
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, 
  },
  datePickerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12, 
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minHeight: 45, 
    justifyContent: 'center',
  },
  inputText: {
    color: '#fff',
    fontSize: 14, 
  },
  displayOnlyText: {
    paddingVertical: 12, 
    paddingHorizontal: 12,
  },
  // Picker container for Time (smaller, flex: 1)
  pickerContainerSmall: { 
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    flex: 1,
    justifyContent: 'center',
    // Removed minHeight: 45
  },
  // Picker container for Branch (full width, flex: none)
  pickerContainerFull: { 
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    // Removed minHeight: 45
  },
  picker: {
    color: '#fff',
    height: 51, 
    // START: Fix for text clipping
    fontSize: 16, 
    paddingHorizontal: 10,
    marginTop: -4,
    marginBottom: -3,
    // END: Fix for text clipping
  },
  seatControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 10, 
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  seatButton: {
    padding: 2, 
  },
  seatText: {
    color: '#fff',
    fontSize: 16, 
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  messageInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    borderRadius: 8,
    padding: 10, 
    height: 80, 
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    fontSize: 14,
  },
  messageInputReadOnly: {
    opacity: 0.7,
  },
  confirmButton: {
    padding: 14, 
    borderRadius: 10,
    alignItems: 'center',
    // Apply transition for color change
    transitionProperty: 'background-color' as any,
    transitionDuration: '300ms' as any,
    
    // Glassy/Bevel effect
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)', // Reflection/Top Bevel
    shadowColor: '#000',
    // Simulate subtle gradient fade to black at the bottom
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.8, 
    shadowRadius: 8,
    elevation: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15, 
  },
});

export default BookingWidget;