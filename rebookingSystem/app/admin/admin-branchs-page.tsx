// admin-branchs-page.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal,
  Switch,
} from "react-native";
import { collection, getDocs, updateDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase-initilisation";
import { BlurView } from "expo-blur";
import { addBranch } from "../services/admin-service";
import {UserProfile} from "../lib/types";
import { updateBranch } from "../services/admin-service";
// --- Firestore Type ---


export interface BranchDetails {
  id: number;
  Coord: GeolocationCoordinates;
  address: string;
  capacity: number;
  name: string;
  open: boolean;
  restaurant: string;
}

interface BranchWidgetProps {
  userProfile: UserProfile;
  open?: boolean;
  onConfirm: () => void;
}

const BranchWidget: React.FC<BranchWidgetProps> = ({ open, userProfile, onConfirm }) => {
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Branch form fields
  const [branchCoord, setBranchCoord] = useState<GeolocationCoordinates | null>(null);
  const [branchAddress, setBranchAddress] = useState("");
  const [branchCapacity, setBranchCapacity] = useState(0);
  const [branchName, setBranchName] = useState("");
  const [branchOpen, setBranchOpen] = useState(false);
  const [branchRestaurant, setBranchRestaurant] = useState("");

  // ---------------------------
  // Updated handleAddBranch
  // ---------------------------
  const handleAddBranch = async () => {
  if (
    !userProfile?.userId||
    !branchName ||
    !branchAddress ||
    !branchRestaurant ||
    !branchCoord
  ) {
    Alert.alert(
      "Missing Info",
      "Please fill in all required fields including coordinates."
    );
    return;
  }

  setLoading(true);
  try {
    // Fetch existing branches to determine next branch number
    const snapshot = await getDocs(collection(db, "Branch"));
    const branchNumber = snapshot.size + 1; // e.g., 1, 2, 3
    const branchCode = branchNumber.toString(); // numeric branch code

    const newBranch: Omit<BranchDetails, "id"> & { branchCode: string } = {
      Coord: branchCoord, // now using actual coordinates
      address: branchAddress,
      capacity: branchCapacity,
      name: branchName,
      open: branchOpen, // now using the open status from modal
      restaurant: branchRestaurant,
      branchCode,
    };

    await addBranch(newBranch);
    Alert.alert("✅ Success", `Branch #${branchCode} added successfully!`);

    // Close modal and reset form
    setShowPopup(false);
    setBranchAddress("");
    setBranchCapacity(0);
    setBranchName("");
    setBranchRestaurant("");
    setBranchCoord(null);
    setBranchOpen(false);

    // Reload updated list
    loadBranches();
  } catch (error) {
    console.error("Error adding branch:", error);
    Alert.alert("Error", "Failed to add new branch.");
  } finally {
    setLoading(false);
  }
};

  
  useEffect(() => {
    const branchRef = collection(db, "Branch");

    // real-time listener
    const unsubscribe = onSnapshot(branchRef, (snapshot) => {
      const branchList: BranchDetails[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as BranchDetails[];

      setBranches(branchList);
      setLoading(false);
    });

    // cleanup when component unmounts
    return () => unsubscribe();
  }, []);

  // loadBranches function
  
  const loadBranches = async () => {
    try {
      const snapshot = await getDocs(collection(db, "Branch"));
      const branchList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as BranchDetails[];
      setBranches(branchList);
    } catch (err) {
      console.error("Error loading branches:", err);
      Alert.alert("Error", "Could not load branches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleUpdateBranch = async () => {
    if (!selectedBranch) return;

  try {
    const ref = doc(db, "Branch", selectedBranch.id);
    await updateDoc(ref, {
      name: branchName,
      address: branchAddress,
      capacity: branchCapacity,
      restaurant: branchRestaurant,
      open: branchOpen,
      Coord: branchCoord,
    });

    console.log("Branch updated successfully");
    setShowPopup(false);
    setSelectedBranch(null);
  } catch (error) {
    console.error("Error updating branch:", error);
  }
};



  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.widgetContainer,
        { opacity: open ? 1 : 0.7, transform: [{ scale: open ? 1 : 0.95 }] },
      ]}
    >
      <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
        <FlatList
          data={branches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.tile,
                {
                  opacity: pressed ? 0.7 : 1,
                  transform: pressed ? [{ scale: 0.97 }] : [{ scale: 1 }],
                },
              ]}
              //onPress={() => Alert.alert("Branch Selected", item.name)}
              onPress={() => {
                setSelectedBranch(item);
                setBranchName(item.name);
                setBranchAddress(item.address);
                setBranchCapacity(item.capacity);
                setBranchRestaurant(item.restaurant);
                setBranchOpen(item.open);
                setBranchCoord(item.Coord || null);
                setIsEditing(true);
                setShowPopup(true);
              }}
            >
              <Text style={styles.tileTitle}>{item.name}</Text>
              <Text style={styles.tileDescription}>{item.address}</Text>
              <Text style={styles.tileStatus}>
                Status: {item.open ? "🟢 Open" : "🔴 Closed"}
              </Text>
            </Pressable>
          )}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Add Branch Button */}
        <View>
          <TouchableOpacity
              style={styles.button}
              onPress={() => {
                // Reset fields before adding a new branch
                setBranchName("");
                setBranchAddress("");
                setBranchCapacity(0);
                setBranchRestaurant("");
                setBranchOpen(false);
                setBranchCoord(null);
                setSelectedBranch(null);
                setIsEditing(false);
                setShowPopup(true);
              }}
            >
              <Text style={styles.tileTitle}>Add Branch</Text>
          </TouchableOpacity>
        </View>

        {/* Blurred Popup Form */}
        <Modal
        transparent
        visible={showPopup}
        animationType="fade"
        onRequestClose={() => setShowPopup(false)}
      >
        <BlurView intensity={50} tint="dark" style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {isEditing ? "Edit Branch" : "Add New Branch"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Branch Name"
              placeholderTextColor="#aaa"
              value={branchName}
              onChangeText={setBranchName}
            />
            <TextInput
              style={styles.input}
              placeholder="Address"
              placeholderTextColor="#aaa"
              value={branchAddress}
              onChangeText={setBranchAddress}
            />
            <TextInput
              style={styles.input}
              placeholder="Capacity"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
              value={branchCapacity ? branchCapacity.toString() : ""}
              onChangeText={(t) => setBranchCapacity(Number(t))}
            />
            <TextInput
              style={styles.input}
              placeholder="Restaurant Name"
              placeholderTextColor="#aaa"
              value={branchRestaurant}
              onChangeText={setBranchRestaurant}
            />

            {/* Open Status Switch */}
            <View style={{ marginBottom: 10 }}>
        <Text style={{ color: "white", marginBottom: 5 }}>Open Status:</Text>
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity
            style={{
              flex: 1,
              padding: 10,
              backgroundColor: branchOpen ? "#C89A5B" : "rgba(255,255,255,0.1)",
              borderRadius: 8,
              marginRight: 5,
              alignItems: "center",
            }}
            onPress={() => setBranchOpen(true)}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>True</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 1,
              padding: 10,
              backgroundColor: !branchOpen ? "#C89A5B" : "rgba(255,255,255,0.1)",
              borderRadius: 8,
              marginLeft: 5,
              alignItems: "center",
            }}
            onPress={() => setBranchOpen(false)}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>False</Text>
          </TouchableOpacity>
        </View>
      </View>

                {/* Coordinates Inputs */}
                <TextInput
            style={styles.input}
            placeholder="Coordinates (lat, lng)"
            placeholderTextColor="#aaa"
            value={
              branchCoord ? `${branchCoord.latitude}, ${branchCoord.longitude}` : ""
            }
            onChangeText={(t) => {
              const parts = t.split(",").map((p) => parseFloat(p.trim()));
              if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                setBranchCoord({
                  latitude: parts[0],
                  longitude: parts[1],
                } as GeolocationCoordinates);
              } else {
                setBranchCoord(null); // invalid input
              }
            }}
          />

      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: "#C89A5B" }]}
          onPress={isEditing ? handleUpdateBranch : handleAddBranch}
        >
          <Text style={styles.modalButtonText}>Confirm</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, { backgroundColor: "rgba(255,255,255,0.1)" }]}
          onPress={() => setShowPopup(false)}
        >
          <Text style={styles.modalButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </BlurView>
  </BlurView>
</Modal>

      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  widgetContainer: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(200, 154, 91, 0.4)",
    minHeight: 700,
  },
  cardBlur: { flex: 1 },
  button: {
    alignItems: "center",
    backgroundColor: "rgba(200,154,91,0.2)",
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderColor: "rgba(200,154,91,0.5)",
    borderWidth: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(20, 20, 20, 1)",
  },
  tile: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "rgba(200,154,91,0.3)",
    paddingVertical: 40,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: "100%",
    shadowColor: "#C89A5B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 8,
  },
  tileTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "rgba(255,255,255,1)",
  },
  tileDescription: {
    color: "rgba(255,255,255,1)",
    marginTop: 4,
  },
  tileStatus: {
    marginTop: 8,
    fontWeight: "600",
    color: "#999999",
  },

  // Blurred Popup Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "85%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(200,154,91,0.5)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(200,154,91,0.5)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    color: "white",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default BranchWidget;
