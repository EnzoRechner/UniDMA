import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, User, Lock, Eye, EyeOff, Scroll } from 'lucide-react-native';
import { useAuth } from '@/lib/AuthContext';
import { router } from 'expo-router';

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nagName, setNagName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp, signIn } = useAuth();

  const validatePassword = (password: string) => {
    const minLength = 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return 'Password must be at least 6 characters long';
    }
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!hasLowerCase) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!hasNumbers) {
      return 'Password must contain at least one number';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)';
    }
    return null;
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    
    if (strength <= 2) return { level: 'weak', color: '#EF4444' };
    if (strength <= 3) return { level: 'medium', color: '#F59E0B' };
    if (strength <= 4) return { level: 'strong', color: '#10B981' };
    return { level: 'very strong', color: '#059669' };
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isSignUp && !nagName.trim()) {
      Alert.alert('Error', 'Please enter your Nag Name');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (isSignUp) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        Alert.alert('Password Requirements', passwordError);
        return;
      }
    } else if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password, nagName.trim());
        // After successful signup, user will be redirected to branch selection
        router.replace({
          pathname: './auth/branch-selection',
          params: { email: email.trim(), displayName: nagName.trim() }
        });
      } else {
        await signIn(email.trim(), password);
        // User will be automatically redirected based on their profile status
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
        style={styles.background}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>

            {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <BlurView intensity={120} tint="dark" style={styles.logoBlur}>
                <Image
                  source={require('../../assets/images/icon.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </BlurView>
            </View>
            <Text style={styles.title}>Die Nag Uil</Text>
            <Text style={styles.subtitle}>Kroeg • Eetsaal</Text>
          </View>

          {/* Auth Form */}
          <BlurView intensity={120} tint="dark" style={styles.formContainer}>
            <View style={styles.form}>
              <Text style={styles.formTitle}>
                {isSignUp ? 'Join the Experience' : 'Welcome Back'}
              </Text>
              <Text style={styles.formSubtitle}>
                {isSignUp 
                  ? 'Create your account for exclusive reservations'
                  : 'Sign in to your Die Nag Uil account'
                }
              </Text>

              {/* Nag Name Input (Sign Up Only) */}
              {isSignUp && (
                <View style={styles.inputContainer}>
                  <BlurView intensity={120} tint="dark" style={styles.inputBlur}>
                    <User size={20} color="#C89A5B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Nag Name"
                      placeholderTextColor="#666666"
                      value={nagName}
                      onChangeText={setNagName}
                      autoCapitalize="words"
                    />
                  </BlurView>
                </View>
              )}

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <BlurView intensity={120} tint="dark" style={styles.inputBlur}>
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

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <BlurView intensity={120} tint="dark" style={styles.inputBlur}>
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
                  <TouchableOpacity 
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#666666" />
                    ) : (
                      <Eye size={20} color="#666666" />
                    )}
                  </TouchableOpacity>
                </BlurView>
                
                {/* Password Strength Indicator (Sign Up Only) */}
                {isSignUp && password.length > 0 && (
                  <View style={styles.passwordStrengthContainer}>
                    <View style={styles.passwordStrengthBar}>
                      <View 
                        style={[
                          styles.passwordStrengthFill,
                          { 
                            width: `${(getPasswordStrength(password).level === 'weak' ? 25 : 
                                    getPasswordStrength(password).level === 'medium' ? 50 : 
                                    getPasswordStrength(password).level === 'strong' ? 75 : 100)}%`,
                            backgroundColor: getPasswordStrength(password).color
                          }
                        ]}
                      />
                    </View>
                    <Text style={[styles.passwordStrengthText, { color: getPasswordStrength(password).color }]}>
                      {getPasswordStrength(password).level.charAt(0).toUpperCase() + getPasswordStrength(password).level.slice(1)}
                    </Text>
                  </View>
                )}
                
                {/* Password Requirements (Sign Up Only) */}
                {isSignUp && (
                  <View style={styles.passwordRequirements}>
                    <Text style={styles.requirementsTitle}>Password must contain:</Text>
                    <Text style={[styles.requirementItem, password.length >= 8 && styles.requirementMet]}>
                      • At least 8 characters
                    </Text>
                    <Text style={[styles.requirementItem, /[A-Z]/.test(password) && styles.requirementMet]}>
                      • One uppercase letter
                    </Text>
                    <Text style={[styles.requirementItem, /[a-z]/.test(password) && styles.requirementMet]}>
                      • One lowercase letter
                    </Text>
                    <Text style={[styles.requirementItem, /\d/.test(password) && styles.requirementMet]}>
                      • One number
                    </Text>
                    <Text style={[styles.requirementItem, /[!@#$%^&*(),.?":{}|<>]/.test(password) && styles.requirementMet]}>
                      • One special character
                    </Text>
                  </View>
                )}
              </View>

              {/* Auth Button */}
              <TouchableOpacity 
                style={styles.authButton}
                onPress={handleAuth}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#C89A5B', '#B8864A']}
                  style={styles.authButtonGradient}
                >
                  <Text style={styles.authButtonText}>
                    {loading 
                      ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
                      : (isSignUp ? 'Create Account' : 'Sign In')
                    }
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Toggle Auth Mode */}
              <TouchableOpacity 
                style={styles.toggleButton}
                onPress={() => setIsSignUp(!isSignUp)}
              >
                <Text style={styles.toggleText}>
                  {isSignUp 
                    ? 'Already have an account? Sign In' 
                    : "Don't have an account? Sign Up"
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>

          {/* Restaurant Info */}
          <BlurView intensity={120} tint="dark" style={styles.infoCard}>
            <View style={styles.form}>
              <Text style={styles.infoTitle}>About Die Nag Uil</Text>
              <Text style={styles.infoDescription}>
                Die Nag Uil is a premier kroeg and eetsaal offering an unforgettable dining and social experience. Join us to enjoy exquisite cuisine, crafted cocktails, and a vibrant atmosphere that captures the essence of community and celebration.
              </Text>
            </View>
          </BlurView>

        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: 50,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.8)',
    marginBottom: 10,
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
    marginBottom: 9,
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
  },
  formContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.8)',
    marginBottom: 30,
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },
  form: {
    padding: 30,
  },
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
  inputContainer: {
    marginBottom: 20,
  },
  inputBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.6)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    height: 56,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'white',
  },
  eyeIcon: {
    paddingRight: 16,
    paddingLeft: 8,
  },
  authButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  authButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  authButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(200, 154, 91, 0.8)',
  },
  passwordStrengthContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  passwordRequirements: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.3)',
  },
  requirementsTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#C89A5B',
    marginBottom: 6,
  },
  requirementItem: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 2,
  },
  requirementMet: {
    color: '#10B981',
  },
  infoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.8)',
    padding: 20,
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginBottom: 10,
    textAlign: 'center',
  },
  infoDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },
});