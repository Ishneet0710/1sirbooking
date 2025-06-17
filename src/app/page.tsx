
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { BookingsData, Booking, CalendarEvent, Venue, BookingAttempt } from '@/types';
import { DEFAULT_VENUES } from '@/config/venues';
import VenueFilter from '@/components/venue-flow/VenueFilter';
import BookingForm from '@/components/venue-flow/BookingForm';
import BookingInfoDialog from '@/components/venue-flow/BookingInfoDialog';
import VenueCalendarWrapper from '@/components/venue-flow/VenueCalendarWrapper';
import { transformBookingsForCalendar, hasConflict as checkHasConflict, generateBookingId } from '@/lib/bookings-utils';
import { useToast } from '@/hooks/use-toast';
import type { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { parseToSingaporeDate, formatToSingaporeTime, formatToSingaporeISOString, getCurrentSingaporeDate } from '@/lib/datetime';
import { CalendarDays, Filter, UserCircle, Info, Clock, CheckCircle, AlertTriangle, Hourglass } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import LoginLogoutButton from '@/components/auth/LoginLogoutButton';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy, limit, doc, updateDoc, setDoc } from 'firebase/firestore';
import { parseISO } from 'date-fns';


interface ProcessedBookingAttempt extends BookingAttempt {
  conflictsWithExistingBooking: boolean;
  conflictsWithOtherRequest: boolean;
}

interface GroupedBookingAttempts {
  [dateKey: string]: ProcessedBookingAttempt[];
}


export default function VenueFlowPage() {
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [selectedVenues, setSelectedVenues] = useState<string[]>(DEFAULT_VENUES.map(v => v.name));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [bookingFormInitialData, setBookingFormInitialData] = useState<Partial<Booking & { startDate?: Date, endDate?: Date }>>({});
  const [bookingFormMode, setBookingFormMode] = useState<'admin_create' | 'admin_edit' | 'user_request'>('user_request');


  const [isBookingInfoOpen, setIsBookingInfoOpen] = useState(false);
  const [selectedBookingInfo, setSelectedBookingInfo] = useState<Booking | null>(null);

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [bookingAttempts, setBookingAttempts] = useState<BookingAttempt[]>([]);


  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, "bookings"));
    const unsubscribeBookings = onSnapshot(q, (querySnapshot) => {
      const bookingsFromFirestore: Booking[] = [];
      querySnapshot.forEach((doc) => {
        bookingsFromFirestore.push({ id: doc.id, ...doc.data() } as Booking);
      });
      setAllBookings(bookingsFromFirestore);
      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching bookings from Firestore:", err);
      setError(err.message);
      toast({
        title: 'Error Loading Bookings',
        description: err.message || 'Could not load booking data from Firestore.',
        variant: 'destructive',
      });
      setIsLoading(false);
    });

    return () => unsubscribeBookings();
  }, [toast]);

  useEffect(() => {
    if (isAdmin && user) {
      const attemptsQuery = query(
        collection(db, "bookingAttempts"),
        orderBy("timestamp", "desc")
        // No limit here, as we'll filter and group client-side. If performance becomes an issue, consider pagination or date-range filtering.
      );
      const unsubscribeAttempts = onSnapshot(attemptsQuery, (querySnapshot) => {
        const attempts: BookingAttempt[] = [];
        querySnapshot.forEach((doc) => {
          attempts.push({ id: doc.id, ...doc.data() } as BookingAttempt);
        });
        setBookingAttempts(attempts); // Store all attempts, filtering for pending status will happen in useMemo
      }, (err) => {
        console.error("Error fetching booking attempts:", err);
        toast({
          title: "Error Loading Booking Requests",
          description: err.message,
          variant: "destructive",
        });
      });
      return () => unsubscribeAttempts();
    } else {
      setBookingAttempts([]); 
    }
  }, [isAdmin, user, toast]);


  const bookingsData: BookingsData | null = useMemo(() => {
    if (isLoading || !allBookings) return null;
    const groupedBookings: BookingsData = {};
    DEFAULT_VENUES.forEach(venue => {
      groupedBookings[venue.name] = [];
    });
    allBookings.forEach(booking => {
      if (groupedBookings[booking.venue]) {
        groupedBookings[booking.venue].push(booking);
      } else {
        if (!groupedBookings[booking.venue]) {
           groupedBookings[booking.venue] = [];
        }
        groupedBookings[booking.venue].push(booking);
      }
    });
    return groupedBookings;
  }, [allBookings, isLoading]);

  const pendingBookingAttempts = useMemo(() => {
    return bookingAttempts.filter(attempt => attempt.status === 'pending_approval');
  }, [bookingAttempts]);

  const processedAndGroupedAttempts: GroupedBookingAttempts = useMemo(() => {
    const processed: ProcessedBookingAttempt[] = pendingBookingAttempts.map(attempt => {
      const attemptAsBookingConcept: Booking = {
        id: attempt.id,
        title: attempt.requestedTitle,
        venue: attempt.requestedVenue,
        start: attempt.requestedStart,
        end: attempt.requestedEnd,
      };

      const conflictsWithExisting = checkHasConflict(attemptAsBookingConcept, allBookings);

      const otherPendingSlotsForConflictCheck: Booking[] = pendingBookingAttempts
        .filter(other => other.id !== attempt.id)
        .map(other => ({
          id: other.id,
          title: other.requestedTitle,
          venue: other.requestedVenue,
          start: other.requestedStart,
          end: other.requestedEnd,
        }));
      const conflictsWithOther = checkHasConflict(attemptAsBookingConcept, otherPendingSlotsForConflictCheck);

      return {
        ...attempt,
        conflictsWithExistingBooking: conflictsWithExisting,
        conflictsWithOtherRequest: conflictsWithOther,
      };
    });

    const grouped: GroupedBookingAttempts = {};
    processed.forEach(attempt => {
      const dateKey = formatToSingaporeTime(parseISO(attempt.requestedStart), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(attempt);
    });

    for (const dateKey in grouped) {
      grouped[dateKey].sort((a, b) => parseISO(a.requestedStart).getTime() - parseISO(b.requestedStart).getTime());
    }
    return grouped;
  }, [pendingBookingAttempts, allBookings]);

  const sortedDateKeysForRequests = useMemo(() => {
    return Object.keys(processedAndGroupedAttempts).sort((a,b) => parseISO(a).getTime() - parseISO(b).getTime());
  }, [processedAndGroupedAttempts]);


  const handleFilterChange = (newSelectedVenues: string[]) => {
    setSelectedVenues(newSelectedVenues);
  };

  const handleDateClick = (arg: DateSelectArg) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to interact with the calendar.", variant: "default" });
      return;
    }

    const startDate = parseToSingaporeDate(arg.startStr);
    let endDate = arg.endStr ? parseToSingaporeDate(arg.endStr) : new Date(startDate.getTime() + 60 * 60 * 1000); 

    if (arg.allDay && arg.view.type === 'dayGridMonth') {
       endDate = new Date(startDate.getTime() + 60 * 60 * 1000); 
    }
    
    setBookingFormInitialData({ startDate, endDate, id: undefined, title: undefined, venue: isAdmin ? DEFAULT_VENUES[0]?.name : undefined });
    setBookingFormMode(isAdmin ? 'admin_create' : 'user_request');
    setIsBookingFormOpen(true);
  };


  const handleEventClick = (arg: EventClickArg) => {
    const booking = arg.event.extendedProps.originalBooking as Booking;
    if (booking) {
      setSelectedBookingInfo(booking);
      setIsBookingInfoOpen(true);
    }
  };

  const handleStartEditBooking = (bookingToEdit: Booking) => {
    if (!isAdmin) {
      toast({ title: "Admin Action Required", description: "Only administrators can edit bookings.", variant: "default" });
      return;
    }
    const startDate = bookingToEdit.start ? parseToSingaporeDate(bookingToEdit.start) : getCurrentSingaporeDate();
    const endDate = bookingToEdit.end ? parseToSingaporeDate(bookingToEdit.end) : new Date(startDate.getTime() + 60 * 60 * 1000);

    setBookingFormInitialData({ ...bookingToEdit, startDate, endDate });
    setBookingFormMode('admin_edit');
    setIsBookingFormOpen(true);
    setIsBookingInfoOpen(false);
  };

  const handleNonAdminBookingRequest = async (bookingDataFromForm: Booking): Promise<boolean> => {
    if (!user) {
      toast({ title: "Not Logged In", description: "You must be logged in to submit a request.", variant: "destructive" });
      return false;
    }

    try {
      const attemptData: Omit<BookingAttempt, 'id' | 'timestamp'> = { 
        userId: user.uid,
        userDisplayName: user.displayName,
        userEmail: user.email,
        requestedTitle: bookingDataFromForm.title,
        requestedVenue: bookingDataFromForm.venue,
        requestedStart: bookingDataFromForm.start, 
        requestedEnd: bookingDataFromForm.end,     
        status: 'pending_approval',
      };

      await addDoc(collection(db, 'bookingAttempts'), {
        ...attemptData,
        timestamp: serverTimestamp(),
      });

      toast({
        title: "Booking Request Submitted",
        description: "Your request has been sent to the administrator for approval.",
        variant: "default"
      });
      return true;
    } catch (error: any) {
      console.error("Error submitting booking request:", error);
      toast({
        title: "Request Submission Error",
        description: error.message || "Could not submit your booking request. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };


  const handleSubmitBooking = async (booking: Booking): Promise<boolean> => {
    if (!user) {
      toast({ title: "Not Logged In", description: "You must be logged in to save a booking.", variant: "destructive" });
      return false;
    }
    if (!isAdmin) {
      toast({ title: "Not Authorized", description: "Only administrators can save bookings directly.", variant: "destructive" });
      return false;
    }

    if (bookingsData && bookingsData[booking.venue]) {
      const otherBookingsInVenue = allBookings.filter(b => b.id !== booking.id && b.venue === booking.venue);
      if (checkHasConflict(booking, otherBookingsInVenue)) {
         toast({
          title: 'Booking Conflict',
          description: 'This time slot is already booked for the selected venue, or overlaps with another booking.',
          variant: 'destructive',
        });
        return false;
      }
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(booking),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
           toast({ title: 'Not Authorized', description: errorData.message || 'You do not have permission to save this booking.', variant: 'destructive' });
        } else if (response.status === 409) {
          toast({ title: 'Booking Conflict', description: errorData.message || 'This booking overlaps with an existing one.', variant: 'destructive' });
        }
        else {
          throw new Error(errorData.message || `Failed to save booking: ${response.statusText}`);
        }
        return false;
      }
      
      const savedBooking = await response.json();

      toast({
        title: 'Booking Saved!',
        description: `${booking.title} for ${booking.venue} has been successfully ${bookingFormInitialData.id ? 'updated' : 'created'}.`,
      });
      if (bookingFormInitialData.id) { 
        setBookingFormInitialData({});
      }
      return true;
    } catch (err: any) {
      toast({
        title: 'Error Saving Booking',
        description: err.message || 'Could not save the booking.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleApproveBookingRequest = async (attempt: BookingAttempt) => {
    if (!isAdmin) return;

    const bookingToCreate: Booking = {
      id: generateBookingId(), 
      title: attempt.requestedTitle,
      venue: attempt.requestedVenue,
      start: attempt.requestedStart,
      end: attempt.requestedEnd,
    };

    const success = await handleSubmitBooking(bookingToCreate); 

    if (success) {
      try {
        const attemptRef = doc(db, 'bookingAttempts', attempt.id);
        await updateDoc(attemptRef, {
          status: 'approved',
          createdBookingId: bookingToCreate.id,
        });
        toast({
          title: 'Request Approved',
          description: `Booking for "${attempt.requestedTitle}" has been created.`,
        });
      } catch (error: any) {
        console.error("Error updating booking attempt status:", error);
        toast({
          title: 'Approval Error',
          description: 'Booking was created, but failed to update the request status.',
          variant: 'destructive',
        });
      }
    }
  };
  
  const handleRejectBookingRequest = async (attemptId: string) => {
    if (!isAdmin) return;
    try {
      const attemptRef = doc(db, 'bookingAttempts', attemptId);
      await updateDoc(attemptRef, { status: 'rejected' });
      toast({
        title: 'Request Rejected',
        description: 'The booking request has been marked as rejected.',
      });
    } catch (error: any) {
      console.error("Error rejecting booking attempt:", error);
      toast({
        title: 'Rejection Error',
        description: 'Could not update the request status to rejected.',
        variant: 'destructive',
      });
    }
  };


  const handleDeleteBooking = async (bookingId: string, venueName: string) => {
     if (!user) {
      toast({ title: "Not Logged In", description: "You must be logged in to delete bookings.", variant: "destructive" });
      return;
    }
    if (!isAdmin) {
      toast({ title: "Not Authorized", description: "Only administrators can delete bookings.", variant: "destructive" });
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/bookings', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ bookingId, venueName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
         if (response.status === 403) {
           toast({ title: 'Not Authorized', description: errorData.message || 'You do not have permission to delete this booking.', variant: 'destructive' });
        } else {
          toast({ title: 'Error Deleting Booking', description: errorData.message || `Failed to delete booking: ${response.statusText}`, variant: 'destructive' });
        }
        return;
      }

      toast({
        title: 'Booking Deleted',
        description: 'The booking has been successfully deleted.',
      });
    } catch (err: any) {
      console.error("handleDeleteBooking catch error:", err);
      toast({
        title: 'Error Deleting Booking',
        description: err.message || 'Could not delete the booking.',
        variant: 'destructive',
      });
    }
  };

  const calendarEvents = transformBookingsForCalendar(bookingsData, selectedVenues);
  
  const calendarViewPersistenceKey = useMemo(() => {
    return selectedVenues.join('-');
  }, [selectedVenues]);


  const getSubmitButtonText = useCallback(() => {
    if (bookingFormMode === 'admin_edit') return 'Save Changes';
    if (bookingFormMode === 'admin_create') return 'Create Booking';
    return 'Submit Request';
  }, [bookingFormMode]);


  if (isLoading && allBookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 space-y-8 bg-background">
        <h1 className="text-4xl font-headline text-primary">Venue1SIR</h1>
        <p className="text-lg text-muted-foreground">Loading bookings...</p>
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const renderPendingRequests = () => {
    if (pendingBookingAttempts.length === 0) {
      return <p className="text-sm text-muted-foreground">No pending booking requests.</p>;
    }
    return (
      <ul className="space-y-6">
        {sortedDateKeysForRequests.map(dateKey => (
          <li key={dateKey}>
            <h3 className="text-md font-semibold text-primary mb-2 sticky top-0 bg-card/80 backdrop-blur-sm py-1.5 z-10">
              {formatToSingaporeTime(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
            </h3>
            <ul className="space-y-4 pl-2 border-l border-border ml-1">
              {processedAndGroupedAttempts[dateKey].map((attempt) => (
                <li key={attempt.id} className="p-3 bg-muted/50 rounded-lg shadow-sm">
                  <p className="font-semibold text-foreground text-base mb-1">
                    {attempt.requestedTitle}
                  </p>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p><strong>User:</strong> {attempt.userDisplayName || attempt.userEmail || 'Unknown'}</p>
                    <p><strong>Venue:</strong> {attempt.requestedVenue}</p>
                    <p><strong>From:</strong> {formatToSingaporeTime(parseISO(attempt.requestedStart), 'HH:mm')}</p>
                    <p><strong>To:</strong> {formatToSingaporeTime(parseISO(attempt.requestedEnd), 'HH:mm')}</p>
                    <p className="text-xs mt-0.5">Requested: {attempt.timestamp?.toDate ? formatToSingaporeTime(attempt.timestamp.toDate(), 'PP p') : 'Processing...'}</p>
                  </div>
                  { (attempt.conflictsWithExistingBooking || attempt.conflictsWithOtherRequest) && <div className="mt-2 space-y-1">
                    {attempt.conflictsWithExistingBooking && (
                      <div className="flex items-center text-destructive text-xs">
                        <AlertTriangle size={14} className="mr-1 flex-shrink-0" />
                        Conflicts with a confirmed booking.
                      </div>
                    )}
                    {attempt.conflictsWithOtherRequest && (
                      <div className="flex items-center text-yellow-600 dark:text-yellow-500 text-xs">
                        <AlertTriangle size={14} className="mr-1 flex-shrink-0" />
                        Conflicts with another pending request.
                      </div>
                    )}
                  </div>}
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => handleApproveBookingRequest(attempt)} className="bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle size={16} className="mr-1.5"/> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleRejectBookingRequest(attempt.id)}>
                        <AlertTriangle size={16} className="mr-1.5"/> Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    );
  };


  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-7xl mb-8 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <CalendarDays size={20} className="text-accent" />
          <h1 className="text-lg font-headline text-primary">
            Venue1SIR
          </h1>
        </div>
        <LoginLogoutButton />
      </header>

      <main className="w-full max-w-7xl lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
        <div className="lg:col-span-4 hidden lg:flex lg:flex-col space-y-6">
          <VenueFilter
            venues={DEFAULT_VENUES}
            selectedVenues={selectedVenues}
            onFilterChange={handleFilterChange}
          />
          {isAdmin && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl font-headline text-primary flex items-center">
                  <Hourglass size={20} className="mr-2 text-primary/80"/> Pending Booking Requests
                </CardTitle>
                <CardDescription>Review and manage user booking requests. Conflicts are highlighted.</CardDescription>
              </CardHeader>
              <CardContent className="pt-2 max-h-[calc(100vh-400px)] overflow-y-auto"> 
                 {renderPendingRequests()}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-8">
          {error && (
            <Card className="mb-4 border-destructive bg-destructive/10">
              <CardContent className="p-4">
                <p className="text-destructive-foreground text-sm">{error}</p>
              </CardContent>
            </Card>
          )}
          {!user && !isLoading && (
            <Card className="mb-4 border-primary bg-primary/10">
              <CardContent className="p-6 text-center">
                <UserCircle size={48} className="mx-auto text-primary mb-2" />
                <p className="text-primary-foreground font-semibold">Please log in to view bookings or submit requests.</p>
              </CardContent>
            </Card>
          )}
          {user && !isAdmin && !isLoading && (
             <Card className="mb-4 border-accent bg-accent/10">
              <CardContent className="p-6 text-center">
                 <Info size={48} className="mx-auto text-accent mb-2" />
                <p className="text-accent-foreground font-semibold">You are logged in as a standard user.</p>
                <p className="text-sm text-accent-foreground/80">Click on a calendar slot to request a booking. Your request will be sent for admin approval.</p>
              </CardContent>
            </Card>
          )}
          <VenueCalendarWrapper
            events={calendarEvents}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            calendarKey={calendarViewPersistenceKey} 
          />
           {isAdmin && (
            <div className="lg:hidden mt-6"> 
              <Card className="shadow-lg">
                <CardHeader>
                 <CardTitle className="text-xl font-headline text-primary flex items-center">
                    <Hourglass size={20} className="mr-2 text-primary/80"/> Pending Booking Requests
                  </CardTitle>
                  <CardDescription>Review and manage user booking requests. Conflicts are highlighted.</CardDescription>
                </CardHeader>
                 <CardContent className="pt-2 max-h-96 overflow-y-auto">
                   {renderPendingRequests()}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <div className="lg:hidden fixed bottom-4 right-4 z-50">
         <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg">
              <Filter size={20} className="mr-2" /> Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[calc(100vh-60px)] flex flex-col">
            <SheetHeader className="shrink-0">
              <SheetTitle className="font-headline text-2xl">Filter Venues</SheetTitle>
              <SheetDescription>
                Select venues to display on the calendar.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 flex-grow overflow-y-auto">
            <VenueFilter
              venues={DEFAULT_VENUES}
              selectedVenues={selectedVenues}
              onFilterChange={(newSelection) => {
                handleFilterChange(newSelection);
              }}
            />
            </div>
             <Button onClick={() => setIsFilterSheetOpen(false)} className="w-full mt-auto shrink-0">Apply Filters</Button>
          </SheetContent>
        </Sheet>
      </div>

      {isBookingFormOpen && (
        <BookingForm
          isOpen={isBookingFormOpen}
          onClose={() => {
            setIsBookingFormOpen(false);
            setBookingFormInitialData({}); 
          }}
          onSubmitBooking={isAdmin ? handleSubmitBooking : handleNonAdminBookingRequest}
          venues={DEFAULT_VENUES}
          initialData={bookingFormInitialData}
          existingBookingsForVenue={
             bookingFormInitialData?.venue && bookingsData && allBookings ? allBookings.filter(b => b.venue === bookingFormInitialData?.venue) : []
          }
          submitButtonText={getSubmitButtonText()}
        />
      )}

      {isBookingInfoOpen && selectedBookingInfo && (
        <BookingInfoDialog
          isOpen={isBookingInfoOpen}
          onClose={() => setIsBookingInfoOpen(false)}
          booking={selectedBookingInfo}
          onDeleteBooking={handleDeleteBooking}
          onEditBooking={handleStartEditBooking}
        />
      )}
    </div>
  );
}
    
