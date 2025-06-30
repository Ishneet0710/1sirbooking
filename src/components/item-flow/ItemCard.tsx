"use client";

import type React from 'react';
import type { User } from 'firebase/auth';
import type { ItemWithLoanDetails } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Handshake, CheckCircle, Users } from 'lucide-react';


interface ItemCardProps {
  item: ItemWithLoanDetails;
  currentUser: User | null;
  isAdmin: boolean;
  onInitiateLoan: (item: ItemWithLoanDetails) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, currentUser, isAdmin, onInitiateLoan }) => {
  
  const userLoanedCount = useMemo(() => {
    if (!currentUser) return 0;
    return item.activeLoans
      .filter(loan => loan.userId === currentUser.uid)
      .reduce((sum, loan) => sum + loan.quantityLoaned, 0);
  }, [item.activeLoans, currentUser]);

  const getStatusBadge = () => {
    const isAvailable = item.availableQuantity > 0;
    const colorClass = isAvailable ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
    const text = isAvailable ? 'Available' : 'Unavailable';
    
    return (
      <Badge variant="secondary" className={colorClass}>
        {text} ({item.availableQuantity}/{item.totalQuantity})
      </Badge>
    );
  };
  
  const getLoanedToText = () => {
    if (userLoanedCount > 0) {
      return (
        <div className="flex items-center text-sm text-blue-600 font-medium">
          <CheckCircle className="h-4 w-4 mr-1.5" />
          <span>You have {userLoanedCount} of this item</span>
        </div>
      );
    }
    
    if (isAdmin && item.activeLoans.length > 0) {
       const loanCount = new Set(item.activeLoans.map(loan => loan.userId)).size;
       return (
        <div className="flex items-center text-sm text-muted-foreground">
           <Users className="h-4 w-4 mr-1.5" />
          <span>On loan to {loanCount} user{loanCount > 1 ? 's' : ''}</span>
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
        <div className="h-6 flex flex-col justify-center items-start">
         {getLoanedToText()}
        </div>
        <div className="w-full">
            <Button 
                className="w-full" 
                onClick={() => onInitiateLoan(item)} 
                disabled={!currentUser || item.availableQuantity === 0}
            >
                <Handshake className="mr-2 h-4 w-4" /> Loan Item
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ItemCard;
