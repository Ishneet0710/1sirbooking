import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { admin } from '@/lib/firebase-admin';
import { ADMIN_UIDS } from '@/config/admin';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import type { BookingAttempt } from '@/types';

async function verifyUser(request: NextRequest): Promise<{ uid: string; isAdmin: boolean } | null> {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authorization.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const isAdmin = ADMIN_UIDS.includes(decodedToken.uid);
    return { uid: decodedToken.uid, isAdmin };
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// GET all booking attempts (Admin only)
export async function GET(request: NextRequest) {
  const userInfo = await verifyUser(request);
  if (!userInfo?.isAdmin) {
    return NextResponse.json({ message: 'Unauthorized. Admin access required.' }, { status: 403 });
  }

  try {
    const attemptsCol = collection(db, 'bookingAttempts');
    const attemptsSnapshot = await getDocs(attemptsCol);
    const attemptsList: BookingAttempt[] = attemptsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<BookingAttempt, 'id'>),
    }));
    return NextResponse.json(attemptsList);
  } catch (error) {
    console.error("GET /api/booking-attempts error:", error);
    return NextResponse.json({ message: 'Error loading booking attempts' }, { status: 500 });
  }
}

// PUT update a booking attempt (User can update their own, Admin can update all)
export async function PUT(request: NextRequest) {
  const userInfo = await verifyUser(request);
  if (!userInfo) {
    return NextResponse.json({ message: 'Unauthorized. Please log in.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ message: 'Booking attempt ID is required.' }, { status: 400 });
    }

    // Get the existing booking attempt
    const attemptRef = doc(db, 'bookingAttempts', id);
    const attemptDoc = await getDoc(attemptRef);
    
    if (!attemptDoc.exists()) {
      return NextResponse.json({ message: 'Booking attempt not found.' }, { status: 404 });
    }

    const existingAttempt = attemptDoc.data() as BookingAttempt;
    
    // Check if user can modify this attempt
    if (!userInfo.isAdmin && existingAttempt.userId !== userInfo.uid) {
      return NextResponse.json({ message: 'Unauthorized. You can only edit your own booking attempts.' }, { status: 403 });
    }

    // Only allow certain fields to be updated
    const allowedFields = ['requestedTitle', 'requestedVenue', 'requestedStart', 'requestedEnd'];
    const filteredUpdateData: Partial<BookingAttempt> = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredUpdateData[field as keyof BookingAttempt] = updateData[field];
      }
    }

    // Admins can also update status and rejection reason
    if (userInfo.isAdmin) {
      if (updateData.status !== undefined) {
        filteredUpdateData.status = updateData.status;
      }
      if (updateData.rejectionReason !== undefined) {
        filteredUpdateData.rejectionReason = updateData.rejectionReason;
      }
    }

    await updateDoc(attemptRef, filteredUpdateData);

    return NextResponse.json({ message: 'Booking attempt updated successfully' }, { status: 200 });

  } catch (error) {
    console.error("PUT /api/booking-attempts error:", error);
    return NextResponse.json({ message: 'Error updating booking attempt' }, { status: 500 });
  }
}

// DELETE a booking attempt (User can delete their own, Admin can delete all)
export async function DELETE(request: NextRequest) {
  const userInfo = await verifyUser(request);
  if (!userInfo) {
    return NextResponse.json({ message: 'Unauthorized. Please log in.' }, { status: 401 });
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ message: 'Booking attempt ID is required.' }, { status: 400 });
    }

    // Get the existing booking attempt
    const attemptRef = doc(db, 'bookingAttempts', id);
    const attemptDoc = await getDoc(attemptRef);
    
    if (!attemptDoc.exists()) {
      return NextResponse.json({ message: 'Booking attempt not found.' }, { status: 404 });
    }

    const existingAttempt = attemptDoc.data() as BookingAttempt;
    
    // Check if user can delete this attempt
    if (!userInfo.isAdmin && existingAttempt.userId !== userInfo.uid) {
      return NextResponse.json({ message: 'Unauthorized. You can only delete your own booking attempts.' }, { status: 403 });
    }

    await deleteDoc(attemptRef);

    return NextResponse.json({ message: 'Booking attempt deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error("DELETE /api/booking-attempts error:", error);
    return NextResponse.json({ message: 'Error deleting booking attempt' }, { status: 500 });
  }
} 