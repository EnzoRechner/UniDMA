import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { app, db } from '../config/initialiseFirebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
  // Use imported db from initialiseFirebase

      // Helper to check a collection for matching email and password
    // Modified: get documentId if found
    const checkCollection = async (colName: string) => {
      const q = query(
        collection(db, colName),
        where('email', '==', email),
        where('password', '==', password)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        // Return the documentId (userId)
        return snapshot.docs[0].id;
      }
      return null;
    };

    const customerId = await checkCollection('customer');
    const staffId = await checkCollection('staff');

    if (customerId || staffId) {
      // Set userId globally for customer view
      globalThis.currentUserId = customerId ?? staffId ?? undefined;
      // Optionally show a welcome alert, then navigate
      // Alert.alert('Login Success', `Welcome${staffId ? ' Staff' : ''}!`);
      if (customerId) {
        router.replace('/customer');
      } else {
        router.replace('/(tabs)');
      }
    } else {
      Alert.alert('Login Failed', 'Invalid email or password.');
    }
    } catch {
      Alert.alert('Error', 'Failed to login.');
    } finally {
      setLoading(false);
    }
  };

  const router = useRouter();
  const handleSignUp = () => {
    router.push('/SignUp');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lekker aand</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity
        style={[styles.glassButton, loading && styles.disabledButton]}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.8}
      >
        <View style={styles.glassInner}>
          <Text style={styles.glassButtonText}>{loading ? 'Logging in...' : 'Login'}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>Don&apos;t have an account?</Text>
        <Button title="Sign Up" onPress={handleSignUp} color="#2b2b2bff" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 32,
    fontWeight: 'thin',
    marginBottom: 100,
    color: '#fff',
  },
  input: {
    width: '100%',
    height: 48,
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#222',
  },
  signupContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  signupText: {
    color: '#fff',
    marginBottom: 8,
  },
  glassButton: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    backgroundColor: 'rgba(0, 136, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 27, 68, 0.81)',
  },
  glassInner: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    // Note: backdropFilter is web only
    backgroundColor: 'rgba(60, 78, 185, 0.37)',
  },
  glassButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default Login;
