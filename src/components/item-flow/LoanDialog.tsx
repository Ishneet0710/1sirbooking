"use client";

import type React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';

interface LoanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expectedReturnDate: Date) => void;
  itemName: string;
}

const LoanDialog: React.FC<LoanDialogProps> = ({ isOpen, onClose, onSubmit, itemName }) => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!date) {
      toast({
        title: "Date Required",
        description: "Please select an expected return date.",
        variant: "destructive",
      });
      return;
    }
    onSubmit(date);
    onClose();
  };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of today

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Loan Item: {itemName}</DialogTitle>
          <DialogDescription>
            Please select the expected return date for this item.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={(day) => day < today} // Disable past dates
            initialFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Confirm Loan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LoanDialog;
