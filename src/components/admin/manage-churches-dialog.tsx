'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { getChurches, deleteChurch } from '@/app/actions';
import type { RecordModel } from 'pocketbase';
import { Loader2, Trash2, Edit, PlusCircle, Building, ArrowUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { pb } from '@/lib/pocketbase';
import { ChurchForm } from '@/components/admin/church-form';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '../ui/scroll-area';


export function ManageChurchesDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [churchToEdit, setChurchToEdit] = useState<RecordModel | null>(null);

  const [churches, setChurches] = useState<RecordModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [churchToDelete, setChurchToDelete] = useState<RecordModel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    
    setIsLoading(true);
    getChurches(user?.id, user?.role)
        .then(setChurches)
        .catch(() => {
            toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare le chiese.' });
        })
        .finally(() => setIsLoading(false));

    const handleSubscription = ({ action, record }: { action: string; record: RecordModel }) => {
        // A simple refetch might be easier than complex state management with role-based filtering
        getChurches(user?.id, user?.role).then(setChurches);
    };
    
    pb.collection('pdg_church').subscribe('*', handleSubscription);
    
    return () => {
        pb.collection('pdg_church').unsubscribe('*');
    };
    
  }, [open, toast, user]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const processedChurches = useMemo(() => {
    let filtered = churches.filter(church =>
        church.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig) {
        filtered.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (!aValue || !bValue) return 0;

            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }

    return filtered;
  }, [churches, searchTerm, sortConfig]);

  useEffect(() => {
    if (open) {
      setView('list'); // Reset view on open
    }
  }, [open]);

  const handleEdit = (church: RecordModel) => {
    setChurchToEdit(church);
    setView('form');
  }

  const handleAdd = () => {
    setChurchToEdit(null);
    setView('form');
  }

  const handleBackToList = () => {
    setView('list');
    setChurchToEdit(null);
  }

  const handleDeleteChurch = () => {
    if (!churchToDelete) return;
    setIsDeleting(true);
    deleteChurch(churchToDelete.id)
      .then(() => {
        toast({ title: 'Successo', description: 'Chiesa eliminata con successo.' });
      })
      .catch((error) => {
        toast({ variant: 'destructive', title: 'Errore', description: error.message });
      })
      .finally(() => {
        setIsDeleting(false);
        setChurchToDelete(null);
      });
  };

  const getDialogTitle = () => {
    if (view === 'form') {
      return churchToEdit ? 'Modifica Chiesa' : 'Aggiungi Nuova Chiesa';
    }
    return 'Gestione Chiese';
  }

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
            <DialogTitle>{getDialogTitle()}</DialogTitle>
             {view === 'list' && (
                <DialogDescription>
                    Aggiungi, modifica o elimina le chiese dalla piattaforma.
                </DialogDescription>
             )}
          </DialogHeader>

          {view === 'list' ? (
             <div className="space-y-4 py-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <Input
                        placeholder="Cerca chiese..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-xs"
                    />
                    <Button onClick={handleAdd} className="w-full md:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Chiesa</Button>
                </div>
                <ScrollArea className="h-[60vh] rounded-md border">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-[60px] px-2">Logo</TableHead>
                          <TableHead className="px-2">
                             <span className="hidden md:inline-flex">
                                <Button variant="ghost" onClick={() => requestSort('name')} className="px-0 hover:bg-transparent">
                                    Nome Chiesa
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                             </span>
                             <span className="md:hidden">Nome Chiesa</span>
                          </TableHead>
                          <TableHead className="text-right w-[120px] px-2">Azioni</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedChurches.length > 0 ? processedChurches.map((church) => (
                        <TableRow key={church.id}>
                            <TableCell className="p-2">
                                <Avatar>
                                    <AvatarImage src={church.logo ? pb.getFileUrl(church, church.logo, { thumb: '100x100' }) : `https://placehold.co/40x40.png`} alt={church.name} />
                                    <AvatarFallback>{church.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell className="font-medium p-2 whitespace-nowrap">{church.name}</TableCell>
                            <TableCell className="text-right p-2">
                                <div className="flex gap-2 justify-end">
                                    <Button size="icon" variant="ghost" onClick={() => handleEdit(church)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setChurchToDelete(church)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                        )) : (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center h-24">Nessuna chiesa trovata.</TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                )}
                </ScrollArea>
             </div>
          ) : (
             <ScrollArea className="h-[70vh] p-4">
                <ChurchForm 
                    church={churchToEdit}
                    onSave={handleBackToList}
                    onCancel={() => setView('list')}
                />
            </ScrollArea>
          )}

          {view === 'list' && (
            <DialogFooter>
                <DialogClose asChild>
                <Button variant="outline">Chiudi</Button>
                </DialogClose>
            </DialogFooter>
          )}

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
                <AlertDialogAction onClick={handleDeleteChurch} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="animate-spin" /> : "Elimina"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
