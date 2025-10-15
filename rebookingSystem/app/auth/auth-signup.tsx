import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Image, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, User, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { signUp } from '../services/auth-service';
import { Picker } from '@react-native-picker/picker';
import { BranchId, BRANCHES } from '../lib/types';

const SignupScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nagName, setNagName] = useState('');
  const [branch, setBranch] = useState<BranchId>(BRANCHES.PAARL);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validatePassword = (pass: string) => {
    if (pass.length < 6) return 'Password must be at least 6 characters long';
    if (!/[A-Z]/.test(pass)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(pass)) return 'Password must contain a lowercase letter';
    if (!/\d/.test(pass)) return 'Password must contain a number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return 'Password must contain a special character';
    return null;
  };

  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 6) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[a-z]/.test(pass)) strength++;
    if (/\d/.test(pass)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) strength++;
    
    if (strength <= 2) return { level: 'Weak', color: '#EF4444' };
    if (strength <= 3) return { level: 'Medium', color: '#F59E0B' };
    return { level: 'Strong', color: '#10B981' };
  };

  const handleSignUp = async () => {
    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert('Password Requirements', passwordError);
      return;
    }
    if (!email.trim() || !nagName.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, nagName.trim(), branch);
      Alert.alert('Success!', 'Your account has been created.', [
        { text: 'OK', onPress: () => router.replace('/customer/customer-page') }
      ]);
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };
  
  const strength = getPasswordStrength(password);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']} style={styles.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
              <View style={styles.logoContainer}>
                  <BlurView intensity={120} tint="dark" style={styles.logoBlur}>
                  <Image source={require('../../assets/images/icon.png')} style={styles.logoImage} resizeMode="contain" />
                  </BlurView>
              </View>
              <Text style={styles.title}>Die Nag Uil</Text>
          </View>
          <BlurView intensity={120} tint="dark" style={styles.formContainer}>
            <View style={styles.form}>
              <Text style={styles.formTitle}>Join The Experience</Text>
              <Text style={styles.formSubtitle}>Create your account for reservations</Text>

              <View style={styles.inputContainer}>
                <BlurView intensity={120} tint="dark" style={styles.inputBlur}>
                  <User size={20} color="#C89A5B" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Nag Name" placeholderTextColor="#666666" value={nagName} onChangeText={setNagName} />
                </BlurView>
              </View>

              <View style={styles.inputContainer}>
                <BlurView intensity={120} tint="dark" style={styles.inputBlur}>
                  <Mail size={20} color="#C89A5B" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor="#666666" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                </BlurView>
              </View>

              <View style={styles.inputContainer}>
                <BlurView intensity={120} tint="dark" style={styles.inputBlur}>
                  <Lock size={20} color="#C89A5B" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#666666" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
                  <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} color="#666666" /> : <Eye size={20} color="#666666" />}
                  </TouchableOpacity>
                </BlurView>
                {password.length > 0 && (
                  <View style={styles.passwordStrengthContainer}>
                    <View style={styles.passwordStrengthBar}><View style={[styles.passwordStrengthFill, { width: `${strength.level === 'Weak' ? 33 : strength.level === 'Medium' ? 66 : 100}%`, backgroundColor: strength.color }]} /></View>
                    <Text style={[styles.passwordStrengthText, { color: strength.color }]}>{strength.level}</Text>
                  </View>
                )}
              </View>

              <View style={[styles.inputContainer, { marginBottom: 30 }]}>
                <Text style={styles.pickerLabel}>Preferred Branch</Text>
                <BlurView intensity={120} tint="dark" style={styles.inputBlur}>
                  <Picker selectedValue={branch} onValueChange={(itemValue) => setBranch(itemValue)} style={styles.picker} dropdownIconColor="#C89A5B">
                    <Picker.Item label="Paarl" value={BRANCHES.PAARL} />
                    <Picker.Item label="Bellville" value={BRANCHES.BELLVILLE} />
                    <Picker.Item label="Somerset West" value={BRANCHES.SOMERSET_WEST} />
                  </Picker>
                </BlurView>
              </View>

              <TouchableOpacity style={styles.authButton} onPress={handleSignUp} disabled={loading}>
                <LinearGradient colors={['#C89A5B', '#B8864A']} style={styles.authButtonGradient}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.authButtonText}>Create Account</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.toggleButton} onPress={() => router.push('/auth/auth-login')}>
                <Text style={styles.toggleText}>Already have an account? <Text style={{fontWeight: 'bold'}}>Sign In</Text></Text>
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
    scrollContent: { flexGrow: 1, paddingHorizontal: 20, justifyContent: 'center', paddingBottom: 20 },
    header: { alignItems: 'center', marginBottom: 20, paddingTop: 20 },
    logoContainer: {
        width: 80, height: 80, borderRadius: 40, overflow: 'hidden', backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.8)', marginBottom: 20, shadowColor: '#C89A5B',
        shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.6, shadowRadius: 20,
    },
    logoBlur: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    logoImage: { width: 180, height: 180 },
    title: {
        fontSize: 32, fontFamily: 'PlayfairDisplay-Black', color: '#C89A5B',
        textShadowColor: 'rgba(200, 154, 91, 0.4)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 6,
    },
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
    inputContainer: { marginBottom: 15 },
    inputBlur: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 16, overflow: 'hidden',
        backgroundColor: 'rgba(0, 0, 0, 0.2)', borderWidth: 1, borderColor: 'rgba(200, 154, 91, 0.6)',
    },
    inputIcon: { marginLeft: 16 },
    input: { flex: 1, height: 56, paddingHorizontal: 16, fontSize: 16, fontFamily: 'Inter-Regular', color: 'white' },
    eyeIcon: { paddingHorizontal: 16 },
    pickerLabel: { color: '#C89A5B', fontSize: 14, fontFamily: 'Inter-SemiBold', marginBottom: 8, paddingLeft: 4 },
    picker: { flex: 1, color: 'white', height: 56 },
    passwordStrengthContainer: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
    passwordStrengthBar: { flex: 1, height: 4, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 2, overflow: 'hidden' },
    passwordStrengthFill: { height: '100%', borderRadius: 2 },
    passwordStrengthText: { fontSize: 12, fontFamily: 'Inter-SemiBold' },
    authButton: {
        borderRadius: 16, overflow: 'hidden', marginTop: 10, marginBottom: 20, shadowColor: '#C89A5B',
        shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16,
    },
    authButtonGradient: { paddingVertical: 16, alignItems: 'center' },
    authButtonText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'white' },
    toggleButton: { alignItems: 'center', paddingVertical: 10 },
    toggleText: { fontSize: 14, fontFamily: 'Inter-Regular', color: 'rgba(200, 154, 91, 0.8)' },
});

export default SignupScreen;

