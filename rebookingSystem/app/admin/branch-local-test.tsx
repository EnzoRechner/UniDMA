// branch-local-test.tsx
import React, {useState,useEffect } from 'react';
import { View, Text, StyleSheet, Alert, } from "react-native";
import BranchWidget from "./admin-branches-page"; 
import { useRouter } from 'expo-router';
import { fetchUserData} from '../services/customer-service';
import { UserProfile } from '../lib/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
        Alert.alert('Error', error.message);
        await AsyncStorage.removeItem('userId');
        router.replace('/auth/auth-login');
      }
    };
    
    loadData();
  }, []);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Loading...</Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <Text style={styles.header}>Branch Locations</Text>
      
      <BranchWidget />

    </View>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(20,20,20,1)",
  },
  header: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 40,
    marginBottom: 16,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#ccc",
  },
});

export default BranchListScreen;