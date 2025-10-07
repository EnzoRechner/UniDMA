import React from "react";
import { View, Text, StyleSheet, Pressable, Alert, FlatList } from "react-native";

// --- Sample Data ---
const DATA = [
  { id: "1", title: "Apples", description: "Fresh and juicy red apples." },
  { id: "2", title: "Bananas", description: "Sweet ripe bananas." },
  { id: "3", title: "Oranges", description: "Citrus fruit full of vitamin C." },
  { id: "4", title: "Grapes", description: "Fresh grapes for snacking." },
  { id: "5", title: "Pineapple", description: "Tropical pineapple." },
  { id: "6", title: "Strawberries", description: "Sweet and fresh strawberries." },
];

// --- Tile Component ---
const FruitTile = ({ item }: { item: typeof DATA[0] }) => (
  <Pressable
    style={({ pressed }) => [
      styles.tile,
      { opacity: pressed ? 0.7 : 1, transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }] },
    ]}
    onPress={() => Alert.alert("Pressed!", `You pressed: ${item.title}`)}
  >
    <Text style={styles.tileTitle}>{item.title}</Text>
    <Text style={styles.tileDescription}>{item.description}</Text>
  </Pressable>
);

// --- Main Screen ---
export default function FruitTilesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Fruit Tiles</Text>
      <FlatList
        data={DATA}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FruitTile item={item} />}
        numColumns={2}
        columnWrapperStyle={styles.tileGrid}
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
    backgroundColor: "rgba(46, 46, 46, 1)",
    borderRadius: 12,
    paddingVertical: 40,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: "48%",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
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
