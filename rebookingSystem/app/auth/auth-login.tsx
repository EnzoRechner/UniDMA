import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { signIn } from '../services/auth-service';
import { modalService } from '../services/modal-Service';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      modalService.showError('Login Error', 'Please fill in all fields');
      return;
    }
    if (!email.includes('@')) {
      modalService.showError('Login Error', 'Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      modalService.showError('Login Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Sign in and get the profile back 
      const profile = await signIn(email.trim(), password);

      if (!profile) {
        modalService.showError('Profile Missing', 'We could not find your user profile. Please complete setup or contact support.');
        // Keep user in auth flow
        router.replace('../auth');
        return;
      }

      // Accept both numeric and string role formats
      const role = profile.role;

      // Admin / Super Admin
      if (role === 2 || role === 3) {
        router.replace('../admin/admin-dashboard-page');
        return;
      }

      // Staff
      if (role === 1) {
        router.replace('../staff/staff-dashboard');
        return;
      }

      // Regular customer 
      router.replace('../customer/customer-page');
    } catch {
      modalService.showError('Login Failed', 'Your email/password is incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <BlurView intensity={80} tint="dark" style={styles.logoBlur}>
                <Image source={require('../../assets/images/icon.png')} style={styles.logoImage} resizeMode="contain" />
              </BlurView>
            </View>
            <Text style={styles.title}>Die Nag Uil</Text>
            <Text style={styles.subtitle}>Kroeg • Eetsaal</Text>
          </View>

          <BlurView intensity={80} tint="dark" style={styles.formContainer}>
            <View style={styles.form}>
              <Text style={styles.formTitle}>Welcome Back</Text>
              <Text style={styles.formSubtitle}>Sign in to your account</Text>

              <View style={styles.inputContainer}>
                <BlurView intensity={80} tint="dark" style={styles.inputBlur}>
                  <Mail size={20} color="#C89A5B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor="#666666"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </BlurView>
              </View>

              <View style={styles.inputContainer}>
                <BlurView intensity={80} tint="dark" style={styles.inputBlur}>
                  <Lock size={20} color="#C89A5B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#666666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} color="#666666" /> : <Eye size={20} color="#666666" />}
                  </TouchableOpacity>
                </BlurView>
              </View>

              <TouchableOpacity style={styles.authButton} onPress={handleLogin} disabled={loading}>
                <LinearGradient colors={['#C89A5B', '#B8864A']} style={styles.authButtonGradient}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.authButtonText}>Sign In</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.toggleButton} onPress={() => router.push('../auth/auth-signup')}>
                <Text style={styles.toggleText}>
                  Don&apos;t have an account? <Text style={{ fontWeight: 'bold' }}>Sign Up</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toggleButton} onPress={() => router.push('../auth/auth-update-login')}>
                <Text style={styles.toggleText}>Forgot Password?</Text>
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
  header: { alignItems: 'center', marginBottom: 40 },
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
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  logoBlur: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoImage: { width: 180, height: 180 },
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
  subtitle: { fontSize: 16, fontFamily: 'Inter-Regular', color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center' },
  formContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.8)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  form: { padding: 30 },
  formTitle: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginBottom: 8,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: { marginBottom: 20 },
  inputBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.6)',
  },
  inputIcon: { marginLeft: 16 },
  input: { flex: 1, height: 56, paddingHorizontal: 16, fontSize: 16, fontFamily: 'Inter-Regular', color: 'white' },
  eyeIcon: { paddingHorizontal: 16 },
  authButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  authButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  authButtonText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'white' },
  toggleButton: { alignItems: 'center', paddingVertical: 10 },
  toggleText: { fontSize: 14, fontFamily: 'Inter-Regular', color: 'rgba(200, 154, 91, 0.8)' },
});

export default LoginScreen;