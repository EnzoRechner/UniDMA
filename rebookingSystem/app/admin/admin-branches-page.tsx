// admin-branchs-page.tsx
import React, { useCallback, useEffect, useState } from "react";
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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs, updateDoc, doc, onSnapshot, where, query } from "firebase/firestore";
import { db } from "../services/firebase-initilisation";
import { BlurView } from "expo-blur";
import { addBranch } from "../services/admin-service";
import {UserProfile} from "../lib/types";
import { fetchUserData} from '../services/customer-service';
import { RestaurantId } from "../lib/typesConst";
// --- Firestore Type ---


export interface BranchDetails {
  id: string;
  Coord: GeolocationCoordinates;
  address: string;
  capacity: number;
  name: string;
  open: boolean;
  restaurant: RestaurantId;
  pauseBookings: boolean;
}

interface BranchWidgetProps {
  userProfile: UserProfile;
  open?: boolean;
  onConfirm: () => void;
}

const BranchWidget: React.FC<BranchWidgetProps> = ({ open, onConfirm }) => {
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchDetails | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  // Branch form fields
  const [branchCoord, setBranchCoord] = useState<GeolocationCoordinates | null>(null);
  const [branchAddress, setBranchAddress] = useState("");
  const [branchCapacity, setBranchCapacity] = useState(0);
  const [branchName, setBranchName] = useState("");
  const [branchOpen, setBranchOpen] = useState(false);
  const [branchRestaurant, setBranchRestaurant] = useState<RestaurantId>(0 as RestaurantId);

  // ---------------------------
  // Updated handleAddBranch
  // ---------------------------

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
          
          return;
        }
        // Fetch user data from 'rebooking-accounts'
        const userData = await fetchUserData(userId);
        if (!userData) throw new Error('Could not find user profile.');
        setUser(userData);
      } catch (error: any) {
        Alert.alert('Error', error.message);       
      }
    };
    
    loadData();
  }, []);




  const handleAddBranch = async () => {
  if (
    !branchName ||
    !branchAddress ||
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
    const branchCode = branchNumber; // numeric branch code

    const newBranch: Omit<BranchDetails, "id"> & { branchCode: number } = {
      Coord: branchCoord, // now using actual coordinates
      address: branchAddress,
      capacity: branchCapacity,
      name: branchName,
      open: branchOpen, // now using the open status from modal
      restaurant: branchRestaurant,
      pauseBookings: false,
      branchCode,
    };

    await addBranch(newBranch);
    Alert.alert("✅ Success", `Branch #${branchCode} added successfully!`);

    // Close modal and reset form
    setShowPopup(false);
    setBranchAddress("");
    setBranchCapacity(0);
    setBranchName("");
    setBranchRestaurant(0);
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

//This updates the branch list in real-time 
// when changes occur in Firestore they get displayed immediately

  useEffect(() => {
    const branchRef = collection(db, "Branch");
    //real-time listener
    const unsubscribe = onSnapshot(branchRef, (snapshot) => {
      const branchList: BranchDetails[] = snapshot.docs.map((d) => {
        const data = d.data() as Omit<BranchDetails, 'id'>;
        return { id: d.id, ...data };
      });

      setBranches(branchList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // loadBranches function
  //Currently filter is accting weird if you open branch locations it will filter 
  // but if you go back and open again it shows all branches
  const loadBranches = useCallback(async () => {
    try {
      let snapshot: any = null;
      if (user?.role === 2) {
        const q = query(collection(db, "Branch"),
         where("branchCode", "==", user?.branch));
         snapshot = await getDocs(q);
      } else {
        snapshot = await getDocs(collection(db, "Branch"));
      }

      const branchList: BranchDetails[] = snapshot.docs.map((d: any) => {
        const data = d.data() as Omit<BranchDetails, 'id'>;
        return { id: d.id, ...data };
      });
      setBranches(branchList);
    } catch (err) {
      console.error("Error loading branches:", err);
      Alert.alert("Error", "Could not load branches");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const handleUpdateBranch = async () => {
    if (!selectedBranch) return;

  try {
    const ref = doc(db, "Branch", selectedBranch.id);
    await updateDoc(ref, {
      name: branchName,
      address: branchAddress,
      capacity: branchCapacity,     
      restaurant: user?.restaurant,
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
                setBranchRestaurant((user?.restaurant ?? 0) as RestaurantId);
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
                // empty fields before displaying modal
                setBranchName("");
                setBranchAddress("");
                setBranchCapacity(0);
                setBranchRestaurant((user?.restaurant ?? 0) as RestaurantId);
                setBranchOpen(false);
                setBranchCoord(null);
                setSelectedBranch(null);
                if (user?.role === 3){
                  setIsEditing(false);
                  setShowPopup(true);
                }
                else{
                  setIsEditing(true);
                  setShowPopup(false);
                  alert("You do not have permission to add branches");
                }               
                setUser(user);
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
