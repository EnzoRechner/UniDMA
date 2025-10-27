import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { LogOut } from 'lucide-react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AdminDashboard() {
  const router = useRouter();
  const handleLogout = async () => {
    await AsyncStorage.removeItem('userId');
    router.replace('/auth/auth-login');
  };
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']} style={styles.background} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>Admin Dashboard</Text>
            <View style={styles.titleDivider} />
          </View>

          <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
            <LogOut size={22} color="#C89A5B" />
          </TouchableOpacity>
        </View>

        <View style={styles.cardsGrid}>
          <View style={styles.gridRow}>
            <Pressable
              style={({ pressed }) => [styles.managementCard, styles.halfCard, pressed && styles.cardPressed]}
              onPress={() => router.push('/admin/staff')}
            >
              <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
                <Text style={styles.cardLabel}>Manage Staff{"\n"}Accounts</Text>
              </BlurView>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.managementCard, styles.halfCard, pressed && styles.cardPressed]}
              onPress={() => router.push('../staff/staff-dashboard')}
            >
              <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
                <Text style={styles.cardLabel}>Restaurant{"\n"}Bookings</Text>
              </BlurView>
            </Pressable>
          </View>

          <View style={styles.gridRow}>
            <Pressable
              style={({ pressed }) => [styles.managementCard, styles.halfCard, pressed && styles.cardPressed]}
              onPress={() => router.push('../admin/branch-local-test')}
            >
              <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
                <Text style={styles.cardLabel}>Branch{"\n"}Locations</Text>
              </BlurView>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.managementCard, styles.halfCard, pressed && styles.cardPressed]}
              onPress={() => router.push('../admin/app-settings')}
            >
              <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
                <Text style={styles.cardLabel}>Application{"\n"}Settings</Text>
              </BlurView>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  content: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center', 
  },
  pageTitle: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(200, 154, 91, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleDivider: {
    height: 1,
    backgroundColor: 'rgba(200, 154, 91, 0.3)',
    marginTop: 12,
    marginBottom: 16,
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  cardsGrid: { paddingHorizontal: 20, paddingBottom: 100 },
  gridRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  managementCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1.5,
    borderColor: 'rgba(200, 154, 91, 0.5)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  halfCard: { flex: 1, minHeight: 140 },
  cardPressed: {
    borderColor: 'rgba(200, 154, 91, 0.8)',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    transform: [{ scale: 0.98 }],
  },
  cardBlur: { flex: 1, padding: 20, justifyContent: 'flex-start', alignItems: 'flex-start' },
  cardLabel: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'white', lineHeight: 22, letterSpacing: 0.3 },
  iconButton: { padding: 5 },
});