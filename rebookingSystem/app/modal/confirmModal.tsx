import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons'; 

interface ConfirmModalProps {
  isVisible: boolean;
  title: string;
  message: string;
  onConfirm: () => void; // The callback function passed from the screen
  onCancel: () => void;
  confirmText: string;
  cancelText: string;
}

const confirmModal: React.FC<ConfirmModalProps> = ({ 
  isVisible, title, message, onConfirm, onCancel, confirmText, cancelText
}) => {
  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onCancel}>
      <View style={confirmStyles.modalContainer}>
        <View style={confirmStyles.modalContent}>
          
          {/* Icon: Warning/Question mark, using the gold color */}
          <View style={confirmStyles.iconContainer}>
            <Ionicons name="alert-circle-outline" size={32} color="#C89A5B" />
          </View>

          <Text style={confirmStyles.title}>{title}</Text>
          <Text style={confirmStyles.message}>{message}</Text>
          
          <View style={confirmStyles.actionContainer}>
            {/* Cancel Button (Style: Secondary/Subtle) */}
            <TouchableOpacity 
              style={confirmStyles.cancelButton} 
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={confirmStyles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>

            {/* Confirm Button (Style: Primary/Destructive) */}
            <TouchableOpacity 
              style={confirmStyles.confirmButton} 
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={confirmStyles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        
        </View>
      </View>
    </Modal>
  );
};

// Styles derived from the established dark/gold aesthetic
const confirmStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.5)', 
    padding: 30,
    alignItems: 'center',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
  },
  iconContainer: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(200, 154, 91, 0.15)', 
    justifyContent: 'center', alignItems: 'center', marginBottom: 15,
    borderWidth: 2, borderColor: 'rgba(200, 154, 91, 0.4)',
  },
  title: {
    fontSize: 22, fontFamily: 'PlayfairDisplay-Bold', color: '#C89A5B',
    marginBottom: 8, textAlign: 'center',
  },
  message: {
    fontSize: 15, fontFamily: 'Inter-Regular', color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center', marginBottom: 25,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'transparent',
  },
  cancelText: {
    fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'rgba(255, 255, 255, 0.8)',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    // Using a destructive red color for the confirmation button (like the Alert.alert 'destructive' style)
    backgroundColor: '#DC2626', 
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  confirmText: {
    fontSize: 16, fontFamily: 'Inter-SemiBold', color: 'white',
  },
});

export default confirmModal;