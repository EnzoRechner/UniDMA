import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Minimal placeholder component to satisfy Expo Router's default export requirement.
// Your real Branch Settings UI can be wired here or route to the existing branch widget.
export default function BranchSettings() {
	return (
		<View style={styles.container}>
			<Text style={styles.text}>Branch Settings</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D0D0D' },
	text: { color: '#fff' },
});

