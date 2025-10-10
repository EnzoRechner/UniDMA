import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Shield,
  User,
  Search,
  MapPin,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Crown
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getAllUsers, updateUserRole } from '@/dataconnect/firestoreUsers';
import { router } from 'expo-router';
import { UserProfile } from '@/lib/types';

const branches = ['Paarl', 'Oude Westhof', 'Somerset West'];

export default function ManageAdminsScreen() {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [showBranchModal, setShowBranchModal] = useState(false);

  const isSuperAdmin = userProfile?.email === 'super@dienaguil.com';

  useEffect(() => {
    if (!isSuperAdmin) {
      Alert.alert('Access Denied', 'You do not have permission to access this screen');
      router.replace('/(admin)/reservations');
    } else {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await getAllUsers();
      setUsers(allUsers);
      setFilteredUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        u => u.email.toLowerCase().includes(query) ||
             u.nagName.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleMakeAdmin = (selectedUser: UserProfile) => {
    setSelectedUser(selectedUser);
    setSelectedBranch('');
    setShowBranchModal(true);
  };

  const confirmMakeAdmin = async () => {
    if (!selectedUser || !selectedBranch) {
      Alert.alert('Error', 'Please select a branch');
      return;
    }

    try {
      await updateUserRole(selectedUser.id!, 2, selectedBranch);
      Alert.alert('Success', `${selectedUser.nagName} is now an admin for ${selectedBranch}`);
      setShowBranchModal(false);
      setSelectedUser(null);
      setSelectedBranch('');
      await fetchUsers();
    } catch (error) {
      Alert.alert('Error', 'Failed to assign admin role');
    }
  };

  const handleRemoveAdmin = (selectedUser: UserProfile) => {
    Alert.alert(
      'Remove Admin',
      `Remove admin privileges from ${selectedUser.nagName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateUserRole(selectedUser.id!, 0);
              Alert.alert('Success', `${selectedUser.nagName} is now a regular user`);
              await fetchUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove admin role');
            }
          }
        }
      ]
    );
  };

  const renderUserCard = (userItem: UserProfile) => (
    <View key={userItem.id} style={styles.userCard}>
      <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
        <View style={styles.cardContent}>
          <View style={styles.userHeader}>
            <View style={styles.userIcon}>
              {userItem.role === 2 ? (
                <Shield size={20} color="#C89A5B" />
              ) : (
                <User size={20} color="rgba(255, 255, 255, 0.6)" />
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userItem.nagName}</Text>
              <Text style={styles.userEmail}>{userItem.email}</Text>
              {userItem.role === 2 && userItem.branch && (
                <View style={styles.branchBadge}>
                  <MapPin size={12} color="#C89A5B" />
                  <Text style={styles.branchText}>{formatBranchDisplay(userItem.branch)}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.actionButtons}>
            {userItem.role === 2 ? (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveAdmin(userItem)}
              >
                <XCircle size={16} color="#EF4444" />
                <Text style={styles.removeButtonText}>Remove Admin</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.makeAdminButton}
                onPress={() => handleMakeAdmin(userItem)}
              >
                <CheckCircle size={16} color="#10B981" />
                <Text style={styles.makeAdminButtonText}>Make Admin</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </BlurView>
    </View>
  );

  const formatBranchDisplay = (branchValue?: string) => {
    if (!branchValue) return '';
    // If branchValue contains spaces it's already a display name
    if (branchValue.includes(' ')) return branchValue;
    // Otherwise assume it's a slug like 'paarl' or 'oude-westhof' -> 'Oude Westhof'
    return branchValue.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  };

  const renderBranchModal = () => (
    <View style={styles.modalOverlay}>
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={() => setShowBranchModal(false)}
      />
      <View style={styles.modalContainer}>
        <BlurView intensity={120} tint="dark" style={styles.modalBlur}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Branch</Text>
            <Text style={styles.modalSubtitle}>
              Choose which branch {selectedUser?.nagName} will manage
            </Text>

            <View style={styles.branchOptions}>
              {branches.map((branch) => (
                <TouchableOpacity
                  key={branch}
                  style={[
                    styles.branchOption,
                    selectedBranch === branch && styles.branchOptionSelected
                  ]}
                  onPress={() => setSelectedBranch(branch)}
                >
                  <MapPin size={20} color={selectedBranch === branch ? '#C89A5B' : 'rgba(255, 255, 255, 0.6)'} />
                  <Text style={[
                    styles.branchOptionText,
                    selectedBranch === branch && styles.branchOptionTextSelected
                  ]}>
                    {branch}
                  </Text>
                  {selectedBranch === branch && (
                    <CheckCircle size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowBranchModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, !selectedBranch && styles.confirmButtonDisabled]}
                onPress={confirmMakeAdmin}
                disabled={!selectedBranch}
              >
                <LinearGradient
                  colors={selectedBranch ? ['#10B981', '#059669'] : ['#666666', '#555555']}
                  style={styles.confirmButtonGradient}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    </View>
  );

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
        style={styles.background}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <BlurView intensity={20} tint="dark" style={styles.backBlur}>
              <ArrowLeft size={20} color="#C89A5B" />
            </BlurView>
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.superAdminBadge}>
              <Crown size={16} color="#C89A5B" />
              <Text style={styles.superAdminText}>Super Admin</Text>
            </View>
            <Text style={styles.headerTitle}>Manage Admins</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <BlurView intensity={120} tint="dark" style={styles.searchBlur}>
            <Search size={20} color="#C89A5B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by email or name..."
              placeholderTextColor="#666666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </BlurView>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.filter(u => u.role === 2).length}</Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.filter(u => u.role === 0).length}</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        <ScrollView
          style={styles.usersList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.usersListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#C89A5B"
              colors={['#C89A5B']}
            />
          }
        >
          {filteredUsers.map(renderUserCard)}
        </ScrollView>

        {showBranchModal && renderBranchModal()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
  },
  backBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  superAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  superAdminText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(200, 154, 91, 0.8)',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
  },
  searchContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
  },
  searchBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'white',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  usersList: {
    flex: 1,
  },
  usersListContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  userCard: {
    marginBottom: 15,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
  },
  cardBlur: {
    flex: 1,
  },
  cardContent: {
    padding: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(200, 154, 91, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  branchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  branchText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#C89A5B',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  makeAdminButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.5)',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  makeAdminButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  removeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  removeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.8)',
  },
  modalBlur: {
    flex: 1,
  },
  modalContent: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
  },
  branchOptions: {
    gap: 12,
    marginBottom: 24,
  },
  branchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.3)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  branchOptionSelected: {
    borderColor: 'rgba(200, 154, 91, 0.8)',
    backgroundColor: 'rgba(200, 154, 91, 0.1)',
  },
  branchOptionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  branchOptionTextSelected: {
    color: '#C89A5B',
    fontFamily: 'Inter-SemiBold',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
});
