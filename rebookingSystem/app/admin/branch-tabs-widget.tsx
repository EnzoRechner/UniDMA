import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert, FlatList, ActivityIndicator } from "react-native";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
  collection,
} from 'firebase/firestore';

import { db } from '../services/firebase-initilisation';
import { fetchBranches } from "../services/admin-service"; 

// --- Firestore Type ---
export interface BranchDetails {
    id: string; // BranchId;
    Coord: GeolocationCoordinates; 
    address: string;
    capacity: number;
    name: string;
    open: boolean;
    restaurant: string;
}

// --- Tile Component ---
const BranchTile = ({ item }: { item: BranchDetails }) => (
  <Pressable
    style={({ pressed }) => [
      styles.tile,
      { opacity: pressed ? 0.7 : 1, transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }] },
    ]}
    onPress={() => Alert.alert("Branch Selected", `You pressed: ${item.name}`)}
  >
    <Text style={styles.tileTitle}>{item.name}</Text>
    <Text style={styles.tileDescription}>{item.address}</Text>
    <Text style={styles.tileStatus}>
      Status: {item.open ? "🟢 Open" : "🔴 Closed"}
    </Text>
  </Pressable>
);

// --- Main Screen ---
export default function BranchTilesScreen() {
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await fetchBranches();
        setBranches(data);
      } catch (error) {
        console.error("Failed to load branches:", error);
      } finally {
        setLoading(false);
      }
    };
        loadBranches();
  }, []);
  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Branch Settings</Text>
      <FlatList
        data={branches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BranchTile item={item} />}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 40,
    marginBottom: 32,
    textAlign: "center",
  },
  tile: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(200, 154, 91, 0.3)',
    paddingVertical: 40,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: "100%",
    
    
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 8,
  },
  tileTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  tileDescription: {
    color: "#6B7280",
    marginTop: 4,
  },
  tileStatus: {
    marginTop: 8,
    fontWeight: "600",
    color: "#374151",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  
});
