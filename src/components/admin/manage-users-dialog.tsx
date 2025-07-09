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
import { getUsers, addUserByAdmin, updateUserByAdmin, deleteUser, getChurches } from '@/app/actions';
import type { RecordModel } from 'pocketbase';
import { Loader2, Trash2, Edit, PlusCircle, UserCog, Upload } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pb } from '@/lib/pocketbase';
import { MultiSelect, type Option } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


function UserForm({ user, onSave, onCancel }: { user: RecordModel | null; onSave: () => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    passwordConfirm: '',
    role: user?.role || 'volontario',
    church: user?.expand?.church?.map((c: any) => c.id) || user?.church || [],
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(user?.avatar ? pb.getFileUrl(user, user.avatar, { thumb: '100x100' }) : null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [churches, setChurches] = useState<RecordModel[]>([]);
  const [churchesLoading, setChurchesLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const churchOptions: Option[] = churches.map(c => ({ value: c.id, label: c.name }));

  useEffect(() => {
    getChurches()
      .then(setChurches)
      .finally(() => setChurchesLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string) => (value: string | string[]) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (user) { // Editing user
      if (!formData.name.trim() || !formData.role || formData.church.length === 0) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Nome, Ruolo e almeno una Chiesa sono obbligatori.' });
        return;
      }
    } else { // Adding new user
      if (!formData.name.trim() || !formData.email.trim() || !formData.password || !formData.role || formData.church.length === 0) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Tutti i campi, inclusa la chiesa, sono obbligatori.' });
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
        const data = new FormData();
        data.append('name', formData.name.trim());
        data.append('role', formData.role);
        formData.church.forEach(c => data.append('church', c));
        
        if (avatarFile) {
          data.append('avatar', avatarFile);
        }

        if (user) {
          await updateUserByAdmin(user.id, data);
          toast({ title: 'Successo', description: 'Utente aggiornato con successo.' });
        } else {
          data.append('email', formData.email.trim());
          data.append('password', formData.password);
          data.append('passwordConfirm', formData.passwordConfirm);
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
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="flex flex-col items-center gap-4 col-span-full">
          <Avatar className="w-24 h-24">
              <AvatarImage src={preview || `https://placehold.co/100x100.png`} alt="Avatar preview" />
              <AvatarFallback>{formData.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              {preview ? 'Cambia Avatar' : 'Carica Avatar'}
          </Button>
          <Input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
          />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Nome e Cognome</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} disabled={isPending} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} disabled={isPending || !!user} required={!user} />
        </div>
      
        {!user && (
           <>
              <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} disabled={isPending} required={!user} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">Conferma Password</Label>
                  <Input id="passwordConfirm" name="passwordConfirm" type="password" value={formData.passwordConfirm} onChange={handleChange} disabled={isPending} required={!user} />
              </div>
           </>
        )}
      
        <div className="space-y-2">
          <Label htmlFor="church">Chiesa/e</Label>
          <MultiSelect
            options={churchOptions}
            selected={formData.church}
            onChange={handleSelectChange('church')}
            placeholder={churchesLoading ? "caricamento..." : "Seleziona una o più chiese"}
            disabled={churchesLoading || isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Ruolo</Label>
          <Select name="role" onValueChange={handleSelectChange('role')} value={formData.role} required disabled={isPending}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Seleziona un ruolo" /></SelectTrigger>
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

  const ChurchList = ({ user }: { user: RecordModel }) => {
    const churches = user.expand?.church;
    if (!churches || churches.length === 0) {
        return <>N/A</>;
    }
    if (churches.length === 1) {
        return <>{churches[0].name}</>;
    }
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-auto p-1 text-left justify-start">
                    <div className="flex items-center gap-2">
                        <span>{churches[0].name}</span>
                        <Badge variant="secondary">+{churches.length - 1}</Badge>
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
                <div className="text-sm font-semibold mb-2">Chiese associate</div>
                <ul className="space-y-1">
                    {churches.map((c: any) => (
                        <li key={c.id} className="text-sm">{c.name}</li>
                    ))}
                </ul>
            </PopoverContent>
        </Popover>
    );
  };

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
                            <TableCell><ChurchList user={user} /></TableCell>
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
