"use client";

import type React from 'react';
import type { User } from 'firebase/auth';
import type { ItemWithLoanDetails } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Handshake, Undo2, UserCheck, ShieldCheck, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';


interface ItemCardProps {
  item: ItemWithLoanDetails;
  currentUser: User | null;
  isAdmin: boolean;
  onInitiateLoan: (item: ItemWithLoanDetails) => void;
  onReturn: (loanId: string, itemId: string) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, currentUser, isAdmin, onInitiateLoan, onReturn }) => {
  const isLoanedByCurrentUser = item.activeLoan?.userId === currentUser?.uid;

  const getStatusBadge = () => {
    if (item.status === 'Available') {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Available</Badge>;
    }
    return <Badge variant="destructive" className="bg-yellow-100 text-yellow-800">Loaned Out</Badge>;
  };
  
  const getLoanedToText = () => {
    if (item.status !== 'Loaned Out' || !item.activeLoan) return null;
    
    if (isLoanedByCurrentUser) {
      return (
        <div className="flex items-center text-sm text-blue-600 font-medium">
          <UserCheck className="h-4 w-4 mr-1.5" />
          <span>You have this item</span>
        </div>
      );
    }
    
    if (isAdmin) {
       return (
        <div className="flex items-center text-sm text-muted-foreground">
           <ShieldCheck className="h-4 w-4 mr-1.5" />
          <span>Loaned to: {item.activeLoan.userDisplayName || item.activeLoan.userEmail || 'N/A'}</span>
        </div>
      );
    }
    
    return null;
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="relative aspect-video mb-4">
           <Image
            src={item.imageUrl || 'https://placehold.co/600x400.png'}
            alt={item.name}
            fill
            className="rounded-md object-cover"
            data-ai-hint="equipment electronics"
          />
        </div>
        <CardTitle className="text-lg">{item.name}</CardTitle>
        <div className="flex justify-between items-center">
            <CardDescription>{item.category}</CardDescription>
            {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">{item.description}</p>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4">
        <div className="h-12 flex flex-col justify-center items-start">
         {getLoanedToText()}
         {item.activeLoan && (
            <div className="flex items-center text-sm text-muted-foreground mt-1">
                <CalendarClock className="h-4 w-4 mr-1.5 flex-shrink-0" />
                <span>Return by: {format(item.activeLoan.expectedReturnDate.toDate(), 'PPP')}</span>
            </div>
         )}
        </div>
        <div className="w-full">
            {item.status === 'Available' && (
                <Button className="w-full" onClick={() => onInitiateLoan(item)} disabled={!currentUser}>
                    <Handshake className="mr-2 h-4 w-4" /> Loan Item
                </Button>
            )}
            {isLoanedByCurrentUser && item.activeLoan && (
                 <Button className="w-full" variant="outline" onClick={() => onReturn(item.activeLoan!.id, item.id)}>
                    <Undo2 className="mr-2 h-4 w-4" /> Return Item
                </Button>
            )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default ItemCard;
