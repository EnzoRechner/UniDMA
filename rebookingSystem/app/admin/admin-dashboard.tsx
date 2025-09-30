import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';

import type { Router } from 'expo-router';

type RouteType = Parameters<Router['push']>[0];

const Tile = ({ title, route }: { title: string; route: RouteType }) => {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push(route)}
      style={styles.tile}
    >
      <Text style={styles.tileText}>{title}</Text>
    </TouchableOpacity>
  );
};

const TileP = ({ title, route }: { title: string; route: RouteType }) => {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push(route)}
      style={styles.tileWide}
    >
      <Text style={styles.tileText}>{title}</Text>
    </TouchableOpacity>
  );
};
const AdminDashboard = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Die Nag Uil Admin Dashboard</Text>
      <View style={styles.tileGrid}>
        <Tile  title="Manage Staff Accounts:" route="../staff/staff-dashboard" /> 
         <Tile title="Resturant Bookings:" route="../staff/booking-view" /> 
         <Tile title="Branch Settings:" route="../admin/branch-locations" />        
        <Tile title="Application Settings:" route="../admin/app-settings" /> 
        {/*<Tile title="Customer Management" route="../customer/customer" />*/}
      </View>
      <View>
        <TileP title="Loyalty Promo/Events" route="../login-related/login-page" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "rgba(20, 20, 20, 1)",
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    marginTop: 40,
    marginBottom: 32,
    color: "#fff",
    letterSpacing: 1.5,
    
  },
  tileText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 1.2,
    
  },
   tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tile: {
    backgroundColor: "rgba(46, 46, 46, 1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 15,
    width: "48%", // 2 per row with spacing
    marginBottom: 16,  
  },
  tileWide: {
    backgroundColor: "rgba(46, 46, 46, 1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 25,
    marginBottom: 16,  
    width: "100%",
  }
 
});

export default AdminDashboard;
