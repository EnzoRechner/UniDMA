import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BookingView from './staff-booking-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { LogOut, Undo2 } from 'lucide-react-native'

const StaffDashboard = () => {

  const handleLogout = async () => {
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('userRole');
      router.replace('/auth/auth-login');
  }

  const handleBack = () => {
    // For admins, ensure we land on the Admin Dashboard instead of any prior screen in history
    router.replace('/admin/admin-dashboard-page');
  };

  const [userRole, setUserRole] = React.useState<number | null>(null);

  React.useEffect(() => {
    const fetchUserRole = async () => {
      const roleString = await AsyncStorage.getItem('userRole');
      if (roleString) {
        setUserRole(parseInt(roleString, 10));
      }
    };
    fetchUserRole();
  }, []);

  return (
    <View style={styles.fullScreenBackground}> 
        <View style={styles.container}> 
          {/* Header with title and logout button */}
          <View style={styles.header}>
            <Text style={styles.title}>Bookings</Text>
              {userRole === 1 ? (
                      // Display LOGOUT button for Role 1
                      <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
                          <LogOut size={22} color="#C89A5B" />
                      </TouchableOpacity>
                  ) : (
                      // Display BACK button for all other roles (2, 3, etc.)
                      <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
                          <Undo2 size={22} color="#C89A5B" /> 
                      </TouchableOpacity>
                  )}
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
    iconButton: { padding: 5 },
});

export default StaffDashboard;