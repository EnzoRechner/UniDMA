import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { loginUser } from './auth-firestore';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { success, message, userId, role } = await loginUser(email, password);
      if (success && userId) {
        // Persist userId for future use
        await AsyncStorage.setItem('userId', userId);

        if (role === 0) {
          router.replace('./Customer');
        } else if (role === 1) {
          router.replace('./Staff');
        } else if (role === 2) {
          router.replace('./Admin');
        } else {
          Alert.alert('Login Failed', 'Invalid role.');
        }
      } else {
        Alert.alert('Login Failed', message);
      }
    } catch {
      Alert.alert('Error', 'Failed to login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>Die Nag Uil</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
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
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.glassButtonText}>Login</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/SignUp')} style={styles.linkContainer}>
          <Text style={styles.linkText}>Don&apos;t have an account? Sign Up</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.push('/UpdateLogin')} style={styles.linkContainer}>
          <Text style={styles.linkText}>Forgot / Update Password?</Text>
        </TouchableOpacity>
      </View>
    </>
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
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 48,
    color: '#fff',
    letterSpacing: 1.5,
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
  linkContainer: {
    marginTop: 12,
  },
  linkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    opacity: 0.8,
  },
});

export default Login;
