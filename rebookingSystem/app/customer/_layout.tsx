import React from 'react';
import { Stack } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import RootWrapper from '../modal/RootWrapper';

export default function AuthenticatedLayout() {
  return (
    <RootWrapper>
      <View style={{ flex: 1 }}>
        {/* Shared background so it doesn't remount between customer screens */}
        <LinearGradient
          colors={["#0D0D0D", "#1A1A1A", "#0D0D0D"]}
          style={StyleSheet.absoluteFill}
        />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: Platform.OS === 'android' ? 'fade' : 'fade',
            // Transparent so the shared gradient shows through
            contentStyle: {backgroundColor: 'transparent'},
          }}
        />
      </View>
    </RootWrapper>
  );
}