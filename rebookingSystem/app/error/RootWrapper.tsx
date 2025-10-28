import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { initializeModalService } from '../services/modal-Service'; // Adjust path
import ErrorModal from './errorModal'; // Adjust path

// A wrapper component that will live high in the authenticated tree
const RootWrapper = ({ children }: { children: React.ReactNode }) => {
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('Operation Failed');

  // Define show/hide functions
  const showModal = useCallback((message: string, title?: string) => {
    setModalTitle(title || 'Operation Failed');
    setModalMessage(message);
    setIsErrorModalVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setIsErrorModalVisible(false);
    setModalMessage('');
  }, []);

  // Initialize the global service only once
  useEffect(() => {
    initializeModalService({ show: showModal, hide: hideModal });
    // IMPORTANT: Return a cleanup function if necessary, though not strictly required here
  }, [showModal, hideModal]);

  return (
    <View style={styles.container}>
      {children}
      {/* The single instance of the ErrorModal, rendered over everything */}
      <ErrorModal
        isVisible={isErrorModalVisible}
        title={modalTitle}
        message={modalMessage}
        onClose={hideModal}
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