import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, XCircle, X, MessageSquare } from 'lucide-react-native';
import { updateReservationStatus } from '@/utils/firestore';
import { ReservationDetails } from '@/lib/types';

interface AdminActionModalProps {
  isVisible: boolean;
  reservation: ReservationDetails | null;
  actionType: 1 | 2;
  onClose: () => void;
  onComplete: () => void;
}

export default function AdminActionModal({
  isVisible,
  reservation,
  actionType,
  onClose,
  onComplete,
}: AdminActionModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    if (!reservation?.id) return;

    if (actionType === 2 && !rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      const newStatus = actionType === 1 ? 1 : 2;
      const reason = actionType === 2 ? rejectionReason.trim() : undefined;
      
      await updateReservationStatus(reservation.id, newStatus, reason);
      
      Alert.alert(
        'Success',
        `Reservation has been ${actionType === 1 ? 'approved' : 'rejected'} successfully!`,
        [{ text: 'OK', onPress: () => {
          setRejectionReason('');
          onComplete();
        }}]
      );
    } catch (error) {
      console.error('Error updating reservation:', error);
      Alert.alert('Error', `Failed to ${actionType} reservation. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRejectionReason('');
    onClose();
  };

  if (!reservation) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} tint="dark" style={styles.modalBlur}>
          <View style={styles.modalContainer}>
            <BlurView intensity={30} tint="dark" style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={[
                  styles.headerIcon,
                  { backgroundColor: actionType === 1 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }
                ]}>
                  {actionType === 1 ? (
                    <CheckCircle size={24} color="#10B981" />
                  ) : (
                    <XCircle size={24} color="#EF4444" />
                  )}
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <X size={20} color="rgba(255, 255, 255, 0.8)" />
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text style={styles.modalTitle}>
                {actionType === 1 ? 'Approve Reservation' : 'Reject Reservation'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {actionType === 1 
                  ? 'Confirm this reservation for the customer'
                  : 'Provide a reason for rejecting this reservation'
                }
              </Text>

              {/* Reservation Summary */}
              <View style={styles.reservationSummary}>
                <Text style={styles.summaryTitle}>{reservation.bookingName}</Text>
                <Text style={styles.summaryDetails}>
                  {reservation.date} at {reservation.time} • {reservation.guests} guests
                </Text>
                <Text style={styles.summaryBranch}>{reservation.branch}</Text>
              </View>

              {/* Rejection Reason Input (only for reject action) */}
              {actionType === 2 && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Reason for Rejection</Text>
                  <BlurView intensity={15} tint="dark" style={styles.inputBlur}>
                    <MessageSquare size={16} color="#EF4444" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g., Fully booked, Kitchen closed, etc."
                      placeholderTextColor="#666666"
                      value={rejectionReason}
                      onChangeText={setRejectionReason}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </BlurView>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={handleClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleAction}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={actionType === 1 ? ['#10B981', '#059669'] : ['#EF4444', '#DC2626']}
                    style={styles.actionButtonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        {actionType === 1 ? (
                          <CheckCircle size={18} color="white" />
                        ) : (
                          <XCircle size={18} color="white" />
                        )}
                        <Text style={styles.actionButtonText}>
                          {actionType === 1 ? 'Approve' : 'Reject'}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.6)',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
  },
  modalContent: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay-Bold',
    color: '#C89A5B',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  reservationSummary: {
    padding: 16,
    backgroundColor: 'rgba(200, 154, 91, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.3)',
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
    marginBottom: 8,
  },
  summaryDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  summaryBranch: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#C89A5B',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginBottom: 8,
  },
  inputBlur: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingTop: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  inputIcon: {
    marginLeft: 12,
    marginTop: 2,
  },
  textInput: {
    flex: 1,
    minHeight: 80,
    paddingHorizontal: 12,
    paddingBottom: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'white',
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  actionButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
});