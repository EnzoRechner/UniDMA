import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  User, 
  Calendar, 
  Heart, 
  Bell, 
  ChevronRight,
  Edit3,
  LogOut,
  PersonStandingIcon,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase-initilisation';
import { fetchUserData } from '../services/customer-service';
//import NotificationSettingsModal from '../services/notification-settings';
import { UserProfile } from '../lib/types';
import { modalService } from '../services/modal-Service';

const profileStats = [
  { icon: Calendar, label: 'Bookings', value: '24', color: '#C89A5B' },
  { icon: Heart, label: 'Favorite', value: 'Paarl', color: '#EF4444' },

];

const menuSections = [
  {
    title: 'Account',
    items: [
      { icon: User, label: 'Personal Info', subtitle: 'Update your details' },
      { icon: Bell, label: 'Notifications', subtitle: 'Push, email & SMS' },
      { icon: PersonStandingIcon, label: 'Password Reset', subtitle: 'Change your password' },
    ],
  },
];

export default function ProfileScreen() {
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const storedId = await AsyncStorage.getItem('userId');
        if (!storedId) {
          router.replace('/auth/auth-login');
          return;
        }
        setUserId(storedId);
        const p = await fetchUserData(storedId);
        if (!p) throw new Error('Could not load profile');
        setProfile(p);
        setNameInput(p.nagName || '');
      } catch (e: any) {
        modalService.showError('Error', e?.message || 'Failed to load profile');
        await AsyncStorage.removeItem('userId');
        router.replace('/auth/auth-login');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSaveName = async () => {
    if (!userId) return;
    const newName = nameInput.trim();
    if (!newName) {
      modalService.showError('Validation', 'Please enter a valid name');
      return;
    }
    try {
      await updateDoc(doc(db, 'rebooking-accounts', userId), { nagName: newName });
      setProfile((prev) => (prev ? { ...prev, nagName: newName } : prev));
      setIsEditingName(false);
      modalService.showError('Saved', 'Your display name has been updated');
    } catch (e: any) {
      modalService.showError('Error', 'Failed to update name');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userId');
              router.replace('/auth/auth-login');
            } catch {
              modalService.showError('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const renderStatCard = (stat: typeof profileStats[0], index: number) => (
    <View key={index} style={styles.statCard}>
      <BlurView intensity={25} tint="dark" style={styles.statBlur}>
        <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
          <stat.icon size={20} color={stat.color} />
        </View>
        <Text style={styles.statValue}>{stat.value}</Text>
        <Text style={styles.statLabel}>{stat.label}</Text>
      </BlurView>
    </View>
  );

  const renderMenuItem = (item: any) => (
    <TouchableOpacity
      key={item.label}
      style={styles.menuItem}
      onPress={() => {
        if (item.label === 'Notifications') {
          setNotificationModalVisible(true);
        } else if (item.label === 'Personal Info') {
          setIsEditingName(true);
        } else if (item.label === 'Password Reset') {
            Alert.alert('To reset your password','You will be signed out and sent to our password reset page', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Continue', style: 'destructive', onPress: async () => {                  
                    try {
                    await AsyncStorage.removeItem('userId');
                    router.replace('/auth/auth-update-login');
                    } catch {
                    Alert.alert('Error', 'Failed to sign out');
                    }
          }
        }
      ]);
    }                  
      }}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.menuItemIcon}>
          <item.icon size={20} color="#C89A5B" />
        </View>
        <View style={styles.menuItemText}>
          <Text style={styles.menuItemLabel}>{item.label}</Text>
          <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <ChevronRight size={16} color="rgba(200, 154, 91, 0.6)" />
    </TouchableOpacity>
  );

  const renderMenuSection = (section: typeof menuSections[0], index: number) => (
    <View key={index} style={styles.menuSection}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <BlurView intensity={25} tint="dark" style={styles.sectionCard}>
        {section.items.map((item, itemIndex) => (
          <View key={item.label}>
            {renderMenuItem(item)}
            {itemIndex < section.items.length - 1 && <View style={styles.menuDivider} />}
          </View>
        ))}
      </BlurView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
        style={styles.background}
      />
      {loading ? (
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#C89A5B" />
        </View>
      ) : (
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>Profile</Text>
            <TouchableOpacity style={styles.editButton}>
              <BlurView intensity={20} tint="dark" style={styles.editButtonBlur}>
                <Edit3 size={16} color="#C89A5B" />
              </BlurView>
            </TouchableOpacity>
          </View>
          
          <View style={styles.logoContainer}>
            <BlurView intensity={30} tint="dark" style={styles.logoBlur}>
              <Image 
                source={require('../../assets/images/icon.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </BlurView>
          </View>
          
          <Text style={styles.restaurantName}>Die Nag Uil</Text>
          <Text style={styles.subtitle}>Member Profile</Text>
        </View>

        {/* Profile Card */}
        <BlurView intensity={25} tint="dark" style={styles.profileCard}>
          <View style={styles.profileContent}>
            <View style={styles.profileInfo}>
              {isEditingName ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="Display name"
                    placeholderTextColor="#aaa"
                  />
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveName}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => { setIsEditingName(false); setNameInput(profile?.nagName || ''); }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.nameRow}>
                  <Text style={styles.profileName}>{profile?.nagName || 'Guest User'}</Text>
                  <TouchableOpacity style={styles.inlineEditButton} onPress={() => setIsEditingName(true)}>
                    <Edit3 size={16} color="#C89A5B" />
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.profileEmail}>{profile?.email || 'No email'}</Text>
            </View>
          </View>
        </BlurView>

        {/* Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.statsContainer}>
            {profileStats.map(renderStatCard)}
          </View>
        </View>

        {/* Menu Sections */}
        {menuSections.map(renderMenuSection)}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <BlurView intensity={25} tint="dark" style={styles.logoutButtonBlur}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </BlurView>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
      )}

      {/* <NotificationSettingsModal
        visible={notificationModalVisible}
        onClose={() => setNotificationModalVisible(false)}
      /> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay-Black',
    color: '#C89A5B',
    textShadowColor: 'rgba(200, 154, 91, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  editButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(200, 154, 91, 0.6)',
    marginBottom: 15,
    position: 'relative',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  logoBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 40,
    height: 40,
    tintColor: '#C89A5B',
  },
  restaurantName: {
    fontSize: 36,
    fontFamily: 'PlayfairDisplay-Black',
    color: '#C89A5B',
    textAlign: 'center',
    marginBottom: 5,
    textShadowColor: 'rgba(200, 154, 91, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  profileCard: {
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  profileContent: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineEditButton: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    backgroundColor: 'rgba(200, 154, 91, 0.15)'
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: 'white',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#C89A5B',
  },
  saveButtonText: {
    color: '#0D0D0D',
    fontFamily: 'Inter-SemiBold',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)'
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Inter-SemiBold',
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 15,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(200, 154, 91, 0.6)',
  },
  profileBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(200, 154, 91, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
  },
  membershipBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(200, 154, 91, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  membershipText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#C89A5B',
  },
  statsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  statBlur: {
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  menuSection: {
    marginBottom: 25,
  },
  sectionCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(200, 154, 91, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(200, 154, 91, 0.2)',
    marginLeft: 60,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  logoutButtonBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  bottomSpacer: {
    height: 20,
  },
});

