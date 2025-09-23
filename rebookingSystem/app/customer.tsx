import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { getFirestore, collection, query, where, orderBy, limit, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { Stack, useRouter } from 'expo-router';

// Use userId set on login (documentId)
declare global {
  var currentUserId: string | undefined;
}
const getCurrentUserId = () => {
  return globalThis.currentUserId;
};


type Booking = {
  id: string;
  date: string;
  seats: string;
  message: string;
  branch: string;
  status?: string;
};
type BookingForm = {
  date: string;
  seats: string;
  message: string;
  branch: string;
};

const CustomerView = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  // Always show the create booking panel as a widget
  const [form, setForm] = useState<BookingForm>({ date: '', seats: '', message: '', branch: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const app = getApp();
        const db = getFirestore(app);
        const userId = getCurrentUserId();
        if (!userId) {
          setBookings([]);
          setLoading(false);
          return;
        }
        const q = query(
          collection(db, 'bookings'),
          where('customerId', '==', userId),
          orderBy('date', 'desc'),
          limit(3)
        );
        const snap = await getDocs(q);
        setBookings(
          snap.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              date: String(data.date ?? ''),
              seats: String(data.seats ?? ''),
              message: String(data.message ?? ''),
              branch: String(data.branch ?? ''),
            };
          })
        );
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const handleFormChange = (field: keyof BookingForm, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleCreateBooking = async () => {
    setLoading(true);
    try {
      const app = getApp();
      const db = getFirestore(app);
      const userId = getCurrentUserId();
      // Convert date to Firestore Timestamp if possible
      let dateOfArrival: any = form.date;
      try {
        if (form.date) {
          const d = new Date(form.date);
          if (!isNaN(d.getTime())) {
            dateOfArrival = Timestamp.fromDate(d);
          }
        }
      } catch {}
      // Add booking to Firestore
      const docRef = await addDoc(collection(db, 'bookings'), {
        customerId: userId,
        dateOfArrival,
        seats: Number(form.seats),
        message: form.message,
        branch: form.branch,
        status: 'sent',
      });
      // Add new booking to carousel immediately (optimistic UI)
      setBookings(prev => [
        ...prev,
        {
          id: docRef.id,
          date: form.date,
          seats: form.seats,
          message: form.message,
          branch: form.branch,
          status: 'sent',
        },
      ]);
      setForm({ date: '', seats: '', message: '', branch: '' });
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.logoutContainer}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            globalThis.currentUserId = undefined;
            router.replace('/Login');
          }}
          activeOpacity={0.8}
        >
          <View style={styles.glassInnerSmall}>
            <Text style={styles.logoutText}>{'Logout'}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={{ alignItems: 'center', padding: 16 }}>
        <Text style={styles.title}>Your Recent Bookings</Text>
        <ScrollView
          style={styles.carousel}
          contentContainerStyle={styles.carouselContent}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToAlignment="start"
          decelerationRate="fast"
          snapToInterval={360} // width of widget + margin
        >
          {bookings.map((b, i) => (
            <View key={b.id} style={styles.glassWidget}>
              <Text style={styles.widgetTitle}>Booking {i + 1}</Text>
              <Text style={styles.widgetText}>Date: {b.date}</Text>
              <Text style={styles.widgetText}>Seats: {b.seats}</Text>
              <Text style={styles.widgetText}>Branch: {b.branch}</Text>
              <Text style={styles.widgetText}>Message: {b.message}</Text>
              {b.status === 'sent' && (
                <View style={styles.sentButton}>
                  <Text style={styles.sentButtonText}>Sent</Text>
                </View>
              )}
            </View>
          ))}
          <View style={styles.createWidget}>
            <Text style={styles.widgetTitle}>Create Booking</Text>
            <Text style={styles.widgetText}>Date</Text>
            <TextInput style={styles.input} value={form.date} onChangeText={v => handleFormChange('date', v)} placeholder="YYYY-MM-DD" placeholderTextColor="#aaa" />
            <Text style={styles.widgetText}>Seats</Text>
            <TextInput style={styles.input} value={form.seats} onChangeText={v => handleFormChange('seats', v)} placeholder="Number of seats" placeholderTextColor="#aaa" />
            <Text style={styles.widgetText}>Branch</Text>
            <TextInput style={styles.input} value={form.branch} onChangeText={v => handleFormChange('branch', v)} placeholder="Branch name" placeholderTextColor="#aaa" />
            <Text style={styles.widgetText}>Message</Text>
            <TextInput style={styles.input} value={form.message} onChangeText={v => handleFormChange('message', v)} placeholder="Message" placeholderTextColor="#aaa" />
            <TouchableOpacity style={styles.confirmButton} onPress={handleCreateBooking} disabled={loading}>
              <View style={styles.glassInner}>
                <Text style={styles.glassButtonText}>{loading ? 'Confirming...' : 'Confirm'}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScrollView>
    </>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  logoutContainer: {
    position: 'absolute',
    top: 32,
    left: 16,
    zIndex: 10,
  },
  logoutButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 136, 255, 0.10)',
    borderWidth: 1.2,
    borderColor: 'rgba(0, 27, 68, 0.5)',
  },
  glassInnerSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(60, 78, 185, 0.22)',
  },
  logoutText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'thin',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'thin',
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  carousel: {
    width: '100%',
    marginBottom: 24,
    marginTop: 12,
  },
  carouselContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 8,
    paddingRight: 8,
  },
  glassWidget: {
    backgroundColor: 'rgba(0, 136, 255, 0.15)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 27, 68, 0.81)',
    marginTop: 180,
    marginRight: 16,
    padding: 16,
    minWidth: 350,
    maxWidth: 180,
    alignItems: 'center',
  },
  createWidget: {
    backgroundColor: 'rgba(0, 136, 255, 0.15)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 27, 68, 0.81)',
    padding: 16,
    width: '100%',
    marginTop: 16,
  },
  widgetTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'thin',
    marginBottom: 180
  },
  widgetText: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 4,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    color: '#fff',
    backgroundColor: '#222',
  },
  confirmButton: {
    width: '100%',
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    backgroundColor: 'rgba(0, 136, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 27, 68, 0.81)',
  },
  glassInner: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(60, 78, 185, 0.37)',
  },
  glassButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  sentButton: {
    marginTop: 12,
    backgroundColor: '#FFD600',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 18,
    alignItems: 'center',
    alignSelf: 'center',
  },
  sentButtonText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 1,
  },
});

export default CustomerView;
