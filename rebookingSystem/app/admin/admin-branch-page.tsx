// branch-local-test.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Undo2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { UserProfile } from '../lib/types';
import { fetchUserData } from '../services/customer-service';
import BranchWidget from "./admin-branches-widget";
import { modalService } from '../services/modal-Service';

const BranchListScreen = () =>{

  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  //const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      //setLoading(true);
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
          router.replace('/auth/auth-login');
          return;
        }
        // Fetch user data from 'rebooking-accounts'
        const userData = await fetchUserData(userId);
        if (!userData) throw new Error('Could not find user profile.');
        setUser(userData);
        
      } catch (error: any) {
        modalService.showError('Error', error.message);
        await AsyncStorage.removeItem('userId');
        router.replace('/auth/auth-login');
      }
    };
    
    loadData();
  }, [router]);

  const handleBack = () => {
    router.back();
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Branch Locations</Text>
        <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
          <Undo2 size={22} color="#C89A5B" />
        </TouchableOpacity>
      </View>

      <BranchWidget />

    </View>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
  },
  iconButton: {
    padding: 5,
  },
  loadingText: {
    fontSize: 18,
    color: "#ccc",
    textAlign: 'center',
    marginTop: 60,
  },
  subtitle: {
    fontSize: 18,
    color: "#ccc",
  },
});

export default BranchListScreen;