
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, setDoc, deleteDoc, doc, query, where, writeBatch } from 'firebase/firestore';
import type { Booking } from '@/types';
import { hasConflict as checkConflictUtil } from '@/lib/bookings-utils';

// GET all bookings
export async function GET() {
  try {
    const bookingsCol = collection(db, 'bookings');
    const bookingSnapshot = await getDocs(bookingsCol);
    const bookingsList: Booking[] = bookingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<Booking, 'id'>),
    }));
    return NextResponse.json(bookingsList);
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json({ message: 'Error loading bookings from Firestore' }, { status: 500 });
  }
}

// POST a new booking or update an existing one
export async function POST(request: NextRequest) {
  try {
    const newBooking: Booking = await request.json();

    if (!newBooking.id || !newBooking.venue || !newBooking.title || !newBooking.start || !newBooking.end) {
      return NextResponse.json({ message: 'Invalid booking data provided.' }, { status: 400 });
    }

    // Server-side conflict check
    const venueBookingsQuery = query(collection(db, "bookings"), where("venue", "==", newBooking.venue));
    const venueBookingsSnapshot = await getDocs(venueBookingsQuery);
    const existingVenueBookings: Booking[] = [];
    venueBookingsSnapshot.forEach(doc => {
      // Exclude the current booking if we are updating it
      if (doc.id !== newBooking.id) {
        existingVenueBookings.push({ id: doc.id, ...doc.data() } as Booking);
      }
    });
    
    if (checkConflictUtil(newBooking, existingVenueBookings)) {
      return NextResponse.json({ message: 'Booking conflict detected.' }, { status: 409 });
    }

    // Firestore document ID will be newBooking.id
    const bookingRef = doc(db, 'bookings', newBooking.id);
    // The data to set should not include the id itself if it's the doc id.
    const { id, ...bookingData } = newBooking;
    await setDoc(bookingRef, bookingData); 

    return NextResponse.json(newBooking, { status: 201 }); // Return the full booking object

  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json({ message: 'Error processing booking with Firestore' }, { status: 500 });
  }
}

// DELETE a booking
export async function DELETE(request: NextRequest) {
  try {
    const { bookingId } = await request.json(); // venueName is not strictly needed if bookingId is unique

    if (!bookingId) {
      return NextResponse.json({ message: 'Booking ID is required.' }, { status: 400 });
    }

    const bookingRef = doc(db, 'bookings', bookingId);
    await deleteDoc(bookingRef);

    return NextResponse.json({ message: 'Booking deleted successfully from Firestore.' }, { status: 200 });

  } catch (error) {
    console.error("DELETE /api/bookings error:", error);
    return NextResponse.json({ message: 'Error deleting booking from Firestore' }, { status: 500 });
  }
}
