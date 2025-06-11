
"use client";

import type React from 'react';
import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ChromeIcon } from 'lucide-react'; // Or a generic Google icon if available

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthDialog: React.FC<AuthDialogProps> = ({ isOpen, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: 'Login Successful!', description: 'Welcome!' });
      onClose();
    } catch (err: any) {
      console.error("Google Sign-In error:", err);
      toast({ title: 'Login Failed', description: err.message || 'Could not sign in with Google. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-xs bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline text-center">Sign In</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Sign in with your Google account to manage bookings.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 px-2">
          <Button
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full"
            variant="outline"
          >
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.7 512 244 512 110.5 512 0 398.8 0 256S110.5 0 244 0c69.8 0 130.8 28.5 173.4 74.2L345 146.1c-29.3-27.9-67.8-46.4-107.2-46.4-82.3 0-150.1 67.8-150.1 150.1s67.8 150.1 150.1 150.1c88.3 0 126.8-66.9 130.3-101.6H244v-70.8h244c2.6 13.1 4.3 28.3 4.3 43.1z"></path></svg>
            {isSubmitting ? 'Signing In...' : 'Sign in with Google'}
          </Button>
        </div>
        <DialogFooter className="flex justify-center text-xs text-muted-foreground pb-4 px-2">
          By signing in, you agree to our terms.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
