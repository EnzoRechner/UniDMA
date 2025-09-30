import React from 'react';
import { Text, View } from 'react-native';
import BookingView from './booking-view';

const StaffDashboard = () => {
  return (
    <View style={{ flex: 1, backgroundColor: '#000', padding: 16 }}>
      <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>Bookings</Text>
      <BookingView />
    </View>
  );
};

export default StaffDashboard;
