"use client";

import React, { useMemo } from 'react';
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
  
  const getLoanedToText = ().