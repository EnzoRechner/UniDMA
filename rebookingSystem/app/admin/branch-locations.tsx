import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';

import type { Router } from 'expo-router';

type RouteType = Parameters<Router['push']>[0];



const BranchLocation = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Branch Settings</Text>
      <View >
        
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    marginTop: 40,
    marginBottom: 32,
    color: "#fff",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  tileText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 1.2,
    textAlign: "center",
  },
   tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tile: {
    backgroundColor: "rgba(60, 78, 185, 0.37)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 25,
    width: "48%", // 2 per row with spacing
    marginBottom: 16,
  },

 
});

export default BranchLocation;
