'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { deleteUser } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function DeleteAccountDialog() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!user) return;

    startTransition(async () => {
      try {
        await deleteUser(user.id);
        toast({ title: 'Successo', description: 'Il tuo account è stato eliminato con successo.' });
        // The logout function will handle clearing the auth store and redirecting the user.
        logout(); 
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Errore', description: error.message || 'Impossibile eliminare l\'account.' });
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Elimina il tuo account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
          <AlertDialogDescription>
            Questa azione non può essere annullata. Questo eliminerà permanentemente il tuo account
            e rimuoverà i tuoi dati dai nostri server.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
            Sì, elimina il mio account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
