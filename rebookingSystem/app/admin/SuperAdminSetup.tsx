import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Mail, Lock, User } from 'lucide-react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { createUserProfile } from '@/utils/firestore';

export default function SuperAdminSetup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateSuperAdmin = async () => {
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    Alert.alert(
      'Confirm Creation',
      'Are you sure you want to create a super admin account? This should only be done once during initial setup.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Create',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await createUserWithEmailAndPassword(
                auth,
                email.trim(),
                password
              );

              await updateProfile(result.user, {
                displayName: displayName.trim(),
              });

              await createUserProfile(result.user.uid, {
                role: 'super_admin',
                displayName: displayName.trim(),
                email: email.trim(),
                preferredBranch: '',
                preferredSeating: '',
              });

              Alert.alert(
                'Success',
                'Super admin account created successfully! You can now login with these credentials.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setEmail('');
                      setPassword('');
                      setDisplayName('');
                    },
                  },
                ]
              );
            } catch (error: any) {
              console.error('Error creating super admin:', error);
              Alert.alert(
                'Error',
                error.message || 'Failed to create super admin account'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={120} tint="dark" style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Shield size={32} color="#C89A5B" />
          </View>
          <Text style={styles.title}>Create Super Admin</Text>
          <Text style={styles.subtitle}>
            Set up the first super administrator account
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <BlurView intensity={15} tint="dark" style={styles.inputBlur}>
            <User size={16} color="#C89A5B" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Admin Name"
              placeholderTextColor="#666666"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
            />
          </BlurView>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <BlurView intensity={15} tint="dark" style={styles.inputBlur}>
            <Mail size={16} color="#C89A5B" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="admin@restaurant.com"
              placeholderTextColor="#666666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </BlurView>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <BlurView intensity={15} tint="dark" style={styles.inputBlur}>
            <Lock size={16} color="#C89A5B" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Min. 8 characters"
              placeholderTextColor="#666666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </BlurView>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateSuperAdmin}
          disabled={loading}
        >
          <LinearGradient
            colors={['#C89A5B', '#9A7A4A']}
            style={styles.createButtonGradient}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Shield size={18} color="white" />
                <Text style={styles.createButtonText}>Create Super Admin</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            This setup should only be used once during initial configuration.
            Super admin accounts have full system access.
          </Text>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.8)',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(200, 154, 91, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#C89A5B',
    marginBottom: 8,
  },
  inputBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    paddingVertical: 12,
  },
  inputIcon: {
    marginLeft: 12,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'white',
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  warningContainer: {
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  warningText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
});
