
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase'; // Client SDK for Firestore
import { admin } from '@/lib/firebase-admin'; // Admin SDK
import { ADMIN_UID } from '@/config/admin'; // Admin UID
import { collection, getDocs, setDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import type { Booking } from '@/types';
import { hasConflict as checkConflictUtil } from '@/lib/bookings-utils';

async function verifyAdmin(request: NextRequest): Promise<string | null> {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null; // No token
  }
  const idToken = authorization.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.uid === ADMIN_UID) {
      return decodedToken.uid; // User is admin
    }
    return null; // User is not admin
  } catch (error) {
    console.error("Error verifying token:", error);
    return null; // Token verification failed
  }
}

// GET all bookings (remains public or auth-gated as per general app requirements, not admin-only for viewing)
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

// POST a new booking or update an existing one (Admin Only)
export async function POST(request: NextRequest) {
  const adminUid = await verifyAdmin(request);
  if (!adminUid) {
    return NextResponse.json({ message: 'Unauthorized. Admin access required.' }, { status: 403 });
  }

  try {
    const newBooking: Booking = await request.json();

    if (!newBooking.id || !newBooking.venue || !newBooking.title || !newBooking.start || !newBooking.end) {
      return NextResponse.json({ message: 'Invalid booking data provided.' }, { status: 400 });
    }

    // Server-side conflict check (using client SDK for Firestore, as before)
    const venueBookingsQuery = query(collection(db, "bookings"), where("venue", "==", newBooking.venue));
    const venueBookingsSnapshot = await getDocs(venueBookingsQuery);
    const existingVenueBookings: Booking[] = [];
    venueBookingsSnapshot.forEach(doc => {
      if (doc.id !== newBooking.id) {
        existingVenueBookings.push({ id: doc.id, ...doc.data() } as Booking);
      }
    });
    
    if (checkConflictUtil(newBooking, existingVenueBookings)) {
      return NextResponse.json({ message: 'Booking conflict detected.' }, { status: 409 });
    }

    const bookingRef = doc(db, 'bookings', newBooking.id);
    const { id, ...bookingData } = newBooking;
    await setDoc(bookingRef, bookingData); 

    return NextResponse.json(newBooking, { status: 201 });

  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json({ message: 'Error processing booking with Firestore' }, { status: 500 });
  }
}

// DELETE a booking (Admin Only)
export async function DELETE(request: NextRequest) {
  const adminUid = await verifyAdmin(request);
  if (!adminUid) {
    return NextResponse.json({ message: 'Unauthorized. Admin access required.' }, { status: 403 });
  }

  try {
    const { bookingId } = await request.json();

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
