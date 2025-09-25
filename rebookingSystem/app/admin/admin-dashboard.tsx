import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { Router } from 'expo-router';

type RouteType = Parameters<Router['push']>[0];

const Tile = ({ title, route }: { title: string; route: RouteType }) => {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push(route)}
      className="rounded-2xl p-6 m-2 bg-white/10 border border-white/20 w-[45%] h-32 justify-center items-center"
    >
      <Text className="text-white text-xl font-semibold">{title}</Text>
    </TouchableOpacity>
  );
};

const AdminDashboard = () => {
  return (
    <View className="flex-1 bg-black p-4">
      <Text className="text-white text-3xl font-bold mb-6">Admin Dashboard</Text>
      <View className="flex-row flex-wrap justify-between">
        <Tile title="Staff Accounts" route="/StaffDashboard" />
        {/* <Tile title="App Settings" route="/app-settings" /> */}
        {/* <Tile title="Branch Locations" route="/branch-locations" /> */}
        <Tile title="Bookings" route="/BookingView" />
      </View>
    </View>
  );
};

export default AdminDashboard;
