'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getChurches, addChurch, updateChurch, deleteChurch } from '@/app/actions';
import type { RecordModel } from 'pocketbase';
import { Loader2, Trash2, Edit, Save, PlusCircle, Building, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function ManageChurchesDialog() {
  const [open, setOpen] = useState(false);
  const [churches, setChurches] = useState<RecordModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newChurchName, setNewChurchName] = useState('');
  const [editingChurch, setEditingChurch] = useState<{ id: string; name: string } | null>(null);
  const [churchToDelete, setChurchToDelete] = useState<RecordModel | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const fetchAndSetChurches = useCallback(async () => {
    setIsLoading(true);
    try {
      const records = await getChurches();
      setChurches(records);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare le chiese.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      fetchAndSetChurches();
    }
  }, [open, fetchAndSetChurches]);

  const handleAddChurch = () => {
    if (!newChurchName.trim()) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Il nome della chiesa non può essere vuoto.' });
      return;
    }
    startTransition(async () => {
      try {
        await addChurch(newChurchName.trim());
        toast({ title: 'Successo', description: 'Chiesa aggiunta con successo.' });
        setNewChurchName('');
        fetchAndSetChurches();
      } catch (error) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile aggiungere la chiesa.' });
      }
    });
  };

  const handleUpdateChurch = () => {
      if (!editingChurch || !editingChurch.name.trim()) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Il nome della chiesa non può essere vuoto.' });
      return;
    }
    startTransition(async () => {
      try {
        await updateChurch(editingChurch.id, editingChurch.name.trim());
        toast({ title: 'Successo', description: 'Chiesa aggiornata con successo.' });
        setEditingChurch(null);
        fetchAndSetChurches();
      } catch (error) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile aggiornare la chiesa.' });
      }
    });
  }

  const handleDeleteChurch = () => {
    if (!churchToDelete) return;

    startTransition(async () => {
        try {
            await deleteChurch(churchToDelete.id);
            toast({ title: 'Successo', description: 'Chiesa eliminata con successo.' });
            setChurchToDelete(null);
            fetchAndSetChurches();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile eliminare la chiesa.' });
        }
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Building className="mr-2" />
            Gestisci Chiese
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gestione Chiese</DialogTitle>
            <DialogDescription>
              Aggiungi, modifica o elimina le chiese dalla piattaforma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nome della nuova chiesa"
                value={newChurchName}
                onChange={(e) => setNewChurchName(e.target.value)}
                disabled={isPending}
                 onKeyDown={(e) => e.key === 'Enter' && handleAddChurch()}
              />
              <Button onClick={handleAddChurch} disabled={isPending || !newChurchName.trim()}>
                {isPending ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                <span className="ml-2 hidden sm:inline">Aggiungi</span>
              </Button>
            </div>
            <div className="rounded-md border max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome Chiesa</TableHead>
                      <TableHead className="text-right w-[120px]">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {churches.length > 0 ? churches.map((church) => (
                      <TableRow key={church.id}>
                        <TableCell>
                          {editingChurch?.id === church.id ? (
                            <Input
                              value={editingChurch.name}
                              onChange={(e) => setEditingChurch({ ...editingChurch, name: e.target.value })}
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateChurch()}
                            />
                          ) : (
                            church.name
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingChurch?.id === church.id ? (
                            <div className="flex gap-2 justify-end">
                              <Button size="icon" onClick={handleUpdateChurch} disabled={isPending}>
                                  <Save className="h-4 w-4"/>
                              </Button>
                              <Button size="icon" variant="outline" onClick={() => setEditingChurch(null)} disabled={isPending}>
                                  <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-end">
                              <Button size="icon" variant="ghost" onClick={() => setEditingChurch({id: church.id, name: church.name})}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setChurchToDelete(church)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center h-24">Nessuna chiesa trovata.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Chiudi</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!churchToDelete} onOpenChange={(isOpen) => !isOpen && setChurchToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Questa azione non può essere annullata. Questo eliminerà permanentemente la chiesa
                    "{churchToDelete?.name}".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteChurch} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                    {isPending ? <Loader2 className="animate-spin" /> : "Elimina"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
