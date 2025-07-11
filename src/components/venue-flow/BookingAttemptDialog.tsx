"use client";

import type React from 'react';
import type { BookingAttempt } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { formatToSingaporeTime } from '@/lib/datetime';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Edit3, MapPin, Trash2, User, CheckCircle, AlertTriangle, Hourglass, XCircle } from 'lucide-react';
import { getVenueColor } from '@/config/venues';
import { useAuth } from '@/context/AuthContext';

interface BookingAttemptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingAttempt: BookingAttempt | null;
  onDeleteBookingAttempt: (attemptId: string) => Promise<void>;
  onEditBookingAttempt: (bookingAttempt: BookingAttempt) => void;
}

const BookingAttemptDialog: React.FC<BookingAttemptDialogProps> = ({ 
  isOpen, 
  onClose, 
  bookingAttempt, 
  onDeleteBookingAttempt, 
  onEditBookingAttempt 
}) => {
  const { isAdmin, user } = useAuth();

  if (!isOpen || !bookingAttempt) return null;

  const venueColor = getVenueColor(bookingAttempt.requestedVenue);

  const handleDelete = async () => {
    await onDeleteBookingAttempt(bookingAttempt.id);
    onClose();
  };

  const handleEdit = () => {
    if (bookingAttempt) {
      onEditBookingAttempt(bookingAttempt);
    }
  };

  const getRequestedByText = () => {
    if (bookingAttempt.userDisplayName) {
      return bookingAttempt.userDisplayName;
    }
    if (bookingAttempt.userEmail) {
      return bookingAttempt.userEmail;
    }
    return "N/A";
  };

  const getStatusIcon = () => {
    switch (bookingAttempt.status) {
      case 'pending_approval':
        return <Hourglass className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (bookingAttempt.status) {
      case 'pending_approval':
        return 'Pending Approval';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusColor = () => {
    switch (bookingAttempt.status) {
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Check if the current user can edit/delete this booking attempt
  const canEditDelete = isAdmin || (user && bookingAttempt.userId === user.uid);

  // Users can only edit pending requests
  const canEdit = canEditDelete && bookingAttempt.status === 'pending_approval';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-primary">{bookingAttempt.requestedTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-1 mt-2">
          <div className="flex items-center space-x-3">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <Badge style={{ backgroundColor: venueColor, color: '#FFFFFF' }} variant="default" className="text-sm px-3 py-1">
              {bookingAttempt.requestedVenue}
            </Badge>
          </div>
          <div className="flex items-center space-x-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm">
              {formatToSingaporeTime(bookingAttempt.requestedStart, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm">
              {formatToSingaporeTime(bookingAttempt.requestedStart, 'HH:mm')} - {formatToSingaporeTime(bookingAttempt.requestedEnd, 'HH:mm')} (SGT)
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm">
              Requested by: {getRequestedByText()}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <Badge className={`text-sm px-3 py-1 ${getStatusColor()}`}>
              {getStatusText()}
            </Badge>
          </div>
          {bookingAttempt.status === 'rejected' && bookingAttempt.rejectionReason && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
              <p className="text-sm text-red-700 mt-1">{bookingAttempt.rejectionReason}</p>
            </div>
          )}
          {bookingAttempt.timestamp && (
            <div className="text-xs text-muted-foreground">
              Submitted: {bookingAttempt.timestamp.toDate ? formatToSingaporeTime(bookingAttempt.timestamp.toDate(), 'PP p') : 'Processing...'}
            </div>
          )}
        </div>
        <DialogFooter className="pt-6 sm:justify-between flex-wrap gap-2">
          <div className="flex gap-2 justify-start">
            {canEditDelete && (
              <>
                {canEdit && (
                  <Button variant="outline" onClick={handleEdit} className="flex items-center gap-2">
                    <Edit3 size={16} /> Edit
                  </Button>
                )}
                <Button variant="destructive" onClick={handleDelete} className="flex items-center gap-2">
                  <Trash2 size={16} /> Delete
                </Button>
              </>
            )}
          </div>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="sm:ml-auto">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingAttemptDialog; 