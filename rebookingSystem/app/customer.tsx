import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Types
interface Branch {
  branchID: string;
  name: string;
  xCoord: number;
  yCoord: number;
  totSeats: number;
  open: boolean;
}

interface Booking {
  bookingID: string;
  customerID: string;
  dateOfArrival: Date;
  seats: number;
  message: string;
  status: 'pending' | 'confirmed' | 'rejected';
  branchID: string;
  timeSlot: string;
}

// Services
const bookingService = {
  fetchUserBookings: async (customerID: string): Promise<Booking[]> => {
    try {
      const cachedBookings = await AsyncStorage.getItem('userBookings');
      if (cachedBookings) {
        return JSON.parse(cachedBookings);
      }
      
      // Replace with actual Firestore call
      // const q = query(collection(db, 'bookings'), where('customerID', '==', customerID));
      // const snapshot = await getDocs(q);
      // return snapshot.docs.map(doc => ({ bookingID: doc.id, ...doc.data() }));
      
      return [
        {
          bookingID: '1',
          customerID: customerID,
          dateOfArrival: new Date('2025-09-25T19:00:00'),
          seats: 4,
          message: 'Window seat please',
          status: 'confirmed',
          branchID: 'branch1',
          timeSlot: '7:00 PM'
        }
      ];
    } catch (error) {
      console.error('Error fetching bookings:', error);
      return [];
    }
  },
  
  createBooking: async (booking: Partial<Booking>): Promise<Booking> => {
    const newBooking = {
      ...booking,
      bookingID: Date.now().toString(),
      status: 'pending' as const
    } as Booking;
    
    try {
      const existingBookings = JSON.parse(await AsyncStorage.getItem('userBookings') || '[]');
      existingBookings.push(newBooking);
      await AsyncStorage.setItem('userBookings', JSON.stringify(existingBookings));
      return newBooking;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },
  
  updateBooking: async (bookingID: string, updates: Partial<Booking>): Promise<Booking> => {
    try {
      const bookings = JSON.parse(await AsyncStorage.getItem('userBookings') || '[]');
      const index = bookings.findIndex((b: Booking) => b.bookingID === bookingID);
      if (index !== -1) {
        bookings[index] = { ...bookings[index], ...updates };
        await AsyncStorage.setItem('userBookings', JSON.stringify(bookings));
        return bookings[index];
      }
      throw new Error('Booking not found');
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  }
};

const branchService = {
  fetchBranches: async (): Promise<Branch[]> => {
    // Replace with Firestore call
    return [
      { branchID: 'branch1', name: 'Paarl', xCoord: -33.7, yCoord: 18.9, totSeats: 50, open: true },
      { branchID: 'branch2', name: 'Stellenbosch', xCoord: -33.9, yCoord: 18.8, totSeats: 40, open: true },
      { branchID: 'branch3', name: 'Franschhoek', xCoord: -33.9, yCoord: 19.1, totSeats: 35, open: true }
    ];
  }
};

// Booking Widget Component
const BookingWidget: React.FC<{
  booking: Booking | null;
  branches: Branch[];
  onConfirm: (booking: Partial<Booking>) => void;
  onRebook: (booking: Booking) => void;
  isActive: boolean;
  isRebooking: boolean;
}> = ({ booking, branches, onConfirm, onRebook, isActive, isRebooking }) => {
  const [date, setDate] = useState<Date>(
    booking ? new Date(booking.dateOfArrival) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timeSlot, setTimeSlot] = useState<string>(booking?.timeSlot || '7:00 PM');
  const [seats, setSeats] = useState<number>(booking?.seats || 2);
  const [selectedBranch, setSelectedBranch] = useState<string>(booking?.branchID || 'branch1');
  const [message, setMessage] = useState<string>(booking?.message || '');
  const [showRebookOptions, setShowRebookOptions] = useState(false);

  const timeSlots = ['12:00 PM', '1:00 PM', '2:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'];

  const getButtonColor = () => {
    if (!booking) return '#3B82F6'; // blue
    switch (booking.status) {
      case 'pending': return '#EAB308'; // yellow
      case 'confirmed': return '#22C55E'; // green
      case 'rejected': return '#EF4444'; // red
      default: return '#3B82F6';
    }
  };

  const getButtonText = () => {
    if (!booking) return 'Make New Booking';
    switch (booking.status) {
      case 'pending': return 'Booking Pending';
      case 'confirmed': return 'Booking Confirmed';
      case 'rejected': return 'Booking Rejected';
      default: return 'Confirm Booking';
    }
  };

  const handleConfirm = () => {
    onConfirm({
      dateOfArrival: date,
      timeSlot,
      seats,
      branchID: selectedBranch,
      message
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  return (
    <View style={{
      backgroundColor: '#374151',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: isActive ? 2 : 0,
      borderColor: '#60A5FA'
    }}>
      {/* Booking Time */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Booking Time:</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={{
              backgroundColor: '#4B5563',
              borderRadius: 8,
              padding: 12,
              flex: 1
            }}
            disabled={isRebooking && booking?.status === 'confirmed'}
          >
            <Text style={{ color: 'white' }}>{date.toLocaleDateString()}</Text>
          </TouchableOpacity>
          
          <View style={{
            backgroundColor: '#4B5563',
            borderRadius: 8,
            flex: 1
          }}>
            <Picker
              selectedValue={timeSlot}
              onValueChange={setTimeSlot}
              style={{ color: 'white' }}
              dropdownIconColor="white"
              enabled={!(isRebooking && booking?.status === 'confirmed')}
            >
              {timeSlots.map(slot => (
                <Picker.Item key={slot} label={slot} value={slot} />
              ))}
            </Picker>
          </View>
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

      {/* Amount of Seats */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Amount of Seats:</Text>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#4B5563',
          borderRadius: 8,
          padding: 12
        }}>
          <TouchableOpacity
            onPress={() => setSeats(Math.max(1, seats - 1))}
            disabled={isRebooking && booking?.status === 'confirmed'}
            style={{ padding: 4 }}
          >
            <Ionicons name="remove-circle" size={24} color="white" />
          </TouchableOpacity>
          
          <Text style={{
            color: 'white',
            fontSize: 18,
            fontWeight: 'bold',
            flex: 1,
            textAlign: 'center'
          }}>{seats}</Text>
          
          <TouchableOpacity
            onPress={() => setSeats(Math.min(10, seats + 1))}
            disabled={isRebooking && booking?.status === 'confirmed'}
            style={{ padding: 4 }}
          >
            <Ionicons name="add-circle" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Branch Selection */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Branch:</Text>
        <View style={{
          backgroundColor: '#4B5563',
          borderRadius: 8
        }}>
          <Picker
            selectedValue={selectedBranch}
            onValueChange={setSelectedBranch}
            style={{ color: 'white' }}
            dropdownIconColor="white"
            enabled={!(isRebooking && booking?.status === 'confirmed')}
          >
            {branches.map(branch => (
              <Picker.Item key={branch.branchID} label={branch.name} value={branch.branchID} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Message */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 8 }}>Message:</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="This is the Previous Sent Message"
          placeholderTextColor="#6B7280"
          multiline
          numberOfLines={3}
          style={{
            backgroundColor: '#4B5563',
            color: 'white',
            borderRadius: 8,
            padding: 12,
            height: 80,
            textAlignVertical: 'top'
          }}
          editable={!(isRebooking && booking?.status === 'confirmed')}
        />
      </View>

      {/* Dynamic Confirm Button */}
      <TouchableOpacity
        onPress={handleConfirm}
        style={{
          backgroundColor: getButtonColor(),
          padding: 16,
          borderRadius: 8,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
          {getButtonText()}
        </Text>
      </TouchableOpacity>

      {/* Rebooking Section */}
      {booking && booking.status === 'confirmed' && (
        <View style={{ marginTop: 16 }}>
          <TouchableOpacity
            onPress={() => setShowRebookOptions(!showRebookOptions)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 8
            }}
          >
            <Ionicons name="refresh" size={16} color="#9CA3AF" />
            <Text style={{ color: '#9CA3AF', marginHorizontal: 8 }}>
              Swipe for Rebooking Options
            </Text>
            <Ionicons 
              name={showRebookOptions ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#9CA3AF" 
            />
          </TouchableOpacity>
          
          {showRebookOptions && (
            <View style={{
              marginTop: 12,
              padding: 12,
              backgroundColor: '#4B5563',
              borderRadius: 8
            }}>
              <Text style={{ color: '#D1D5DB', fontSize: 14, marginBottom: 8 }}>
                Keep same time and seats, just pick a new date
              </Text>
              <TouchableOpacity
                onPress={() => onRebook(booking)}
                style={{
                  backgroundColor: '#3B82F6',
                  padding: 12,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Rebook</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// Main Customer Component
const CustomerScreen: React.FC = () => {
  const [username, setUsername] = useState<string>('User');
  const [editingUsername, setEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBookingIndex, setActiveBookingIndex] = useState(0);
  const [showLoyaltyProgram, setShowLoyaltyProgram] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentEvents] = useState<string[]>([
    'Tuesday - Date night',
    'Wednesday - Burger Special'
  ]);

  const customerID = 'customer123'; // This would come from auth context

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load username
      const savedUsername = await AsyncStorage.getItem('username');
      if (savedUsername) {
        setUsername(savedUsername);
      }
      
      // Load bookings and branches
      await Promise.all([loadBookings(), loadBranches()]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadBookings = async () => {
    try {
      const userBookings = await bookingService.fetchUserBookings(customerID);
      setBookings(userBookings);
    } catch (error) {
      Alert.alert('Error', 'Failed to load bookings');
    }
  };

  const loadBranches = async () => {
    try {
      const branchList = await branchService.fetchBranches();
      setBranches(branchList);
    } catch (error) {
      Alert.alert('Error', 'Failed to load branches');
    }
  };

  const handleConfirmBooking = async (bookingData: Partial<Booking>) => {
    try {
      const newBooking = await bookingService.createBooking({
        ...bookingData,
        customerID
      });
      setBookings([...bookings, newBooking]);
      Alert.alert('Success', 'Booking created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create booking');
    }
  };

  const handleRebook = (booking: Booking) => {
    Alert.alert('Rebook', 'Rebooking functionality will be implemented');
  };

  const handleUsernameSubmit = async () => {
    try {
      await AsyncStorage.setItem('username', tempUsername);
      setUsername(tempUsername);
      setEditingUsername(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save username');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111827' }}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={{
          padding: 16,
          backgroundColor: '#1F2937',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: '#EAB308',
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8
              }}>
                <Text style={{ fontWeight: 'bold', color: '#111827', fontSize: 16 }}>DN</Text>
              </View>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Die Nag Uil</Text>
            </View>
          </View>
          
          {/* Welcome Message */}
          <View style={{ marginTop: 12 }}>
            {editingUsername ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  value={tempUsername}
                  onChangeText={setTempUsername}
                  style={{
                    backgroundColor: '#374151',
                    color: 'white',
                    padding: 8,
                    borderRadius: 8,
                    flex: 1,
                    marginRight: 8
                  }}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={handleUsernameSubmit}
                  style={{
                    backgroundColor: '#3B82F6',
                    padding: 8,
                    paddingHorizontal: 16,
                    borderRadius: 8
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingUsername(true)}>
                <Text style={{ color: 'white', fontSize: 16 }}>
                  Good evening {username}!
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Main Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Loyalty Program Button */}
          <TouchableOpacity
            onPress={() => setShowLoyaltyProgram(!showLoyaltyProgram)}
            style={{
              width: '100%',
              padding: 16,
              backgroundColor: '#1F2937',
              borderRadius: 8,
              marginBottom: 16
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
              Loyalty Program Fullscreen
            </Text>
          </TouchableOpacity>

          {/* Loyalty Points Display */}
          {showLoyaltyProgram && (
            <View style={{
              marginBottom: 16,
              padding: 16,
              backgroundColor: '#1F2937',
              borderRadius: 8
            }}>
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
                Loyalty Points
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {branches.map(branch => (
                  <View key={branch.branchID} style={{
                    backgroundColor: '#374151',
                    padding: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    flex: 1,
                    marginHorizontal: 4
                  }}>
                    <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{branch.name}</Text>
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>0</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Current Events */}
          <View style={{
            marginBottom: 16,
            padding: 16,
            backgroundColor: '#CA8A04',
            borderRadius: 8
          }}>
            <Text style={{ color: '#111827', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
              Current Events:
            </Text>
            {currentEvents.map((event, index) => (
              <Text key={index} style={{ color: '#111827', marginBottom: 4 }}>
                {event}
              </Text>
            ))}
            <TouchableOpacity style={{ marginTop: 8 }}>
              <Text style={{ color: '#111827', textDecorationLine: 'underline' }}>
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {/* Booking Widgets */}
          {bookings.length === 0 ? (
            <BookingWidget
              booking={null}
              branches={branches}
              onConfirm={handleConfirmBooking}
              onRebook={() => {}}
              isActive={true}
              isRebooking={false}
            />
          ) : (
            bookings.map((booking, index) => (
              <BookingWidget
                key={booking.bookingID}
                booking={booking}
                branches={branches}
                onConfirm={handleConfirmBooking}
                onRebook={handleRebook}
                isActive={index === activeBookingIndex}
                isRebooking={false}
              />
            ))
          )}
          
          {/* Add New Booking Button */}
          {bookings.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setBookings([...bookings, null as any]);
                setActiveBookingIndex(bookings.length);
              }}
              style={{
                width: '100%',
                padding: 16,
                backgroundColor: '#374151',
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Ionicons name="add-circle" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Add New Booking</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CustomerScreen;