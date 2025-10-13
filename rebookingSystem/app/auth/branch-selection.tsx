import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';

const branches = [
  {
    id: 'paarl',
    name: 'Paarl',
    address: '57 Main Rd, Southern Paarl, Paarl, 7624',
  },
  {
    id: 'oudewesthof',
    name: 'Oude Westhof',
    address: '3 Riesling St, Bellville, Cape Town, 7530',
  },
  {
    id: 'somersetwest',
    name: 'Somerset West',
    address: 'Coming Soon',
  },
];

export default function BranchSelectionScreen() {
  const { email, nagName } = useLocalSearchParams<{ email: string; nagName: string }>();
  const { updateUserProfile } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!selectedBranch) {
      Alert.alert('Error', 'Please select your preferred branch location');
      return;
    }

    if (!email || !nagName) {
      Alert.alert('Error', 'Missing user information');
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile({
        nagName,
        email,
        branch: selectedBranch,
        role: 0, // or the appropriate default role
        preferredSeating: '', // or a sensible default value
      });

      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const renderBranchCard = (branch: typeof branches[0]) => (
    <TouchableOpacity
      key={branch.id}
      style={[
        styles.branchCard,
        selectedBranch === branch.id && styles.branchCardSelected
      ]}
      onPress={() => setSelectedBranch(branch.id)}
    >
      <BlurView intensity={120} tint="dark" style={styles.cardBlur}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <MapPin size={24} color="#C89A5B" />
            </View>
            {selectedBranch === branch.id && (
              <View style={styles.selectedIcon}>
                <CheckCircle size={20} color="#10B981" fill="#10B981" />
              </View>
            )}
          </View>
          
          <Text style={styles.branchName}>{branch.name}</Text>
          <Text style={styles.branchAddress}>{branch.address}</Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
        style={styles.background}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <BlurView intensity={120} tint="dark" style={styles.logoBlur}>
              <Image source={require('../../assets/images/icon.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </BlurView>
          </View>
          <Text style={styles.title}>Choose Your Branch</Text>
          <Text style={styles.subtitle}>
            Select your preferred Die Nag Uil location
          </Text>
        </View>

        {/* Branch Cards */}
        <View style={styles.branchesContainer}>
          {branches.map(renderBranchCard)}
        </View>

        {/* Complete Button */}
        <TouchableOpacity 
          style={[styles.completeButton, !selectedBranch && styles.completeButtonDisabled]}
          onPress={handleComplete}
          disabled={loading || !selectedBranch}
        >
          <LinearGradient
            colors={selectedBranch ? ['#C89A5B', '#B8864A'] : ['#666666', '#555555']}
            style={styles.completeButtonGradient}
          >
            <Text style={styles.completeButtonText}>
              {loading ? 'Completing Setup...' : 'Complete Setup'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.8)',
    marginBottom: 20,
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  logoBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 180,
    height: 180,
  },
  title: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay-Black',
    color: '#C89A5B',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(200, 154, 91, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  branchesContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  branchCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    minHeight: 140,
  },
  branchCardSelected: {
    borderColor: 'rgba(200, 154, 91, 0.8)',
    backgroundColor: 'rgba(200, 154, 91, 0.1)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },
  cardBlur: {
    flex: 1,
    justifyContent: 'center',
  },
  cardContent: {
    padding: 20,
    flexDirection: 'column',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(200, 154, 91, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchName: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
    marginBottom: 8,
  },
  branchDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    lineHeight: 20,
  },
  branchAddress: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(200, 154, 91, 0.8)',
  },
  completeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 30,
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  completeButtonDisabled: {
    shadowColor: '#666666',
    shadowOpacity: 0.2,
  },
  completeButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
});