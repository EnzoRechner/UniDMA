import { BookingTable } from '@/app/BookingTable';
import { db } from '@/config/initialiseFirebase';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';

interface Booking {
  title: string;
  dateOfArrival: string;
  seats: number;
  message: string;
  status: string;
}

export function BookingTableContainer() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    async function fetchBookings() {
      try {
        // Adjust collection name if needed
        const q = query(collection(db, 'Booking'), orderBy('dateOfArrival', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        const data: Booking[] = querySnapshot.docs.map(doc => {
          const d = doc.data();
          return {
            title: doc.id,
            dateOfArrival: d.dateOfArrival?.toDate ? d.dateOfArrival.toDate().toLocaleString() : String(d.dateOfArrival),
            seats: d.seats,
            message: d.message,
            status: d.status,
          };
        });
        setBookings(data);
      } catch (e) {
  console.error('Error fetching bookings:', e);
      }
    }
    fetchBookings();
  }, []);

  return <BookingTable bookings={bookings} />;
}
