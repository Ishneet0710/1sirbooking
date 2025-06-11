
"use client";

import type React from 'react';
import type { Booking } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { formatToSingaporeTime } from '@/lib/datetime';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, MapPin, Trash2 } from 'lucide-react';
import { getVenueColor } from '@/config/venues';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

interface BookingInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onDeleteBooking: (bookingId: string, venueName: string) => Promise<void>;
}

const BookingInfoDialog: React.FC<BookingInfoDialogProps> = ({ isOpen, onClose, booking, onDeleteBooking }) => {
  const { isAdmin } = useAuth(); // Get isAdmin status

  if (!isOpen || !booking) return null;

  const venueColor = getVenueColor(booking.venue);

  const handleDelete = async () => {
    await onDeleteBooking(booking.id, booking.venue);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-primary">{booking.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-1 mt-2">
          <div className="flex items-center space-x-3">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <Badge style={{ backgroundColor: venueColor, color: '#FFFFFF' }} variant="default" className="text-sm px-3 py-1">
              {booking.venue}
            </Badge>
          </div>
          <div className="flex items-center space-x-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm">
              {formatToSingaporeTime(booking.start, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm">
              {formatToSingaporeTime(booking.start, 'HH:mm')} - {formatToSingaporeTime(booking.end, 'HH:mm')} (SGT)
            </p>
          </div>
        </div>
        <DialogFooter className="pt-6 sm:justify-between">
          {isAdmin && ( // Only show delete button if user is admin (client-side check for UX)
            <Button variant="destructive" onClick={handleDelete} className="flex items-center gap-2">
              <Trash2 size={16} /> Delete Booking
            </Button>
          )}
          {!isAdmin && <div />} {/* Placeholder to keep layout consistent if delete button is hidden */}
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingInfoDialog;
