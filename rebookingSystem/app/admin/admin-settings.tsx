// import React, { useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
// } from 'react-native'; 
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { BlurView } from 'expo-blur';
// import { LinearGradient } from 'expo-linear-gradient';
// import { router } from 'expo-router';
// import { Shield, User, LogOut } from 'lucide-react-native';
// import { useAuth } from '@/contexts/AuthContext';

// export default function AdminSettingsScreen() {
//   const { isSuperAdmin, userProfile, logout } = useAuth();

//   useEffect(() => {
//     if (!isSuperAdmin) {
//       router.replace('/');
//     }
//   }, [isSuperAdmin]);

//   const handleLogout = async () => {
//     await logout();
//     router.replace('/auth');
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <LinearGradient
//         colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
//         style={styles.background}
//       />
//       <ScrollView style={styles.scrollView}>
//         <Text style={styles.title}>Settings</Text>

//         <BlurView intensity={120} tint="dark" style={styles.profileCard}>
//           <View style={styles.profileIconContainer}>
//             <Shield size={32} color="#C89A5B" />
//           </View>
//           <Text style={styles.profileTitle}>Super Administrator</Text>
//           <View style={styles.profileInfo}>
//             <User size={16} color="rgba(255, 255, 255, 0.6)" />
//             <Text style={styles.profileText}>{userProfile?.displayName}</Text>
//           </View>
//           <View style={styles.profileInfo}>
//             <Text style={styles.profileLabel}>Email:</Text>
//             <Text style={styles.profileText}>{userProfile?.email}</Text>
//           </View>
//         </BlurView>

//         <TouchableOpacity style={styles.logoutCard} onPress={handleLogout}>
//           <BlurView intensity={120} tint="dark" style={styles.logoutContent}>
//             <LogOut size={24} color="#EF4444" />
//             <Text style={styles.logoutText}>Logout</Text>
//           </BlurView>
//         </TouchableOpacity>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   background: {
//     position: 'absolute',
//     left: 0,
//     right: 0,
//     top: 0,
//     bottom: 0,
//   },
//   scrollView: {
//     flex: 1,
//     padding: 20,
//   },
//   title: {
//     fontSize: 28,
//     fontFamily: 'PlayfairDisplay-Bold',
//     color: '#C89A5B',
//     marginBottom: 20,
//   },
//   profileCard: {
//     borderRadius: 16,
//     overflow: 'hidden',
//     backgroundColor: 'rgba(0, 0, 0, 0.2)',
//     borderWidth: 1,
//     borderColor: 'rgba(200, 154, 91, 0.6)',
//     padding: 24,
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   profileIconContainer: {
//     width: 72,
//     height: 72,
//     borderRadius: 36,
//     backgroundColor: 'rgba(200, 154, 91, 0.2)',
//     borderWidth: 2,
//     borderColor: 'rgba(200, 154, 91, 0.4)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   profileTitle: {
//     fontSize: 20,
//     fontFamily: 'PlayfairDisplay-Bold',
//     color: '#C89A5B',
//     marginBottom: 16,
//   },
//   profileInfo: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     marginBottom: 8,
//   },
//   profileLabel: {
//     fontSize: 14,
//     fontFamily: 'Inter-Regular',
//     color: 'rgba(255, 255, 255, 0.6)',
//   },
//   profileText: {
//     fontSize: 14,
//     fontFamily: 'Inter-SemiBold',
//     color: 'white',
//   },
//   logoutCard: {
//     borderRadius: 16,
//     overflow: 'hidden',
//   },
//   logoutContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 12,
//     backgroundColor: 'rgba(239, 68, 68, 0.1)',
//     borderWidth: 1,
//     borderColor: 'rgba(239, 68, 68, 0.4)',
//     paddingVertical: 16,
//   },
//   logoutText: {
//     fontSize: 16,
//     fontFamily: 'Inter-SemiBold',
//     color: '#EF4444',
//   },
// });
