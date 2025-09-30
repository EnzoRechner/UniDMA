import React from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import BookingView from './booking-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";

const StaffDashboard = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header with title and logout button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 40, marginBottom: 20 }}>
        <Text style={styles.title}>Bookings</Text>
        <TouchableOpacity
          style={[styles.logoutButton, { position: 'relative', top: 0, right: 0 }]}
          onPress={async () => {
            await AsyncStorage.removeItem("userId");
            router.replace("../login-related/login-page");
          }}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
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
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)", 
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8, 
  },
    logoutText: {
    color: "#fff",
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default StaffDashboard;
