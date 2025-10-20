import { useQuery, useQueryClient, QueryFunctionContext, UseQueryOptions } from '@tanstack/react-query';
import { onSnapshotStaffBookings } from './staff-service'; // Assuming this service exists
import { ReservationDetails } from '../lib/types'; // Assuming this type exists

interface ReservationListResult extends Array<ReservationDetails> {}

type StaffBookingsOptions = Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>;

// Define a type for the query keys
type BookingStatus = 0 | 1 | 2;
const getBookingQueryKey = (status: BookingStatus) => {
    switch (status) {
        case 0: return 'pendingBookings';
        case 1: return 'confirmedBookings';
        case 2: return 'cancelledBookings';
        default: throw new Error('Invalid booking status');
    }
};

/**
 * Custom React Query hook to listen for real-time staff bookings.
 * It uses Firestore's onSnapshot for real-time updates and caches the result.
 * @param staffId The ID of the staff member to fetch bookings for.
 * @param status The booking status to filter by (0: Pending, 1: Confirmed, 2: Cancelled).
 */
export const useStaffBookings = (staffId: string | null, status: BookingStatus, options?: StaffBookingsOptions) => {
    const queryClient = useQueryClient();    
    const queryKey = [getBookingQueryKey(status), staffId];

    return useQuery<ReservationListResult, Error>({
        queryKey: ['staffBookings', staffId, status],
        enabled: !!staffId,
        // staleTime: Infinity,
        initialData: staffId ? [] : undefined,

        queryFn: ({ signal }: QueryFunctionContext) => {
            // Query to use the data from cache if available
            return new Promise<ReservationListResult>((resolve) => {
                
                let unsubscribe: () => void;
                
                const callback = (newReservations: ReservationListResult) => {
                    queryClient.setQueryData(queryKey, newReservations);
                    if (newReservations) {
                        resolve(newReservations);
                    }
                };

                // Start the real-time listener
                unsubscribe = onSnapshotStaffBookings(staffId!, status, callback);

                // React Query's way to cleanup: Listen for the signal and clean up.
                if (signal) {
                    signal.onabort = () => {
                        console.log(`React Query Cleanup: Aborting/Unsubscribing listener for status ${status}.`);
                        unsubscribe();
                    };
                }
            });
        },
        ...options,
    });
};

// Export the keys for use in other files if needed (e.g., for invalidating)
export const BOOKING_QUERY_KEYS = {
    PENDING: getBookingQueryKey(0),
    CONFIRMED: getBookingQueryKey(1),
    CANCELLED: getBookingQueryKey(2),
};