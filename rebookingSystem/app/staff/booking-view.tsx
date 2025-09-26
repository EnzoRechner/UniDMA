import { Check, Inbox, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';

type Booking = {
  id: string;
  name: string;
  date: string;
  time: string;
  seats: number;
  status: 'incoming' | 'accepted' | 'rejected';
};

const sampleBookings: Booking[] = [
  { id: '1', name: 'John Doe', date: '2025-09-28', time: '18:00', seats: 4, status: 'incoming' },
  { id: '2', name: 'Jane Smith', date: '2025-09-25', time: '19:30', seats: 2, status: 'accepted' },
];

const BookingView = () => {
  const [bookings, setBookings] = useState(sampleBookings);

  const updateStatus = (id: string, status: 'accepted' | 'rejected') => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
  };

  const renderItem = ({ item }: { item: Booking }) => (
    <View className="bg-white/10 border border-white/20 rounded-xl p-4 mb-3">
      <Text className="text-white text-lg font-bold">{item.name}</Text>
      <Text className="text-gray-300">{item.date} at {item.time}</Text>
      <Text className="text-gray-400">Seats: {item.seats}</Text>

      <View className="flex-row mt-3 space-x-4">
        <TouchableOpacity onPress={() => updateStatus(item.id, 'accepted')}>
          <Check color="lime" size={28} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => updateStatus(item.id, 'rejected')}>
          <X color="red" size={28} />
        </TouchableOpacity>
        <TouchableOpacity>
          <Inbox color="skyblue" size={28} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <FlatList
      data={bookings}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListEmptyComponent={<Text className="text-gray-400">No bookings yet.</Text>}
    />
  );
};

export default BookingView;
