import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';

// Import all modal components
import ErrorModal from './errorModal'; // The simple error modal
import SuccessModal from './successModal'; // The new success modal
import ConfirmModal from './confirmModal'; // The new confirmation modal

// Import the updated service initialization
import { initializeModalService } from '../services/modal-Service'; 

// Type for the function that runs if the user confirms the action.
type ConfirmationCallback = () => void | Promise<void>;


const RootWrapper = ({ children }: { children: React.ReactNode }) => {
  // --- modalService.showError ---
  const [isErrorVisible, setIsErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('Operation Failed');

  // --- modalService.showSuccess ---
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('Success!');

  // --- modalService.showConfirm ---
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmTitle, setConfirmTitle] = useState('');
  const [onConfirmAction, setOnConfirmAction] = useState<ConfirmationCallback | null>(null);
  const [confirmButtonText, setConfirmButtonText] = useState('Confirm');
  const [cancelButtonText, setCancelButtonText] = useState('Cancel');


  // --- 3. CORE HANDLERS ---

  const hideAllModals = useCallback(() => {
   setIsErrorVisible(false);
   setIsSuccessVisible(false); // NEW: Hide success modal
   setIsConfirmVisible(false);
   // Cleanup confirmation state
   setOnConfirmAction(null);
  }, []);

  // Handler for General Errors/Alerts (Maps to modalService.showError)
  const showError = useCallback((title: string, message: string) => {
   hideAllModals(); // Ensure no other modal is visible
   setErrorTitle(title);
   setErrorMessage(message);
   setIsErrorVisible(true);
  }, [hideAllModals]);

   // NEW: Handler for Success Messages (Maps to modalService.showSuccess)
  const showSuccess = useCallback((title: string, message: string) => { 
   hideAllModals(); // Ensure no other modal is visible
   setSuccessTitle(title);
   setSuccessMessage(message);
   setIsSuccessVisible(true);
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
     onConfirmAction(); // Execute the stored asynchronous logic
   }
  };


  // --- 4. INITIALIZATION ---

  useEffect(() => {
   initializeModalService({
     showError: showError, // Mapped to showError
     showSuccess: showSuccess, // NEW: Mapped to showSuccess
     showConfirm: showConfirmation,
     hide: hideAllModals,
   });
  }, [showError, showSuccess, showConfirmation, hideAllModals]);

  return (
   <View style={styles.container}>
   {children}
   
   {/* 1. ERROR MODAL */}
   <ErrorModal
      isVisible={isErrorVisible}
      title={errorTitle}
      message={errorMessage}
      onClose={hideAllModals} 
   />
      
   {/* 2. SUCCESS MODAL */}
   <SuccessModal
      isVisible={isSuccessVisible}
      title={successTitle}
      message={successMessage}
      onClose={hideAllModals} 
   />

   {/* 3. CONFIRMATION MODAL */}
   <ConfirmModal
      isVisible={isConfirmVisible}
      title={confirmTitle}
      message={confirmMessage}
      onConfirm={handleConfirmExecute} // Runs the stored logic and closes the modal
      onCancel={hideAllModals} // Just closes the modal
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