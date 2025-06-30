"use client";

import React, { useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { ItemWithLoanDetails } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    const text = isAvailable ? 'Available' : 'Fully Loaned';
    
    return (
      <Badge variant="secondary" className={colorClass}>
        {text} ({item.availableQuantity}/{item.totalQuantity})
      </Badge>
    );
  };
  
  const getLoanedToText = () => {
    if (!isAdmin || item.activeLoans.length === 0) {
        return null;
    }

    return (
        <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <h4 className="font-semibold flex items-center gap-1.5"><Users size={14}/> On Loan To</h4>
            <ul className="pl-4 text-left">
                {item.activeLoans.map(loan => (
                    <li key={loan.id} className="truncate">
                        - {loan.userDisplayName || loan.userEmail} ({loan.quantityLoaned}x)
                    </li>
                ))}
            </ul>
        </div>
    );
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{item.name}</CardTitle>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex justify-between items-center">
            {getStatusBadge()}
            {userLoanedCount > 0 && (
                <Badge variant="outline" className="flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-blue-500" /> You have {userLoanedCount}
                </Badge>
            )}
        </div>
        {getLoanedToText()}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full"
          onClick={() => onInitiateLoan(item)} 
          disabled={!currentUser || item.availableQuantity === 0}
        >
          <Handshake className="mr-2 h-4 w-4" />
          Loan Item
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ItemCard;
