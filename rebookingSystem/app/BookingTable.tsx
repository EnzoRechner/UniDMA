import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

// Props: bookings: Array<{ title: string, dateOfArrival: string, seats: number, message: string, status: string }>
export function BookingTable({ bookings }: { bookings: { title: string, dateOfArrival: string, seats: number, message: string, status: string }[] }) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>JwIib89lqEvSpLSsIef8</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {bookings.map((booking, idx) => (
          <View key={idx} style={styles.widget}>
            <Text style={styles.label}>Previous booking time</Text>
            <Text style={styles.value}>{booking.dateOfArrival}</Text>
            <Text style={styles.label}>Seats</Text>
            <Text style={styles.value}>{booking.seats}</Text>
            <Text style={styles.label}>Message</Text>
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{booking.message}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                booking.status === 'Acpt' ? styles.green : booking.status === 'Pend' ? styles.yellow : styles.red,
              ]}
              disabled
            >
              <Text style={styles.buttonText}>
                {booking.status === 'Acpt' ? 'Confirmed' : booking.status === 'Pend' ? 'Pending' : 'Rejected'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
    marginBottom: 16,
  },
  heading: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 8,
  },
  widget: {
    backgroundColor: '#191c24',
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    width: 260,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  label: {
    color: '#aaa',
    fontSize: 13,
    marginTop: 4,
  },
  value: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageBox: {
    backgroundColor: '#23263a',
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
  },
  confirmButton: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  green: {
    backgroundColor: '#2ecc40',
  },
  yellow: {
    backgroundColor: '#ffe066',
  },
  red: {
    backgroundColor: '#ff4d4f',
  },
  buttonText: {
    color: '#11131a',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
