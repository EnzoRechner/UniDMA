import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Minimal placeholder component to satisfy Expo Router's default export requirement.
// Replace with real settings UI as needed.
export default function AdminSettingsComponent() {
	return (
		<View style={styles.container}>
			<Text style={styles.text}>Admin Settings Component</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D0D0D' },
	text: { color: '#fff' },
});

