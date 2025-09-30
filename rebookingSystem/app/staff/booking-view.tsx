import { Check, X, MessageSquare  } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Booking } from '../../lib/types';
import { fetchStaffLatestBookings, updateStatus } from '../firebase/auth-firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BookingView = () => {

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const getBookings = async () => {
    setLoading(true);
    try {
      const allBookings = await fetchStaffLatestBookings('enzo@naguil.com');
      setBookings(allBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
    const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Authentication Error', 'You must be logged in to make a booking.');
        return;
      }
      getBookings();
    };
    checkUser();
  }, []);

  const handleStatusUpdate = async (id: string, status: 'confirmed' | 'cancelled') => {
    try {
      await updateStatus(id, status);
      getBookings(); // Re-fetch bookings after update
    } catch (error) {
      Alert.alert('Error', 'Failed to update booking status.');
      console.error('Update error:', error);
    }
  };

  // --- Helper for Customer Contact (e.g., opens a chat/email modal) ---
  const handleContactCustomer = (email: string) => {
      // Replace with needed code
      Alert.alert("Contact Customer", `Start a chat or email with: ${email}`);
      console.log(`Initiating contact with: ${email}`);
  };

  const renderItem = ({ item }: { item: Booking }) => (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderColor: 'rgba(255,255,255,0.2)',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>
        {item.custEmail}
      </Text>
      <Text style={{ color: '#d1d5db', fontSize: 16 }}>
        <Text style={{ fontWeight: 'bold', color: '#fff' }}>Date/Time:</Text> {item.date} @ {item.time}
      </Text>
      <Text style={{ color: '#9ca3af', marginTop: 4 }}>
        <Text style={{ fontWeight: 'bold' }}>Seats:</Text> {item.seats}
      </Text>
      <Text style={{ color: '#9ca3af' }}>
        <Text style={{ fontWeight: 'bold' }}>Message:</Text> {item.message || 'N/A'}
      </Text>
      <View style={{ flexDirection: 'row', marginTop: 16 }}>
        <TouchableOpacity
          onPress={() => handleStatusUpdate(item.id, 'confirmed')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(22,163,74,0.5)',
            padding: 8,
            borderRadius: 8,
            marginRight: 8,
          }}
        >
          <Check color="lime" size={20} />
          <Text style={{ color: '#bbf7d0', marginLeft: 4, fontWeight: 'bold', fontSize: 14 }}>CONFIRM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleStatusUpdate(item.id, 'cancelled')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(220,38,38,0.5)',
            padding: 8,
            borderRadius: 8,
            marginRight: 8,
          }}
        >
          <X color="red" size={20} />
          <Text style={{ color: '#fca5a5', marginLeft: 4, fontWeight: 'bold', fontSize: 14 }}>CANCEL</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleContactCustomer(item.custEmail)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 8,
          }}
        >
          <MessageSquare color="skyblue" size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#18181b' }}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: '#a1a1aa', marginTop: 8, fontSize: 16 }}>Loading pending bookings...</Text>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#18181b' }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
      }}>
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 22 }}>Bookings</Text>
        <TouchableOpacity
          onPress={getBookings}
          style={{
            backgroundColor: '#2563eb',
            paddingVertical: 8,
            paddingHorizontal: 18,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Reload</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: '#a1a1aa', fontSize: 18, fontWeight: 'bold' }}>🎉 All caught up!</Text>
            <Text style={{ color: '#6b7280', marginTop: 4 }}>No pending bookings yet.</Text>
          </View>
        }
      />
    </View>
  );
};

export default BookingView;
