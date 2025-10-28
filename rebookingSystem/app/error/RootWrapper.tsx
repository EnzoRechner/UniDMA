import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

// Import both modal components
import ErrorModal from './errorModal'; // The simple error modal
import ConfirmModal from './confirmModal'; // The new confirmation modal

// Import the updated service initialization
import { initializeModalService } from '../services/modal-Service'; 

// Type for the function that runs if the user confirms the action.
type ConfirmationCallback = () => void | Promise<void>;


const RootWrapper = ({ children }: { children: React.ReactNode }) => {
  // --- 1. STATE FOR SIMPLE ERROR MODAL (Used by modalService.showError) ---
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTitle, setAlertTitle] = useState('Operation Failed');

  // --- 2. STATE FOR CONFIRMATION MODAL (Used by modalService.showConfirm) ---
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState<ConfirmationCallback | null>(null);
  const [confirmButtonText, setConfirmButtonText] = useState('Confirm');
  const [cancelButtonText, setCancelButtonText] = useState('Cancel');


  // --- 3. CORE HANDLERS ---

  const hideAllModals = useCallback(() => {
    setIsAlertVisible(false);
    setIsConfirmVisible(false);
    // Cleanup confirmation state
    setOnConfirmAction(null);
  }, []);

  const showAlert = useCallback((title: string, message: string) => {
    hideAllModals(); // Ensure no other modal is visible
    setAlertTitle(title);
    setAlertMessage(message);
    setIsAlertVisible(true);
  }, [hideAllModals]);

  const showConfirmation = useCallback(
    (
      title: string, 
      message: string, 
      confirmCallback: ConfirmationCallback, 
      confirmText: string = 'Confirm',
      cancelText: string = 'Cancel'
    ) => {
      hideAllModals(); // Ensure no other modal is visible
      setConfirmTitle(title);
      setConfirmMessage(message);
      setOnConfirmAction(() => confirmCallback); // Store the callback function
      setConfirmButtonText(confirmText);
      setCancelButtonText(cancelText);
      setIsConfirmVisible(true);
    },
    [hideAllModals]
  );
  
  // This is the function passed to the ConfirmModal's 'Yes' button
  const handleConfirmExecute = () => {
    hideAllModals(); // Close the modal immediately
    if (onConfirmAction) {
      onConfirmAction(); // Execute the stored asynchronous logic (like rejectBookingLogic)
    }
  };


  // --- 4. INITIALIZATION ---

  useEffect(() => {
    initializeModalService({
      show: showAlert,
      showConfirm: showConfirmation,
      hide: hideAllModals,
    });
  }, [showAlert, showConfirmation, hideAllModals]);

  return (
    <View style={styles.container}>
      {children}
      
      {/* 1. SIMPLE ERROR MODAL (Renders over everything) */}
      <ErrorModal
        isVisible={isAlertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={hideAllModals} // Can close both alert and confirm with this
      />

      {/* 2. CONFIRMATION MODAL (Renders over everything) */}
      <ConfirmModal
        isVisible={isConfirmVisible}
        title={confirmTitle}
        message={confirmMessage}
        onConfirm={handleConfirmExecute} // Runs the stored logic and closes the modal
        onCancel={hideAllModals}        // Just closes the modal
        confirmText={confirmButtonText}
        cancelText={cancelButtonText}
      />
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    }
});

export default RootWrapper;