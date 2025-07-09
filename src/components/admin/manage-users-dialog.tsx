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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getUsers, addUserByAdmin, updateUserByAdmin, deleteUser, getChurches } from '@/app/actions';
import type { RecordModel } from 'pocketbase';
import { Loader2, Trash2, Edit, PlusCircle, UserCog } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pb } from '@/lib/pocketbase';


function UserForm({ user, onSave, onCancel }: { user: RecordModel | null; onSave: () => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    passwordConfirm: '',
    role: user?.role || 'volontario',
    church: (user?.church && Array.isArray(user.church)) ? user.church[0] : (user?.church || ''),
  });
  const [churches, setChurches] = useState<RecordModel[]>([]);
  const [churchesLoading, setChurchesLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    getChurches()
      .then(setChurches)
      .finally(() => setChurchesLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (user) { // Editing user
      if (!formData.name.trim() || !formData.role || !formData.church) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Tutti i campi sono obbligatori.' });
        return;
      }
    } else { // Adding new user
      if (!formData.name.trim() || !formData.email.trim() || !formData.password || !formData.role || !formData.church) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Tutti i campi sono obbligatori.' });
        return;
      }
      if (formData.password !== formData.passwordConfirm) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Le password non coincidono.' });
        return;
      }
      if (formData.password.length < 8) {
        toast({ variant: 'destructive', title: 'Errore', description: 'La password deve avere almeno 8 caratteri.' });
        return;
      }
    }

    startTransition(async () => {
      try {
        if (user) {
          await updateUserByAdmin(user.id, {
            name: formData.name.trim(),
            role: formData.role,
            church: formData.church,
          });
          toast({ title: 'Successo', description: 'Utente aggiornato con successo.' });
        } else {
          const data = new FormData();
          data.append('name', formData.name.trim());
          data.append('email', formData.email.trim());
          data.append('password', formData.password);
          data.append('passwordConfirm', formData.passwordConfirm);
          data.append('role', formData.role);
          data.append('church', formData.church);
          await addUserByAdmin(data);
          toast({ title: 'Successo', description: 'Utente aggiunto con successo.' });
        }
        onSave();
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Errore', description: error.message });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome e Cognome</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} disabled={isPending} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} disabled={isPending || !!user} required={!user} />
        </div>
      </div>
      {!user && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} disabled={isPending} required={!user} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Conferma Password</Label>
                <Input id="passwordConfirm" name="passwordConfirm" type="password" value={formData.passwordConfirm} onChange={handleChange} disabled={isPending} required={!user} />
            </div>
         </div>
      )}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="church">Chiesa</Label>
          <Select name="church" onValueChange={handleSelectChange('church')} value={formData.church} required disabled={churchesLoading || isPending}>
            <SelectTrigger><SelectValue placeholder={churchesLoading ? "caricamento..." : "Seleziona una chiesa"} /></SelectTrigger>
            <SelectContent>
              {churches.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Ruolo</Label>
           <Select name="role" onValueChange={handleSelectChange('role')} value={formData.role} required disabled={isPending}>
            <SelectTrigger><SelectValue placeholder="Seleziona un ruolo" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="volontario">Volontario</SelectItem>
                <SelectItem value="leader">Leader</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Annulla</Button>
        <Button type="submit" disabled={isPending || churchesLoading}>
          {isPending ? <Loader2 className="animate-spin" /> : 'Salva'}
        </Button>
      </DialogFooter>
    </form>
  )
}


export function ManageUsersDialog() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [userToEdit, setUserToEdit] = useState<RecordModel | null>(null);
  const [users, setUsers] = useState<RecordModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<RecordModel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchAndSetUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const records = await getUsers();
      setUsers(records);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare gli utenti.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      fetchAndSetUsers();
      setView('list');
    }
  }, [open, fetchAndSetUsers]);

  const handleEdit = (user: RecordModel) => {
    setUserToEdit(user);
    setView('form');
  }

  const handleAdd = () => {
    setUserToEdit(null);
    setView('form');
  }

  const handleBackToList = () => {
    setView('list');
    setUserToEdit(null);
    fetchAndSetUsers();
  }

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    deleteUser(userToDelete.id)
      .then(() => {
        toast({ title: 'Successo', description: 'Utente eliminato con successo.' });
        fetchAndSetUsers();
      })
      .catch(() => {
        toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile eliminare l\'utente.' });
      })
      .finally(() => {
        setIsDeleting(false);
        setUserToDelete(null);
      });
  };

  const getDialogTitle = () => {
    if (view === 'form') {
      return userToEdit ? 'Modifica Utente' : 'Aggiungi Nuovo Utente';
    }
    return 'Gestione Utenti';
  }

  const getExpandedChurchName = (user: RecordModel) => {
    if (!user.expand?.church) return 'N/A';
    // Handle both single and multi-relation for display
    if (Array.isArray(user.expand.church)) {
        return user.expand.church.map(c => c.name).join(', ') || 'N/A';
    }
    return (user.expand.church as RecordModel).name;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <UserCog className="mr-2" />
            Gestisci Utenti
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
             {view === 'list' && (
                <DialogDescription>Aggiungi, modifica o elimina utenti e gestisci i loro ruoli.</DialogDescription>
             )}
          </DialogHeader>

          {view === 'list' ? (
             <div className="space-y-4 py-4">
                <div className="flex justify-end">
                    <Button onClick={handleAdd}><PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Utente</Button>
                </div>
                <div className="rounded-md border max-h-[60vh] overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                    <Table>
                    <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead className="w-[60px]">Avatar</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Chiesa</TableHead>
                          <TableHead>Ruolo</TableHead>
                          <TableHead className="text-right w-[120px]">Azioni</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length > 0 ? users.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell>
                                <Avatar>
                                    <AvatarImage src={user.avatar ? pb.getFileUrl(user, user.avatar, { thumb: '100x100' }) : `https://placehold.co/40x40.png`} alt={user.name} />
                                    <AvatarFallback>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{getExpandedChurchName(user)}</TableCell>
                            <TableCell className="capitalize">{user.role}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                    <Button size="icon" variant="ghost" onClick={() => handleEdit(user)}><Edit className="h-4 w-4" /></Button>
                                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setUserToDelete(user)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </TableCell>
                        </TableRow>
                        )) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">Nessun utente trovato.</TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                )}
                </div>
             </div>
          ) : (
            <UserForm user={userToEdit} onSave={handleBackToList} onCancel={() => setView('list')} />
          )}

          {view === 'list' && (
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Chiudi</Button></DialogClose>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Questa azione non può essere annullata. Questo eliminerà permanentemente l'utente "{userToDelete?.name}".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="animate-spin" /> : "Elimina"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
