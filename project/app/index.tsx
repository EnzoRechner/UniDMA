import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function Index() {
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (userProfile) {
          router.replace('/(tabs)');
        } else {
          // User exists but profile is incomplete, redirect to branch selection with user info
          router.replace({
            pathname: '/auth/branch-selection',
            params: { 
              email: user.email || '', 
              displayName: user.displayName || 'User' 
            }
          });
        }
      } else {
        router.replace('/auth');
      }
    }
  }, [user, userProfile, loading]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
        style={styles.background}
      />
      <ActivityIndicator size="large" color="#C89A5B" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});