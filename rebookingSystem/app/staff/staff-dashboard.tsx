import React from 'react';
import { Text, View } from 'react-native';
import BookingView from './booking-view';

const StaffDashboard = () => {
  return (
    <View className="flex-1 bg-black p-4">
      <Text className="text-white text-3xl font-bold mb-4">Bookings</Text>
      <BookingView />
    </View>
  );
};

export default StaffDashboard;
