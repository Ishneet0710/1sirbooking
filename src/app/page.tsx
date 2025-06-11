
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { BookingsData, Booking, CalendarEvent, Venue } from '@/types';
import { DEFAULT_VENUES } from '@/config/venues';
import VenueFilter from '@/components/venue-flow/VenueFilter';
import BookingForm from '@/components/venue-flow/BookingForm';
import BookingInfoDialog from '@/components/venue-flow/BookingInfoDialog';
import VenueCalendarWrapper from '@/components/venue-flow/VenueCalendarWrapper';
import { transformBookingsForCalendar, hasConflict as checkHasConflict } from '@/lib/bookings-utils';
import { useToast } from '@/hooks/use-toast';
import type { DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { parseToSingaporeDate, getCurrentSingaporeDate } from '@/lib/datetime';
import { BarChart, CalendarDays, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function VenueFlowPage() {
  const [bookingsData, setBookingsData] = useState<BookingsData | null>(null);
  const [selectedVenues, setSelectedVenues] = useState<string[]>(DEFAULT_VENUES.map(v => v.name));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [bookingFormInitialData, setBookingFormInitialData] = useState<Partial<Booking & { startDate?: Date, endDate?: Date }>>({});
  
  const [isBookingInfoOpen, setIsBookingInfoOpen] = useState(false);
  const [selectedBookingInfo, setSelectedBookingInfo] = useState<Booking | null>(null);

  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);


  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bookings');
      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${response.statusText}`);
      }
      const data: BookingsData = await response.json();
      setBookingsData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error Loading Bookings',
        description: err.message || 'Could not load booking data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleFilterChange = (newSelectedVenues: string[]) => {
    setSelectedVenues(newSelectedVenues);
  };

  const handleDateClick = (arg: DateSelectArg) => {
    const startDate = parseToSingaporeDate(arg.startStr);
    let endDate = arg.endStr ? parseToSingaporeDate(arg.endStr) : new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour
    
    // If it's an all-day click in month view, end date is exclusive, so adjust.
    if (arg.allDay && arg.view.type === 'dayGridMonth') {
       endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Set specific end time
    }


    setBookingFormInitialData({ startDate, endDate });
    setIsBookingFormOpen(true);
  };

  const handleEventClick = (arg: EventClickArg) => {
    const booking = arg.event.extendedProps.originalBooking as Booking;
    if (booking) {
      setSelectedBookingInfo(booking);
      setIsBookingInfoOpen(true);
    }
  };

  const handleSubmitBooking = async (booking: Booking): Promise<boolean> => {
    // Client-side conflict check for immediate feedback (server also validates)
    if (bookingsData && bookingsData[booking.venue]) {
      if (checkHasConflict(booking, bookingsData[booking.venue])) {
         toast({
          title: 'Booking Conflict',
          description: 'This time slot is already booked for the selected venue.',
          variant: 'destructive',
        });
        return false; // Indicate failure
      }
    }

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to save booking: ${response.statusText}`);
      }
      
      toast({
        title: 'Booking Saved!',
        description: `${booking.title} for ${booking.venue} has been successfully ${bookingFormInitialData.id ? 'updated' : 'created'}.`,
      });
      await fetchBookings(); // Re-fetch all bookings to update the calendar
      return true; // Indicate success
    } catch (err: any) {
      toast({
        title: 'Error Saving Booking',
        description: err.message || 'Could not save the booking.',
        variant: 'destructive',
      });
      return false; // Indicate failure
    }
  };

  const handleDeleteBooking = async (bookingId: string, venueName: string) => {
    try {
      const response = await fetch('/api/bookings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, venueName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete booking: ${response.statusText}`);
      }
      
      toast({
        title: 'Booking Deleted',
        description: 'The booking has been successfully deleted.',
      });
      await fetchBookings(); // Re-fetch all bookings
    } catch (err: any) {
      toast({
        title: 'Error Deleting Booking',
        description: err.message || 'Could not delete the booking.',
        variant: 'destructive',
      });
    }
  };


  const calendarEvents = transformBookingsForCalendar(bookingsData, selectedVenues);
  // Create a key that changes when relevant data changes to force FullCalendar re-render
  const calendarKey = `${selectedVenues.join('-')}_${calendarEvents.length}`;

  if (isLoading && !bookingsData) { // Show loading only on initial load
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 space-y-8 bg-background">
        <h1 className="text-4xl font-headline text-primary">VenueFlow</h1>
        <p className="text-lg text-muted-foreground">Loading bookings...</p>
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-7xl mb-8 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-headline text-primary flex items-center justify-center md:justify-start">
          <CalendarDays size={40} className="mr-3 text-accent" /> VenueFlow
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
          Seamlessly manage and book your venue spaces.
        </p>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 hidden lg:block">
          <VenueFilter
            venues={DEFAULT_VENUES}
            selectedVenues={selectedVenues}
            onFilterChange={handleFilterChange}
          />
        </div>

        <div className="lg:col-span-9">
          {error && (
            <Card className="mb-4 border-destructive bg-destructive/10">
              <CardContent className="p-4">
                <p className="text-destructive-foreground text-sm">{error}</p>
              </CardContent>
            </Card>
          )}
          <VenueCalendarWrapper
            events={calendarEvents}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            calendarKey={calendarKey}
          />
        </div>
      </main>

      {/* Mobile Filter Button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
         <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg">
              <Filter size={20} className="mr-2" /> Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[75vh]">
            <SheetHeader>
              <SheetTitle className="font-headline text-2xl">Filter Venues</SheetTitle>
              <SheetDescription>
                Select venues to display on the calendar.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
            <VenueFilter
              venues={DEFAULT_VENUES}
              selectedVenues={selectedVenues}
              onFilterChange={(newSelection) => {
                handleFilterChange(newSelection);
                // Optionally close sheet after selection, or add an "Apply" button
                // setIsFilterSheetOpen(false); 
              }}
            />
            </div>
             <Button onClick={() => setIsFilterSheetOpen(false)} className="w-full mt-4">Apply Filters</Button>
          </SheetContent>
        </Sheet>
      </div>

      {isBookingFormOpen && (
        <BookingForm
          isOpen={isBookingFormOpen}
          onClose={() => setIsBookingFormOpen(false)}
          onSubmitBooking={handleSubmitBooking}
          venues={DEFAULT_VENUES}
          initialData={bookingFormInitialData}
          existingBookingsForVenue={
            bookingFormInitialData.venue && bookingsData ? bookingsData[bookingFormInitialData.venue] : []
          }
        />
      )}

      {isBookingInfoOpen && selectedBookingInfo && (
        <BookingInfoDialog
          isOpen={isBookingInfoOpen}
          onClose={() => setIsBookingInfoOpen(false)}
          booking={selectedBookingInfo}
          onDeleteBooking={handleDeleteBooking}
        />
      )}
    </div>
  );
}
