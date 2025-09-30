import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import BookingView from './booking-view';

const StaffDashboard = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bookings Dashboard</Text>
      <BookingView />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Using a deep dark background
    backgroundColor: '#09090b', // Deep dark color (similar to zinc-950)
    paddingTop: 40, // Padding for status bar
  },
  title: {
    // Style for the main page title
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    paddingHorizontal: 16, // Match the padding of the list content
    letterSpacing: 0.5,
  },
});

export default StaffDashboard;
