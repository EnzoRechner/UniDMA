// This file contains constants and types used across the booking system application.
// It helps maintain consistency and avoid magic numbers/strings in the codebase.
export const STATUS_MAP: { [key: number]: string } = {
  0: 'pending',
  1: 'confirmed',
  2: 'rejected',
  3: 'cancelled',
  4: 'completed',
  5: 'all', // loyalty program status
};

// This is the mapping of status strings to numerical codes for easier comparison and storage.
export const STATUS_CODES = {
    pending: 0,
    confirmed: 1,
    rejected: 2,
    completed: 3,
    cancelled: 4, 
}