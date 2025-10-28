// branch-local-test.tsx
import React, {useState,useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions,Alert, } from "react-native";
import BranchWidget from "./admin-branches-page"; 
import { useRouter } from 'expo-router';
import { fetchUserData} from '../services/customer-service';
import { UserProfile } from '../lib/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, onSnapshot } from "firebase/firestore";



const { width: windowWidth } = Dimensions.get('window');
const WIDGET_WIDTH = windowWidth * 0.9;
const WIDGET_SPACING = 20;
const SNAP_INTERVAL = WIDGET_WIDTH + WIDGET_SPACING;


const BranchListScreen = () =>{

  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
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
      

      {/* ✅ Render the Firestore widget */}
      <BranchWidget />

    </View>
    
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', paddingTop: 0},
    background: { position: 'absolute', left: 0, right: 0, top: 0, height: '0%' },
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