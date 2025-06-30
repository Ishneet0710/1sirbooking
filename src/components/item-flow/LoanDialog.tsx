"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface LoanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expectedReturnDate: Date, quantity: number, company: string) => void;
  itemName: string;
  availableQuantity: number;
}

const LoanDialog: React.FC<LoanDialogProps> = ({ isOpen, onClose, onSubmit, itemName, availableQuantity }) => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [quantity, setQuantity] = useState(1);
  const [company, setCompany] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setDate(new Date());
      setQuantity(1);
      setCompany('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!date) {
      toast({ title: "Date Required", description: "Please select an expected return date.", variant: "destructive" });
      return;
    }
    if (!quantity || quantity <= 0) {
      toast({ title: "Invalid Quantity", description: "Please enter a valid quantity to loan.", variant: "destructive" });
      return;
    }
    if (quantity > availableQuantity) {
        toast({ title: "Not Enough Stock", description: `You can only loan up to ${availableQuantity} of this item.`, variant: "destructive" });
        return;
    }
    onSubmit(date, quantity, company);
    onClose();
  };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Loan Item: {itemName}</DialogTitle>
          <DialogDescription>
            Specify the quantity, company (optional), and expected return date.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="quantity">Quantity (Max: {availableQuantity})</Label>
            <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                min="1"
                max={availableQuantity}
                className="w-full"
            />
          </div>
           <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="company">Company / Unit (Optional)</Label>
            <Input
                id="company"
                type="text"
                placeholder="Your company or unit name"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full"
            />
          </div>
          <div className="flex justify-center">
            <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(day) => day < today}
                initialFocus
            />
          </div>
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
