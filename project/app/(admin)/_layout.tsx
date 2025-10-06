import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="reservations" />
    </Stack>
  );
}