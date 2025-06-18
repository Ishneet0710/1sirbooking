
"use client";

import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface RejectionReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  bookingAttemptTitle?: string;
}

const RejectionReasonDialog: React.FC<RejectionReasonDialogProps> = ({ isOpen, onClose, onSubmit, bookingAttemptTitle }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    onSubmit(reason);
    setReason(''); // Clear reason for next use
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline">Reject Booking Request</DialogTitle>
          {bookingAttemptTitle && <DialogDescription>Provide a reason for rejecting the request for: "{bookingAttemptTitle}"</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="rejectionReason">Reason for Rejection (Optional)</Label>
            <Textarea
              id="rejectionReason"
              placeholder="Enter reason here..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => { setReason(''); onClose();}}>Cancel</Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={handleSubmit}>Submit Rejection</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RejectionReasonDialog;
