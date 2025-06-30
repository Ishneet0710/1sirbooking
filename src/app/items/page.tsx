"use client";

import type React from 'react';
import { useEffect, useState, useMemo } from 'react';
import type { Item, Loan, ItemWithLoanDetails } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  doc,
  writeBatch,
  addDoc,
  serverTimestamp,
  updateDoc,
  where,
  getDocs,
} from 'firebase/firestore';
import { DEFAULT_ITEMS } from '@/config/items';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, UserCircle, Handshake } from 'lucide-react';
import ItemCard from '@/components/item-flow/ItemCard';
import AppHeader from '@/components/shared/AppHeader';
import LoanDialog from '@/components/item-flow/LoanDialog';

export default function ItemsPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<Item[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for the loan dialog
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [currentItemToLoan, setCurrentItemToLoan] = useState<ItemWithLoanDetails | null>(null);

  // Seed items from config file if the collection is empty
  useEffect(() => {
    const seedItems = async () => {
      const itemsRef = collection(db, 'items');
      const q = query(itemsRef);
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log('Items collection is empty. Seeding from config...');
        const batch = writeBatch(db);
        DEFAULT_ITEMS.forEach(itemSpec => {
          const docRef = doc(itemsRef, itemSpec.id);
          const newItem: Omit<Item, 'id'> = {
            specId: itemSpec.id,
            name: itemSpec.name,
            category: itemSpec.category,
            description: itemSpec.description,
            imageUrl: itemSpec.imageUrl || `https://placehold.co/600x400.png`,
            status: 'Available',
            currentLoanId: null,
          };
          batch.set(docRef, newItem);
        });
        await batch.commit();
        console.log('Seeding complete.');
      }
    };
    
    seedItems().catch(console.error);
  }, []);

  // Listen for real-time updates on items
  useEffect(() => {
    const q = query(collection(db, 'items'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const itemsData: Item[] = [];
      querySnapshot.forEach((doc) => {
        itemsData.push({ id: doc.id, ...doc.data() } as Item);
      });
      setItems(itemsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching items: ", error);
      toast({ title: "Error", description: "Could not fetch items.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  // Listen for real-time updates on active loans
  useEffect(() => {
    const q = query(collection(db, 'loans'), where('returnDate', '==', null));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const loansData: Loan[] = [];
      querySnapshot.forEach((doc) => {
        loansData.push({ id: doc.id, ...doc.data() } as Loan);
      });
      setLoans(loansData);
    }, (error) => {
      console.error("Error fetching loans: ", error);
      toast({ title: "Error", description: "Could not fetch loan data.", variant: "destructive" });
    });

    return () => unsubscribe();
  }, [toast]);
  
  const itemsWithLoanDetails: ItemWithLoanDetails[] = useMemo(() => {
    const activeLoansMap = new Map(loans.map(loan => [loan.itemId, loan]));
    return items.map(item => ({
      ...item,
      activeLoan: activeLoansMap.get(item.id) || null,
    }));
  }, [items, loans]);

  const handleInitiateLoan = (item: ItemWithLoanDetails) => {
    if (!user) {
        toast({ title: "Login Required", description: "You must be logged in to loan an item." });
        return;
    }
    setCurrentItemToLoan(item);
    setIsLoanDialogOpen(true);
  };

  const handleConfirmLoan = async (expectedReturnDate: Date) => {
    if (!user || !currentItemToLoan) {
      toast({ title: "Error", description: "User or item information is missing.", variant: "destructive" });
      return;
    }
    
    const itemToLoan = items.find(item => item.id === currentItemToLoan.id);
    if (!itemToLoan || itemToLoan.status !== 'Available') {
      toast({ title: "Unavailable", description: "This item is not available for loan.", variant: "destructive" });
      return;
    }

    const loansRef = collection(db, 'loans');
    const itemRef = doc(db, 'items', currentItemToLoan.id);

    try {
      const newLoanData = {
        itemId: currentItemToLoan.id,
        userId: user.uid,
        userDisplayName: user.displayName,
        userEmail: user.email,
        loanDate: serverTimestamp(),
        expectedReturnDate: expectedReturnDate,
        returnDate: null,
      };
      
      const loanDocRef = await addDoc(loansRef, newLoanData);

      await updateDoc(itemRef, {
        status: 'Loaned Out',
        currentLoanId: loanDocRef.id,
      });

      toast({ title: "Success!", description: `You have successfully loaned ${itemToLoan.name}.` });
    } catch (error) {
      console.error("Error loaning item:", error);
      toast({ title: "Error", description: "Could not process the loan. Please try again.", variant: "destructive" });
    } finally {
        setIsLoanDialogOpen(false);
        setCurrentItemToLoan(null);
    }
  };


  const handleReturnItem = async (loanId: string, itemId: string) => {
    if (!user) {
      toast({ title: "Login Required", description: "You must be logged in to return an item." });
      return;
    }

    const itemToReturn = items.find(item => item.id === itemId);
    if (!itemToReturn) {
      toast({ title: "Error", description: "Item not found.", variant: "destructive" });
      return;
    }

    const loanRef = doc(db, 'loans', loanId);
    const itemRef = doc(db, 'items', itemId);

    const batch = writeBatch(db);

    batch.update(loanRef, { returnDate: serverTimestamp() });
    batch.update(itemRef, {
      status: 'Available',
      currentLoanId: null,
    });

    try {
      await batch.commit();
      toast({ title: "Success!", description: `${itemToReturn.name} has been returned.` });
    } catch (error) {
      console.error("Error returning item:", error);
      toast({ title: "Error", description: "Could not process the return. Please try again.", variant: "destructive" });
    }
  };

  const myLoans = useMemo(() => {
    if (!user) return [];
    return itemsWithLoanDetails.filter(item => item.activeLoan?.userId === user.uid);
  }, [itemsWithLoanDetails, user]);

  const availableItems = useMemo(() => {
    return itemsWithLoanDetails.filter(item => item.status === 'Available');
  }, [itemsWithLoanDetails]);
  
  const loanedOutItems = useMemo(() => {
     return itemsWithLoanDetails.filter(item => item.status === 'Loaned Out' && (myLoans.findIndex(i => i.id === item.id) === -1));
  }, [itemsWithLoanDetails, myLoans]);

  const renderItemList = (title: string, list: ItemWithLoanDetails[]) => (
     <div className="mb-12">
      <h2 className="text-2xl font-bold tracking-tight text-primary mb-4">{title}</h2>
      {list.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {list.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              currentUser={user}
              isAdmin={isAdmin}
              onInitiateLoan={handleInitiateLoan}
              onReturn={handleReturnItem}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No items in this category.</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4 md:p-8">
      <AppHeader />
      <main className="w-full max-w-7xl">
        {!user && !isLoading && (
          <Card className="mb-8 border-primary bg-primary/10">
            <CardContent className="p-6 text-center">
              <UserCircle size={48} className="mx-auto text-primary mb-2" />
              <p className="text-primary-foreground font-semibold">Please log in to loan or view items.</p>
            </CardContent>
          </Card>
        )}

        {user && myLoans.length > 0 && (
          <Card className="mb-8 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-headline text-accent">
                <Handshake /> Your Current Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {myLoans.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    currentUser={user}
                    isAdmin={isAdmin}
                    onInitiateLoan={handleInitiateLoan}
                    onReturn={handleReturnItem}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {renderItemList("Available Items", availableItems)}
        
        {isAdmin && renderItemList("All Loaned Out Items", loanedOutItems)}
        
        {!isAdmin && loanedOutItems.length > 0 && (
           <div className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-primary mb-4">Other Loaned Items</h2>
             <Alert>
               <Info className="h-4 w-4" />
               <AlertTitle>Heads Up!</AlertTitle>
               <AlertDescription>
                 These items are currently on loan to other users.
               </AlertDescription>
             </Alert>
          </div>
        )}

      </main>

      {currentItemToLoan && (
        <LoanDialog
          isOpen={isLoanDialogOpen}
          onClose={() => {
            setIsLoanDialogOpen(false);
            setCurrentItemToLoan(null);
          }}
          onSubmit={handleConfirmLoan}
          itemName={currentItemToLoan.name}
        />
      )}
    </div>
  );
}
