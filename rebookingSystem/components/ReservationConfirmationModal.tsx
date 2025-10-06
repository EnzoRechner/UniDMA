import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, Users, MapPin, MessageSquare, X, CheckCircle } from 'lucide-react-native';
import { ReservationDetails } from '@/utils/firestore';

interface ReservationConfirmationModalProps {
  isVisible: boolean;
  reservation: ReservationDetails | null;
  onClose: () => void;
  onConfirm: (reservation: ReservationDetails) => Promise<void>;
}

export default function ReservationConfirmationModal({
  isVisible,
  reservation,
  onClose,
  onConfirm,
}: ReservationConfirmationModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!reservation) return;

    setLoading(true);
    try {
      await onConfirm(reservation);
    } catch (error) {
      console.error('Error confirming reservation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!reservation) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} tint="dark" style={styles.modalBlur}>
          <View style={styles.modalContainer}>
            <BlurView intensity={30} tint="dark" style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.headerIcon}>
                  <CheckCircle size={24} color="#C89A5B" />
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <X size={20} color="rgba(255, 255, 255, 0.8)" />
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text style={styles.modalTitle}>Confirm Reservation</Text>
              <Text style={styles.modalSubtitle}>
                Review your booking details before confirming
              </Text>

              {/* Reservation Details */}
              <View style={styles.detailsContainer}>
                <Text style={styles.reservationName}>{reservation.name}</Text>
                
                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIcon}>
                      <Calendar size={18} color="#C89A5B" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>{reservation.date}</Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailIcon}>
                      <Clock size={18} color="#C89A5B" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Time</Text>
                      <Text style={styles.detailValue}>{reservation.time}</Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailIcon}>
                      <Users size={18} color="#C89A5B" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Guests</Text>
                      <Text style={styles.detailValue}>{reservation.guests} people</Text>
                    </View>
                  </View>

                  <View style={styles.detailItem}>
                    <View style={styles.detailIcon}>
                      <MapPin size={18} color="#C89A5B" />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Location</Text>
                      <Text style={styles.detailValue}>{reservation.branch}</Text>
                    </View>
                  </View>
                </View>

                {/* Message */}
                {reservation.message && (
                  <View style={styles.messageContainer}>
                    <View style={styles.messageHeader}>
                      <MessageSquare size={16} color="#C89A5B" />
                      <Text style={styles.messageLabel}>Special Request</Text>
                    </View>
                    <Text style={styles.messageText}>{reservation.message}</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={handleConfirm}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#C89A5B', '#B8864A']}
                    style={styles.confirmButtonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <CheckCircle size={18} color="white" />
                        <Text style={styles.confirmButtonText}>Confirm Booking</Text>
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
    backgroundColor: 'rgba(200, 154, 91, 0.2)',
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
  },
  detailsContainer: {
    marginBottom: 24,
  },
  reservationName: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200, 154, 91, 0.3)',
  },
  detailsGrid: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(200, 154, 91, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(200, 154, 91, 0.8)',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'white',
  },
  messageContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(200, 154, 91, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 154, 91, 0.3)',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  messageLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#C89A5B',
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    fontStyle: 'italic',
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
  confirmButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#C89A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
});