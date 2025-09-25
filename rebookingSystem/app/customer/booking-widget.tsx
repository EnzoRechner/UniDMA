import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { getApp } from 'firebase/app';
import { addDoc, collection, getFirestore } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Booking, User } from '../other/types';

interface BookingWidgetProps {
  booking?: Booking;
  isActive: boolean;
  onConfirm: (booking: Partial<Booking>) => void;
}

const timeSlots = ['12:00 PM', '1:00 PM', '2:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'];
const branches = [
  { id: 'branch1', name: 'Paarl' },
  { id: 'branch2', name: 'Stellenbosch' },
  { id: 'branch3', name: 'Franschhoek' },
];

const BookingWidget: React.FC<BookingWidgetProps> = ({ booking, isActive, onConfirm }) => {
  const [date, setDate] = useState<Date>(booking?.date ? new Date(booking.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState<string>(booking?.time || '7:00 PM');
  const [seats, setSeats] = useState<number>(booking?.seats || 2);
  const [branch, setBranch] = useState<string>(booking?.branch || 'branch1');
  const [message, setMessage] = useState<string>(booking?.message || '');
  const [loading, setLoading] = useState(false);

  const db = getFirestore(getApp());

  const handleBooking = async () => {
    if (!date || !time || !branch || !seats) {
      Alert.alert('Booking Error', 'Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      const bookingData: Partial<Booking> = {
        date: date.toISOString().split('T')[0],
        time,
        branch,
        seats,
        message,
        status: 'pending',
        createdAt: Date.now(),
      };
      await addDoc(collection(db, 'bookings'), bookingData);
      onConfirm(bookingData);
      Alert.alert('Booking Success', 'Your booking has been submitted!');
    } catch (error) {
      Alert.alert('Booking Failed', 'There was an error submitting your booking. Please try again.');
    } finally {
      setLoading(false);
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

  return (
    <View style={[styles.widgetContainer, { zIndex, opacity: widgetOpacity, transform: [{ scale: widgetScale }] }]}>
      <View style={styles.glassContainer}>
        {/* Booking Time */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Booking Time:</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerButton}>
              <Text style={styles.inputText}>{date.toLocaleDateString()}</Text>
            </TouchableOpacity>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={time}
                onValueChange={setTime}
                style={styles.picker}
                dropdownIconColor="#fff"
              >
                {timeSlots.map(slot => (
                  <Picker.Item key={slot} label={slot} value={slot} />
                ))}
              </Picker>
            </View>
            {showDatePicker && (
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
            <TouchableOpacity onPress={() => setSeats(Math.max(1, seats - 1))} style={styles.seatButton}>
              <Ionicons name="remove-circle" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.seatText}>{seats}</Text>
            <TouchableOpacity onPress={() => setSeats(Math.min(10, seats + 1))} style={styles.seatButton}>
              <Ionicons name="add-circle" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Branch Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Branch:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={branch}
              onValueChange={setBranch}
              style={styles.picker}
              dropdownIconColor="#fff"
            >
              {branches.map(b => (
                <Picker.Item key={b.id} label={b.name} value={b.id} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Message */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Message:</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Previous Sent Message"
            placeholderTextColor="#aaa"
            multiline
            numberOfLines={4}
            style={styles.messageInput}
          />
        </View>

        <TouchableOpacity 
          onPress={handleBooking}
          style={styles.confirmButton}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  widgetContainer: {
    width: 300,
    marginHorizontal: 10,
    padding: 2,
    borderRadius: 20,
    backgroundColor: 'rgba(231, 217, 199, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  glassContainer: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(231, 217, 199, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backfaceVisibility: 'hidden',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    color: '#D1D5DB',
    fontSize: 14,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  inputText: {
    color: '#fff',
  },
  pickerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    flex: 1,
  },
  picker: {
    color: '#fff',
    height: 50,
  },
  seatControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  seatButton: {
    padding: 4,
  },
  seatText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  messageInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  confirmButton: {
    backgroundColor: '#CA8A04',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default BookingWidget;
