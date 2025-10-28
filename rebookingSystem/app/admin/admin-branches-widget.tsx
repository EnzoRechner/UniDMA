// admin-branchs-page.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
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
import { modalService } from '../services/modal-Service';
//import * as Location from 'expo-location';
import * as Location from 'expo-location';
// --- Firestore Type ---


export interface BranchDetails {
  id: number;
  Coord: GeolocationCoordinates;
  address: string;
  capacity: number;
  name: string;
  open: boolean;
  restaurant: number;
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
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  // Branch form fields
  const [branchCoord, setBranchCoord] = useState<GeolocationCoordinates | null>(null);
  const [branchAddress, setBranchAddress] = useState("");
  const [branchCapacity, setBranchCapacity] = useState(0);
  const [branchName, setBranchName] = useState("");
  const [branchOpen, setBranchOpen] = useState(false);
  const [branchRestaurant, setBranchRestaurant] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
        modalService.showError('Error', error.message);       
      }
    };
    
    loadData();
  }, []);

  // Function to get permission for location
    const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission denied');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      setBranchCoord({
        latitude: loc.coords.latitude,
       longitude: loc.coords.longitude,     
      });

      setErrorMsg(null);
    } catch (err) {
      modalService.showError('Location error:', 'cannot find the location');
      setErrorMsg('Error getting location');
    }
  };


  const handleAddBranch = async () => {
  if (
    !branchName ||
    !branchAddress ||
    !branchCoord
  ) {
    modalService.showError(
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
      branchCode,
    };

    await addBranch(newBranch);
    modalService.showSuccess("✅ Success", `Branch #${branchCode} added successfully!`);

    // Close modal and reset form
    setShowPopup(false);
    setBranchAddress("");
    setBranchCapacity(0);
    setBranchName("");
    setBranchRestaurant(0);
    setBranchCoord(null);
    setBranchOpen(false);

  } catch (error) {
    modalService.showError("Error", "Failed to add new branch.");
  } finally {
    setLoading(false);
  }
};

//This updates the branch list in real-time 
// when changes occur in Firestore they get displayed immediately
 
  useEffect(() => {
  if (!user) return; 

  let q;
  if (user.role === 2) {
    q = query(
      collection(db, "Branch"),
      where("branchCode", "==", user.branch)
    );
  } else{
    q = collection(db, "Branch"); // all branches
  } 

  setLoading(true);
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const branchList = snapshot.docs.map((doc) => ({
  id: doc.id,
  ...(doc.data() as Omit<BranchDetails, "id">),
}));

    setBranches(branchList);
    setLoading(false);
  });

  return () => unsubscribe();
}, [user]);


  

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
    modalService.showError("Branch Error: ", "Error updating branch:");
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
                setBranchRestaurant(user?.restaurant || 0);
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
              style={[styles.button, { backgroundColor: "#C89A5B" }]}
              onPress={() => {
                // empty fields before displaying modal
                setBranchName("");
                setBranchAddress("");
                setBranchCapacity(0);
                setBranchRestaurant(user?.restaurant || 0);
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
                  modalService.showError("Alert!", "You do not have permission to add branches");
                }               
                setUser(user);
              }}
            >
              <Text style={styles.buttonText}>Add Branch</Text>
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
              branchCoord ? `${branchCoord.latitude.toFixed(5)} , ${branchCoord.longitude.toFixed(5)}` : ""
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
          <View style={[styles.modalButtons]}>  
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: "#C89A5B"}]}  
             onPress={getLocation}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>Get Geolocation</Text>          
          </TouchableOpacity>

          {errorMsg && (
             <Text style={{ color: 'red', marginTop: 8 }}>{errorMsg}</Text>
          )}
          </View>
            
             
      <View style={[styles.modalButtons, { marginTop: 20 }]}>
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
  //Main Widget Container
  widgetContainer: {
  width: "100%",
  borderRadius: 20,
  padding: 25,
  borderWidth:2,
  borderColor: "rgba(200,154,91,0.7)",
  backgroundColor: "rgba(0,0,0,0.7)", // same as modal
  minHeight: 650,
  justifyContent: "space-between", // keeps button inside bottom of view
},

cardBlur: 
{ flex: 1 }, 
loaderContainer: 
{ flex: 1, 
  justifyContent: "center", 
  alignItems: "center", 
  backgroundColor: "rgba(20, 20, 20, 1)", 
},


contentContainer: {
  flex: 1,
}, // wrap your FlatList or tiles in this

tile: {
  width: "100%",
  backgroundColor: "rgba(0,0,0,0.7)",
  borderRadius: 20,
  borderWidth: 2,
  borderColor: "rgba(200,154,91,0.7)",
  paddingVertical: 20,
  paddingHorizontal: 16,
  marginBottom: 16,
},

tileTitle: {
  fontSize: 20,
  fontWeight: "bold",
  color: "white",
  textAlign: "center",
  marginBottom: 8,
},

tileDescription: {
  color: "white",
  fontSize: 14,
  textAlign: "center",
  marginBottom: 6,
},

tileStatus: {
  marginTop: 8,
  fontWeight: "600",
  color: "rgba(200,154,91,1)",
  textAlign: "center",
},

button: {
  alignItems: "center",
  backgroundColor: "rgba(200,154,91,0.2)",
  paddingVertical: 14,
  marginTop: 10,
  borderRadius: 10,
  borderColor: "rgba(200,154,91,0.7)",
  borderWidth: 1,
  alignSelf: "center",
  width: "90%", // keeps it centered and not full width
},

buttonText: {
  color: "white",
  fontWeight: "bold",
  fontSize: 18,
},

  // Modal View with blur background
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "85%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(200,154,91,0.7)",
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
    borderColor: "rgba(200,154,91,0.7)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    color: "white",
    backgroundColor: "rgba(0,0,0,0.7)",
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
