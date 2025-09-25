import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { signUpUser } from './auth-firestore';

const SignUp = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nagName, setNagName] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const { success, message, userId } = await signUpUser(email, password, nagName, dob);
      if (success) {
        Alert.alert('Sign Up Success', message);
        if (userId) {
          await AsyncStorage.setItem('userId', userId);
        }
        router.replace('./Customer');
      } else {
        Alert.alert('Sign Up Failed', message);
      }
    } catch {
      Alert.alert('Error', 'Failed to sign up.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.glassButton, styles.backButton]}
          onPress={() => router.replace('./Login')}
          activeOpacity={0.8}
        >
          <View style={styles.glassInner}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
            <Text style={styles.glassButtonText}>Login</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>Sign Up</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#666"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#666"
        />
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={nagName}
          onChangeText={setNagName}
          placeholderTextColor="#666"
        />
        <TextInput
          style={styles.input}
          placeholder="Date of Birth (YYYY-MM-DD)"
          value={dob}
          onChangeText={setDob}
          placeholderTextColor="#666"
        />
        <TouchableOpacity
          style={[styles.glassButton, loading && styles.disabledButton]}
          onPress={handleSignUp}
          disabled={loading}
          activeOpacity={0.8}
        >
          <View style={styles.glassInner}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.glassButtonText}>Sign Up</Text>
            )}
          </View>
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
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
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
  backButton: {
    marginBottom: 32,
    marginTop: 8,
    width: '60%',
    alignSelf: 'flex-start',
  },
  glassInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: 'rgba(60, 78, 185, 0.37)',
    gap: 8
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

export default SignUp;
