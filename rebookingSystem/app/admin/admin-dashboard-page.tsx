import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { LogOut } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPrettyBranchName } from '../lib/typesConst';
import { getUserProfile } from '../services/auth-service';
import { db } from '../services/firebase-initilisation';

export default function AdminDashboard() {
  const router = useRouter();
  const [branchName, setBranchName] = useState<string>('');
  const [userRole, setUserRole] = useState<number | null>(null);

  useEffect(() => {
    let unsub: undefined | (() => void);
    const loadBranch = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) return;
        const profile = await getUserProfile(userId);
        if (!profile) return;
        const role = (profile as any).role as number | null;
        setUserRole(role);
        if (role === 3) {
          // Super admin oversees the entire restaurant
          setBranchName('Die Nag Uil');
          return;
        }
        const rawBranch = (profile as any).branch;
        const code = typeof rawBranch === 'number' ? rawBranch : Number(rawBranch);
        if (Number.isFinite(code)) {
          const q = query(collection(db, 'Branch'), where('branchCode', '==', code));
          unsub = onSnapshot(q, (snap) => {
            const doc = snap.docs[0];
            const liveName = doc?.data()?.name as string | undefined;
            if (liveName && typeof liveName === 'string') {
              setBranchName(liveName);
            } else {
              const pretty = getPrettyBranchName(code);
              setBranchName(pretty || String(code));
            }
          });
        } else {
          // Fallback if code is not numeric
          const pretty = typeof rawBranch === 'number' ? getPrettyBranchName(Number(rawBranch)) : undefined;
          setBranchName(pretty || (rawBranch != null ? String(rawBranch) : ''));
        }
      } catch {
        // Ignore and keep existing subtitle
      }
    };
    loadBranch();
    return () => { try { if (unsub) unsub(); } catch {} };
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userId');
    router.replace('../auth/auth-login');
  };
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']} style={styles.background} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerAction} onPress={handleLogout}>
            <LogOut size={22} color="#C89A5B" />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.pageTitle}>Admin Dashboard</Text>
            <Text style={styles.pageSubtitle}>
              {branchName ? (userRole === 3 ? branchName : `${branchName} Branch`) : ' '}
            </Text>
            <View style={styles.titleDivider} />
          </View>
        </View>

        <View style={styles.cardsGrid}>
          <View style={styles.gridRow}>
            <Pressable
              style={({ pressed }) => [styles.managementCard, styles.halfCard, pressed && styles.cardPressed]}
              onPress={() => router.push('./staff')}
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
              onPress={() => router.push('./admin-branch-page')}
            >
              <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
                <Text style={styles.cardLabel}>Branch{"\n"}Locations</Text>
              </BlurView>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.managementCard, styles.halfCard, pressed && styles.cardPressed]}
              onPress={() => router.push('./app-settings')}
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
    alignItems: 'center',
    position: 'relative',
  },
  headerAction: { position: 'absolute', right: 20, top: 60, padding: 5 },
  titleWrap: { alignItems: 'center', width: '100%' },
  pageTitle: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(200, 154, 91, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  pageSubtitle: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.3,
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
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  halfCard: { flex: 1, minHeight: 140 },
  cardPressed: {
    borderColor: 'rgba(200, 154, 91, 0.8)',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    transform: [{ scale: 0.98 }],
  },
  cardBlur: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  cardLabel: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'white', lineHeight: 22, letterSpacing: 0.3, textAlign: 'center' },
  iconButton: { padding: 5 },
});