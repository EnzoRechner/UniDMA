import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { getFirestore, collection, setDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { getApp } from 'firebase/app';


function generateRandomId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
      const app = getApp();
      const db = getFirestore(app);
      // Check if email already exists in customer or staff
      const checkCollection = async (colName: string) => {
        const q = query(
          collection(db, colName),
          where('email', '==', email)
        );
        const snapshot = await getDocs(q);
        return !snapshot.empty;
      };
      const existsInCustomer = await checkCollection('customer');
      const existsInStaff = await checkCollection('staff');
      if (existsInCustomer || existsInStaff) {
        Alert.alert('Sign Up Failed', 'Email already exists.');
        setLoading(false);
        return;
      }
      // Generate random 6-digit document ID
      const documentId = generateRandomId();
      await setDoc(doc(db, 'customer', documentId), {
        email,
        password,
        nagName,
        DOB: dob,
        // No role by default
      });
      // Simulate user object with no role
      const user = { role: undefined, id: documentId };
      if (!user.role) {
        router.replace('/customer');
        return;
      }
      Alert.alert('Sign Up Success', `Account created! Your ID: ${documentId}`);
      setEmail('');
      setPassword('');
      setNagName('');
      setDob('');
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
        onPress={() => router.replace('/Login')}
        activeOpacity={0.8}
      >
        <View style={styles.glassInner}>
          <Text style={styles.glassButtonText}>{'<  Back to Login'}</Text>
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
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={nagName}
        onChangeText={setNagName}
      />
      <TextInput
        style={styles.input}
        placeholder="Date of Birth (YYYY-MM-DD)"
        value={dob}
        onChangeText={setDob}
      />
      <TouchableOpacity
        style={[styles.glassButton, loading && styles.disabledButton]}
        onPress={handleSignUp}
        disabled={loading}
        activeOpacity={0.8}
      >
        <View style={styles.glassInner}>
          <Text style={styles.glassButtonText}>{loading ? 'Signing up...' : 'Sign Up'}</Text>
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
});

export default SignUp;
