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
  serverTimestamp,
  where,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { DEFAULT_ITEMS } from '@/config/items';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Info, UserCircle, Handshake, Box, ArrowRight, Undo2, ShieldCheck, Users } from 'lucide-react';
import ItemCard from '@/components/item-flow/ItemCard';
import AppHeader from '@/components/shared/AppHeader';
import LoanDialog from '@/components/item-flow/LoanDialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


export default function ItemsPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<Item[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [currentItemToLoan, setCurrentItemToLoan] = useState<ItemWithLoanDetails | null>(null);

  // Seed items from config file if the collection is empty
  useEffect(() => {
    const seedItems = async () => {
      const itemsRef = collection(db, 'items');
      const snapshot = await getDocs(itemsRef);

      if (snapshot.empty) {
        console.log('Items collection is empty. Seeding from config...');
        const batch = writeBatch(db);
        DEFAULT_ITEMS.forEach(itemSpec => {
          const docRef = doc(itemsRef, itemSpec.id);
          const newItem: Omit<Item, 'id'> = {
            name: itemSpec.name,
            category: itemSpec.category,
            description: itemSpec.description,
            imageUrl: itemSpec.imageUrl || `https://placehold.co/600x400.png`,
            totalQuantity: itemSpec.quantity,
            availableQuantity: itemSpec.quantity,
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
    const loansByItemId = new Map<string, Loan[]>();
    loans.forEach(loan => {
      const existingLoans = loansByItemId.get(loan.itemId) || [];
      existingLoans.push(loan);
      loansByItemId.set(loan.itemId, existingLoans);
    });
    
    return items.map(item => ({
      ...item,
      activeLoans: loansByItemId.get(item.id) || [],
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

  const handleConfirmLoan = async (expectedReturnDate: Date, quantity: number) => {
    if (!user || !currentItemToLoan || quantity <= 0) {
      toast({ title: "Error", description: "User, item, or quantity information is missing.", variant: "destructive" });
      return;
    }
    
    const itemRef = doc(db, 'items', currentItemToLoan.id);
    const newLoanRef = doc(collection(db, 'loans'));

    try {
      await runTransaction(db, async (transaction) => {
        const itemDoc = await transaction.get(itemRef);

        if (!itemDoc.exists()) {
          throw new Error("This item could not be found.");
        }
        
        const currentAvailable = itemDoc.data().availableQuantity;
        if (currentAvailable < quantity) {
           throw new Error(`Loan failed. Only ${currentAvailable} of this item are available.`);
        }

        const newLoanData: Omit<Loan, 'id'> = {
          itemId: currentItemToLoan.id,
          itemName: currentItemToLoan.name, // Denormalize name for easier display
          quantityLoaned: quantity,
          userId: user.uid,
          userDisplayName: user.displayName,
          userEmail: user.email,
          loanDate: serverTimestamp(),
          expectedReturnDate: expectedReturnDate,
          returnDate: null,
        };

        transaction.set(newLoanRef, newLoanData);
        transaction.update(itemRef, {
          availableQuantity: currentAvailable - quantity,
        });
      });

      toast({ title: "Success!", description: `You have successfully loaned ${quantity}x ${currentItemToLoan.name}.` });

    } catch (error: any) {
      console.error("Error loaning item within transaction:", error);
      toast({ 
        title: "Loan Failed", 
        description: error.message || "Could not process the loan due to a server error. Please try again.", 
        variant: "destructive" 
      });
    } finally {
        setIsLoanDialogOpen(false);
        setCurrentItemToLoan(null);
    }
  };


  const handleReturnItem = async (loanId: string) => {
    const loanToReturn = loans.find(l => l.id === loanId);

    if (!user || !loanToReturn) {
      toast({ title: "Error", description: "Loan details not found.", variant: "destructive" });
      return;
    }

    const itemRef = doc(db, 'items', loanToReturn.itemId);
    const loanRef = doc(db, 'loans', loanId);

    try {
        await runTransaction(db, async (transaction) => {
            const itemDoc = await transaction.get(itemRef);
            const loanDoc = await transaction.get(loanRef);

            if (!itemDoc.exists() || !loanDoc.exists()) {
                throw new Error("Item or Loan data could not be found.");
            }
            if (loanDoc.data().returnDate !== null) {
                // This check is a safeguard, as the UI should not show a return button for returned items.
                throw new Error("This loan has already been processed.");
            }

            const currentAvailable = itemDoc.data().availableQuantity;
            const quantityToReturn = loanDoc.data().quantityLoaned;

            transaction.update(loanRef, { returnDate: serverTimestamp() });
            transaction.update(itemRef, {
                availableQuantity: currentAvailable + quantityToReturn,
            });
        });

        toast({ title: "Success!", description: `${loanToReturn.itemName} has been returned.` });
    } catch (error: any) {
        console.error("Error returning item:", error);
        toast({ title: "Error", description: "Could not process the return. Please try again.", variant: "destructive" });
    }
  };

  const myActiveLoans = useMemo(() => {
    if (!user) return [];
    return loans.filter(loan => loan.userId === user.uid);
  }, [loans, user]);
  
  const allActiveLoans = useMemo(() => {
    if (!isAdmin) return [];
    return loans;
  }, [loans, isAdmin]);

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

        {user && myActiveLoans.length > 0 && (
          <Card className="mb-12 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-headline text-accent">
                <Handshake /> Your Current Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead>Return By</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myActiveLoans.map(loan => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.itemName}</TableCell>
                      <TableCell className="text-center">{loan.quantityLoaned}</TableCell>
                      <TableCell>{format(loan.expectedReturnDate.toDate(), 'PPP')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleReturnItem(loan.id)}>
                          <Undo2 className="mr-2 h-4 w-4" /> Return
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        <div className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-primary mb-4">Browse All Items</h2>
            {itemsWithLoanDetails.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {itemsWithLoanDetails.map(item => (
                    <ItemCard
                    key={item.id}
                    item={item}
                    currentUser={user}
                    isAdmin={isAdmin}
                    onInitiateLoan={handleInitiateLoan}
                    />
                ))}
                </div>
            ) : (
                <p className="text-muted-foreground">No items available to display.</p>
            )}
        </div>
        
        {isAdmin && allActiveLoans.length > 0 && (
           <Card className="mb-12 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-headline text-primary">
                <ShieldCheck /> All Active Loans (Admin View)
              </CardTitle>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead>Return By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allActiveLoans.map(loan => (
                    <TableRow key={loan.id}>
                       <TableCell className="font-medium">{loan.userDisplayName || loan.userEmail}</TableCell>
                      <TableCell>{loan.itemName}</TableCell>
                      <TableCell className="text-center">{loan.quantityLoaned}</TableCell>
                      <TableCell>{format(loan.expectedReturnDate.toDate(), 'PPP')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
          availableQuantity={currentItemToLoan.availableQuantity}
        />
      )}
    </div>
  );
}
