import React, { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

const UpdateLogin = () => {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');

  const handleUpdate = () => {
    if (!oldPass || !newPass) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    Alert.alert('Success', 'Password updated.');
  };

  return (
    <View className="flex-1 justify-center items-center bg-black px-6">
      <Text className="text-3xl text-white mb-8">Update Password</Text>

      <TextInput
        className="w-full h-12 rounded-xl px-4 mb-4 bg-neutral-900 text-white border border-neutral-700"
        placeholder="Old Password"
        placeholderTextColor="#666"
        secureTextEntry
        value={oldPass}
        onChangeText={setOldPass}
      />
      <TextInput
        className="w-full h-12 rounded-xl px-4 mb-6 bg-neutral-900 text-white border border-neutral-700"
        placeholder="New Password"
        placeholderTextColor="#666"
        secureTextEntry
        value={newPass}
        onChangeText={setNewPass}
      />

      <TouchableOpacity
        className="w-full rounded-2xl border border-blue-900 bg-blue-500/20 overflow-hidden"
        onPress={handleUpdate}
      >
        <View className="py-3 items-center bg-blue-700/40">
          <Text className="text-white text-lg font-bold tracking-wide">Update</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default UpdateLogin;
