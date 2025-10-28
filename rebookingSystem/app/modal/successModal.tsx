import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'; 
// import LinearGradient from 'react-native-linear-gradient'; 

interface SuccessModalProps {
  isVisible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

const successModal: React.FC<SuccessModalProps> = ({ 
  isVisible, 
  title = 'Success!', // Default title changed to Success
  message, 
  onClose 
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.successModalContainer}>
        <View style={styles.successModalContent}>
          
          <View style={styles.successIconContainer}>
            {/* Green checkmark icon for success */}
            <Ionicons name="checkmark-circle-outline" size={32} color="#10B981" />
          </View>

          <Text style={styles.successTitle}>{title}</Text>
          <Text style={styles.successMessage}>{message}</Text>
          
          <TouchableOpacity 
            style={styles.successButton} 
            onPress={onClose}
            activeOpacity={0.8}
          >
            {/* Replace with LinearGradient if available */}
            <View style={styles.successButtonGradient}> 
              <Text style={styles.successButtonText}>
                OK
              </Text>
            </View>
          </TouchableOpacity>
        
        </View>
      </View>
    </Modal>
  );
};

// --- Success Modal Styles (Adjusted to Green/Gold Theme) ---
// NOTE: These styles should be merged into your main global StyleSheet for consistency.
const styles = StyleSheet.create({
  successModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Dark semi-transparent overlay remains
  },
  successModalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent dark background remains
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.8)', // Green border for success
    padding: 30,
    alignItems: 'center',
    shadowColor: '#10B981', // Green shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
  },
  successIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.15)', // Light green background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.6)', // Green ring
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#10B981', // Green color for success title
    textShadowColor: 'rgba(16, 185, 129, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 25,
  },
  successButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#10B981', // Green shadow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  successButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    // Background color for the button (Green/Darker Green)
    backgroundColor: '#059669', 
  },
  successButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
});

export default successModal;