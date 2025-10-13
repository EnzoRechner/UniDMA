import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Calendar, Clock, Users, MessageSquare, Save } from 'lucide-react-native';
import { useAuth } from '@/app/services/auth-service1';
import { router } from 'expo-router';
import { addReservation } from '@/app/services/firestoreBookings';
import { Timestamp } from 'firebase/firestore';

const branches = [
  'Paarl',
  'Oude Westhof',
  'Somerset West',
];

const seating = [
  'Main Dining Room',
  'Bar Area',
  'Outdoor Terrace',
];

export default function CreateReservationScreen() {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDateObj, setSelectedDateObj] = useState(new Date());
  const [selectedTimeObj, setSelectedTimeObj] = useState(new Date());
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    time: '',
    guests: '2',
    branch: '',
    seat: '',
    message: '',
  });

  // Set default branch based on user preference
  useEffect(() => {
    if (userProfile?.branch) {
      const preferredBranchName = branches.find(branch => 
        branch.toLowerCase().replace(/\s+/g, '-') === userProfile.branch
      );
      if (preferredBranchName) {
        setFormData(prev => ({ ...prev, branch: preferredBranchName }));
      }
    } else if (branches.length > 0) {
      setFormData(prev => ({ ...prev, branch: branches[0] }));
    }
  }, [userProfile]);

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setSelectedDateObj(selectedDate);
      setFormData({ ...formData, date: formatDate(selectedDate) });
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setSelectedTimeObj(selectedTime);
      setFormData({ ...formData, time: formatTime(selectedTime) });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.date.trim() || !formData.time.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a reservation');
      return;
    }

    setLoading(true);
    try {

      // --- Combine Date and Time into a single Date object ---
      const combinedDate  = new Date(
          // Get Year, Month, Day from the selected Date object
          selectedDateObj.getFullYear(),
          selectedDateObj.getMonth(),
          selectedDateObj.getDate(),
          // Get Hours, Minutes, Seconds from the selected Time object
          selectedTimeObj.getHours(),
          selectedTimeObj.getMinutes(),
          selectedTimeObj.getSeconds()
      );

      // Convert to Firestore Timestamp
      const dateOfArrival = Timestamp.fromDate(combinedDate);

      const payload = {
        bookingName: formData.name.trim(),
        nagName: userProfile?.nagName || user.displayName || 'Unknown',
        dateOfArrival: dateOfArrival,
        guests: parseInt(formData.guests) || 2,
        branch: formData.branch,
        seat: formData.seat,
        message: formData.message.trim(),
      };
      console.log('Creating reservation payload:', payload);
      await addReservation(user.uid, {
        ...payload,
      });

      Alert.alert('Success', 'Reservation template created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create reservation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    icon: React.ReactNode,
    placeholder: string,
    value: string,
    onChangeText: (text: string) => void,
    keyboardType: any = 'default'
  ) => (
    <View style={styles.inputContainer}>
      <BlurView intensity={15} tint="dark" style={styles.inputBlur}>
        <View style={styles.inputIcon}>{icon}</View>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#666666"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
        />
      </BlurView>
    </View>
  );

  const renderDatePicker = () => (
    <View style={styles.inputContainer}>
      <TouchableOpacity 
        style={styles.pickerButton}
        onPress={() => setShowDatePicker(true)}
      >
        <BlurView intensity={15} tint="dark" style={styles.inputBlur}>
          <View style={styles.inputIcon}>
            <Calendar size={20} color="#C89A5B" />
          </View>
          <Text style={[styles.pickerText, formData.date && styles.pickerTextSelected]}>
            {formData.date || 'Select Date (DD-MM-YY)'}
          </Text>
        </BlurView>
      </TouchableOpacity>
      
      {showDatePicker && (
        <DateTimePicker
          value={selectedDateObj}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
          themeVariant="dark"
        />
      )}
    </View>
  );

  const renderTimePicker = () => (
    <View style={styles.inputContainer}>
      <TouchableOpacity 
        style={styles.pickerButton}
        onPress={() => setShowTimePicker(true)}
      >
        <BlurView intensity={15} tint="dark" style={styles.inputBlur}>
          <View style={styles.inputIcon}>
            <Clock size={20} color="#C89A5B" />
          </View>
          <Text style={[styles.pickerText, formData.time && styles.pickerTextSelected]}>
            {formData.time || 'Select Time'}
          </Text>
        </BlurView>
      </TouchableOpacity>
      
      {showTimePicker && (
        <DateTimePicker
          value={selectedTimeObj}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
          themeVariant="dark"
        />
      )}
    </View>
  );

  const renderBranchSelector = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Branch Location</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.branchScroll}>
        {branches.map((branch) => (
          <TouchableOpacity
            key={branch}
            style={[
              styles.branchOption,
              formData.branch === branch && styles.branchOptionActive
            ]}
            onPress={() => setFormData({ ...formData, branch })}
          >
            <BlurView intensity={15} tint="dark" style={styles.branchBlur}>
              <Text style={[
                styles.branchText,
                formData.branch === branch && styles.branchTextActive
              ]}>
                {branch}
              </Text>
            </BlurView>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderSeatingSelector = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Seating Preference</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.branchScroll}>
        {seating.map((seat) => (
          <TouchableOpacity
            key={seat}
            style={[
              styles.branchOption,
              formData.seat === seat && styles.branchOptionActive
            ]}
            onPress={() => setFormData({ ...formData, seat })}
          >
            <BlurView intensity={15} tint="dark" style={styles.branchBlur}>
              <Text style={[
                styles.branchText,
                formData.seat === seat && styles.branchTextActive
              ]}>
                {seat}
              </Text>
            </BlurView>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
        style={styles.background}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <BlurView intensity={20} tint="dark" style={styles.backButtonBlur}>
              <ArrowLeft size={20} color="#C89A5B" />
            </BlurView>
          </TouchableOpacity>
          <Text style={styles.title}>Create Reservation</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.form}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.formContent}
        >
          {/* Form Card */}
          <BlurView intensity={25} tint="dark" style={styles.formCard}>
            <View style={styles.cardContent}>
              <Text style={styles.formTitle}>Reservation Details</Text>
              <Text style={styles.formSubtitle}>
                Create a template for quick booking
              </Text>

              {renderInput(
                <MessageSquare size={20} color="#C89A5B" />,
                'Reservation Name (e.g., Date Night)',
                formData.name,
                (text) => setFormData({ ...formData, name: text })
              )}

              {renderDatePicker()}

              {renderTimePicker()}

              {renderInput(
                <Users size={20} color="#C89A5B" />,
                'Number of Guests',
                formData.guests,
                (text) => setFormData({ ...formData, guests: text }),
                'numeric'
              )}

              {renderBranchSelector()}

              {renderSeatingSelector()}

              <View style={styles.inputContainer}>
                <BlurView intensity={15} tint="dark" style={styles.textAreaBlur}>
                  <View style={styles.inputIcon}>
                    <MessageSquare size={20} color="#C89A5B" />
                  </View>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Special message or requests (optional)"
                    placeholderTextColor="#666666"
                    value={formData.message}
                    onChangeText={(text) => setFormData({ ...formData, message: text })}
                    multiline
                    numberOfLines={3}
                  />
                </BlurView>
              </View>

              {/* Save Button */}
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSave}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#C89A5B', '#B8864A']}
                  style={styles.saveButtonGradient}
                >
                  <Save size={20} color="white" style={styles.saveIcon} />
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Creating...' : 'Create Reservation Template'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
  },
  placeholder: {
    width: 40,
  },
  form: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  formCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  cardContent: {
    padding: 30,
  },
  formTitle: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#C89A5B',
    marginBottom: 10,
  },
  inputBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.3)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  textAreaBlur: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.3)',
    paddingTop: 16,
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    paddingRight: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  branchScroll: {
    maxHeight: 50,
  },
  branchOption: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.3)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  branchOptionActive: {
    borderColor: 'rgba(200, 154, 91, 0.8)',
    backgroundColor: 'rgba(200, 154, 91, 0.15)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  branchBlur: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  branchText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  branchTextActive: {
    color: '#C89A5B',
    fontFamily: 'Inter-SemiBold',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveIcon: {
    marginRight: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  pickerButton: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.3)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  pickerText: {
    flex: 1,
    height: 56,
    paddingRight: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlignVertical: 'center',
    lineHeight: 56,
  },
  pickerTextSelected: {
    color: 'white',
  },
});