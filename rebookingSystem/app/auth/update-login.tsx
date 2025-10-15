import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';
//import { updateUserPassword } from '../services/auth-service';

const UpdateLoginScreen = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpdate = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
        Alert.alert('Error', 'New password must be at least 6 characters long.');
        return;
    }
    setLoading(true);
    try {
      //await updateUserPassword(newPassword);
      Alert.alert('Success', 'Your password has been updated.', [
          { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Update Failed', error.message || 'Could not update password. You may need to sign in again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']} style={styles.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BlurView intensity={120} tint="dark" style={styles.formContainer}>
            <View style={styles.form}>
              <Text style={styles.formTitle}>Update Password</Text>
              <Text style={styles.formSubtitle}>Enter and confirm your new password</Text>

              <View style={styles.inputContainer}>
                <BlurView intensity={120} tint="dark" style={styles.inputBlur}>
                  <Lock size={20} color="#C89A5B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    placeholderTextColor="#666666"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                </BlurView>
              </View>

              <View style={styles.inputContainer}>
                <BlurView intensity={120} tint="dark" style={styles.inputBlur}>
                  <Lock size={20} color="#C89A5B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm New Password"
                    placeholderTextColor="#666666"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </BlurView>
              </View>

              <TouchableOpacity style={styles.authButton} onPress={handleUpdate} disabled={loading}>
                <LinearGradient colors={['#C89A5B', '#B8864A']} style={styles.authButtonGradient}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.authButtonText}>Update Password</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.toggleButton} onPress={() => router.back()}>
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
        shadowOpacity: 0.6, shadowRadius: 24,
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
        shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16,
    },
    authButtonGradient: { paddingVertical: 16, alignItems: 'center' },
    authButtonText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'white' },
    toggleButton: { alignItems: 'center', paddingVertical: 10 },
    toggleText: { fontSize: 14, fontFamily: 'Inter-Regular', color: 'rgba(200, 154, 91, 0.8)' },
});

export default UpdateLoginScreen;
