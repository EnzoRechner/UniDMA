import { Tabs } from 'expo-router';
import { Home, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: 90,
          borderTopWidth: 0,
          paddingTop: 10,
          paddingBottom: 30,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={120}
            tint="dark"
            style={[
              StyleSheet.absoluteFill, 
              { 
                borderTopLeftRadius: 20, 
                borderTopRightRadius: 20,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                borderTopWidth: 1,
                borderTopColor: 'rgba(200, 154, 91, 0.5)',
              }
            ]}
          />
        ),
        tabBarActiveTintColor: '#C89A5B',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.5)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Inter-Medium',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="create-reservation"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}