import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Building, Settings, Users, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Tile Component for navigation
const Tile = ({ title, icon, route }: { title: string; icon: React.ReactNode; route: string }) => {
  const router = useRouter();
  return (
    <TouchableOpacity style={styles.tile} onPress={() => router.push(route as any)}>
      <View style={styles.iconContainer}>{icon}</View>
      <Text style={styles.tileText}>{title}</Text>
    </TouchableOpacity>
  );
};

const AdminDashboard = () => {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0D0D0D', '#1A1A1A']} style={styles.background} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Die Nag Uil Management</Text>
        </View>

        <View style={styles.tileGrid}>
          <Tile
            title="Branch Locations"
            icon={<Building size={46} color="#C89A5B" />}
            route="../admin/branch-local-test"
          />
          <Tile
            title="App Settings"
            icon={<Settings size={46} color="#C89A5B" />}
            route="../admin/admin-settings"
          />
          <Tile
            title="Staff Accounts"
            icon={<Users size={46} color="#C89A5B" />}
            route="../staff/staff-dashboard" // Assuming this is the correct route
          />
           <Tile
            title="View Bookings"
            icon={<Calendar size={46} color="#C89A5B" />}
            route="../staff/staff-booking-view" // Assuming this is the correct route
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontFamily: 'PlayfairDisplay-Bold', // Make sure this font is loaded in your project
    color: '#C89A5B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Inter-Regular', // Make sure this font is loaded
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tile: {
    width: '48%',
    aspectRatio: 1, // Makes the tile a square
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(200, 154, 91, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '5%',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 12,
  },
  tileText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold', // Make sure this font is loaded
    textAlign: 'center',
  },
});

export default AdminDashboard;
