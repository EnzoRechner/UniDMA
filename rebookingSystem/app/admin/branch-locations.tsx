import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from "react-native";
import BranchTilesScreen from "./branch-tabs-widget";


// --- Main Screen ---
export default function BranchListScreen() {
  return (
    
    BranchTilesScreen()
    
    /*<View style={styles.container}>
      <Text style={styles.header}>Branch Locations</Text>
      <FlatList
        data={DATA}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BranchTile item={item} />}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      />
    </View>*/
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(20, 20, 20, 1)",
  },
  header: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 40,
    marginBottom: 32,
    textAlign: "center",
  },
  tileGrid: {
    justifyContent: "space-between",
    marginBottom: 16,
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
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  tileDescription: {
    color: "#e0e0e0",
    fontSize: 14,
    textAlign: "center",
  },
});
