import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
// Assuming you are using a library for icons like 'react-native-vector-icons'
import { Ionicons } from '@react-native-vector-icons/ionicons';
// Assuming you have a LinearGradient component, replace with a simple View if not
// import LinearGradient from 'react-native-linear-gradient'; 

interface ErrorModalProps {
  isVisible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

const errorModal: React.FC<ErrorModalProps> = ({ 
  isVisible, 
  title = 'Operation Failed', // Default title for convenience
  message, 
  onClose 
}) => {
  return (
    <Modal
      animationType="fade" // Use 'fade' for error modals for urgency
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.errorModalContainer}>
        <View style={styles.errorModalContent}>
          
          <View style={styles.errorIconContainer}>
            {/* Red 'x' icon for error/failure */}
            <Ionicons name="close-circle-outline" size={32} color="#EF4444" />
          </View>

          <Text style={styles.errorTitle}>{title}</Text>
          <Text style={styles.errorMessage}>{message}</Text>
          
          <TouchableOpacity 
            style={styles.errorButton} 
            onPress={onClose}
            activeOpacity={0.8}
          >
            {/* Replace with LinearGradient if available */}
            <View style={styles.errorButtonGradient}> 
              <Text style={styles.errorButtonText}>
                Dismiss
              </Text>
            </View>
          </TouchableOpacity>
        
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // --- Error Modal Styles (Based on your style guide) ---
  errorModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Dark semi-transparent overlay
  },
  errorModalContent: {
    width: '85%', // Slightly wider than the 80% from the previous example for better message display
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent dark background
    borderWidth: 1,
    borderColor: '#ef4444cc', // Red border for error
    padding: 30,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
  },
  errorIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.15)', // Light red background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.6)', // Red ring
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#EF4444', // Red color for error title
    textShadowColor: 'rgba(239, 68, 68, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 25,
  },
  errorButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  errorButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    // Background color for the button (Red/Darker Red)
    backgroundColor: '#B91C1C', 
  },
  errorButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
});

export default errorModal;