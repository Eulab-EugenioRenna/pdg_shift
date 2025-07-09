'use client';

import { useState, useEffect, useTransition, useCallback, useRef } from 'react';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getChurches, addChurch, updateChurch, deleteChurch } from '@/app/actions';
import type { RecordModel } from 'pocketbase';
import { Loader2, Trash2, Edit, PlusCircle, Building, Upload } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { pb } from '@/lib/pocketbase';

// Form Component for Adding/Editing Churches
function ChurchForm({ church, onSave, onCancel }: { church: RecordModel | null; onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState(church?.name || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(church?.logo ? pb.getFileUrl(church, church.logo, { thumb: '100x100' }) : null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Il nome della chiesa non può essere vuoto.' });
      return;
    }
    if (!church && !logoFile) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Il logo è obbligatorio per una nuova chiesa.' });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      try {
        if (church) {
          await updateChurch(church.id, formData);
          toast({ title: 'Successo', description: 'Chiesa aggiornata con successo.' });
        } else {
          await addChurch(formData);
          toast({ title: 'Successo', description: 'Chiesa aggiunta con successo.' });
        }
        onSave();
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Errore', description: error.message });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="flex flex-col items-center gap-4">
          <Avatar className="w-24 h-24">
              <AvatarImage src={preview || `https://placehold.co/100x100.png`} alt="Logo preview" />
              <AvatarFallback><Building className="w-12 h-12" /></AvatarFallback>
          </Avatar>
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              {preview ? 'Cambia Logo' : 'Carica Logo'}
          </Button>
          <Input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
          />
      </div>
      <div>
        <Label htmlFor="church-name">Nome Chiesa</Label>
        <Input 
          id="church-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          placeholder="Nome della chiesa"
          required
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Annulla</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : 'Salva'}
        </Button>
      </DialogFooter>
    </form>
  )
}


export function ManageChurchesDialog() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [churchToEdit, setChurchToEdit] = useState<RecordModel | null>(null);

  const [churches, setChurches] = useState<RecordModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [churchToDelete, setChurchToDelete] = useState<RecordModel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
        return;
    }
    
    setIsLoading(true);
    getChurches()
        .then(records => {
            setChurches(records.sort((a,b) => a.name.localeCompare(b.name)));
        })
        .catch(() => {
            toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare le chiese.' });
        })
        .finally(() => {
            setIsLoading(false);
        });

    const handleSubscription = ({ action, record }: { action: string; record: RecordModel }) => {
        const sortChurches = (c: RecordModel[]) => c.sort((a,b) => a.name.localeCompare(b.name));
        
        if (action === 'create') {
            setChurches(prev => sortChurches([...prev, record]));
        } else if (action === 'update') {
            setChurches(prev => sortChurches(prev.map(c => c.id === record.id ? record : c)));
        } else if (action === 'delete') {
            setChurches(prev => prev.filter(c => c.id !== record.id));
        }
    };
    
    pb.collection('pdg_church').subscribe('*', handleSubscription);
    
    return () => {
        pb.collection('pdg_church').unsubscribe('*');
    };
    
  }, [open, toast]);

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
                <div className="flex justify-end">
                    <Button onClick={handleAdd}><PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Chiesa</Button>
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
                          <TableHead className="w-[60px]">Logo</TableHead>
                          <TableHead>Nome Chiesa</TableHead>
                          <TableHead className="text-right w-[120px]">Azioni</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {churches.length > 0 ? churches.map((church) => (
                        <TableRow key={church.id}>
                            <TableCell>
                                <Avatar>
                                    <AvatarImage src={church.logo ? pb.getFileUrl(church, church.logo, { thumb: '100x100' }) : `https://placehold.co/40x40.png`} alt={church.name} />
                                    <AvatarFallback>{church.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">{church.name}</TableCell>
                            <TableCell className="text-right">
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
                </div>
             </div>
          ) : (
            <ChurchForm 
              church={churchToEdit}
              onSave={handleBackToList}
              onCancel={() => setView('list')}
            />
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
