import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase-initilisation';
import { modalService } from '../services/modal-Service';

const UpdateLoginScreen = () => {
  const [EmailAdd, setEmailAdd] = useState('');

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePassword = async () => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, EmailAdd);
      modalService.showSuccess(
        'Password Reset Email Sent 😲',
        'A password reset email has been sent to your email address. Please check your inbox.'
      );
      router.replace('../auth/auth-login');
    } catch (e: any) {
      console.log(e?.message ?? e);
      modalService.showError('Error', 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BlurView intensity={80} tint="dark" style={styles.formContainer}>
            <View style={styles.form}>
              <Text style={styles.formTitle}>Password Reset</Text>
              <Text style={styles.formSubtitle}>Did you forget your password?</Text>

              <View style={styles.inputContainer}>
                <BlurView intensity={80} tint="dark" style={styles.inputBlur}>
                  <Lock size={20} color="#C89A5B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email address"
                    placeholderTextColor="#666666"
                    value={EmailAdd}
                    onChangeText={(text) => setEmailAdd(text)}
                  />
                </BlurView>
              </View>


              <TouchableOpacity style={styles.authButton} onPress={handlePassword} disabled={loading}>
                <LinearGradient colors={['#C89A5B', '#B8864A']} style={styles.authButtonGradient}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.authButtonText}>Update Password</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.toggleButton} onPress={() => router.push('../auth/auth-login')}>
                <Text style={styles.toggleText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 20, justifyContent: 'center' },
  formContainer: {
        borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderWidth: 1,
        borderColor: 'rgba(200, 154, 91, 0.8)', shadowColor: '#C89A5B', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35, shadowRadius: 14,
    },
    form: { padding: 30 },
    formTitle: {
        fontSize: 24, fontFamily: 'PlayfairDisplay-Bold', color: '#C89A5B', marginBottom: 8,
        textAlign: 'center',
    },
    formSubtitle: {
        fontSize: 16, fontFamily: 'Inter-Regular', color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center', marginBottom: 30,
    },
    inputContainer: { marginBottom: 20 },
    inputBlur: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 16, overflow: 'hidden',
        backgroundColor: 'rgba(0, 0, 0, 0.2)', borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.6)',
    },
    inputIcon: { marginLeft: 16 },
    input: { flex: 1, height: 56, paddingHorizontal: 16, fontSize: 16, fontFamily: 'Inter-Regular', color: 'white' },
  authButton: {
        borderRadius: 16, overflow: 'hidden', marginBottom: 20, shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10,
    },
    authButtonGradient: { paddingVertical: 16, alignItems: 'center' },
    authButtonText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'white' },
    toggleButton: { alignItems: 'center', paddingVertical: 10 },
    toggleText: { fontSize: 14, fontFamily: 'Inter-Regular', color: 'rgba(200, 154, 91, 0.8)' },
});

export default UpdateLoginScreen;
