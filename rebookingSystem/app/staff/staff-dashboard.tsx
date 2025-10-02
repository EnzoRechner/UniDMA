import React from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import BookingView from './booking-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";

const StaffDashboard = () => {
  const router = useRouter();

  return (
    <View style={styles.fullScreenBackground}> 
        <View style={styles.container}> 
          {/* Header with title and logout button */}
          <View style={styles.header}>
            <Text style={styles.title}>Bookings</Text>
            <TouchableOpacity
              style={styles.logoutButton}
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
    </View>
  );
};

const styles = StyleSheet.create({
    fullScreenBackground: {
        flex: 1,
        backgroundColor: '#09090b', 
    },
    container: {
        flex: 1,
        zIndex: 2, 
        paddingTop: 40,
    },
    // --- HEADER STYLES ---
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 0, 
        marginBottom: 20,
    },
    title: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    
    // --- LOGOUT BUTTON ---
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.25)", 
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.4)", 
        shadowColor: '#fff', 
        shadowOffset: { width: 0, height: 0 }, 
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 10, 
    },
    logoutText: {
        color: "#fff",
        marginLeft: 6,
        fontSize: 14,
        fontWeight: "600",
    },
});

export default StaffDashboard;
