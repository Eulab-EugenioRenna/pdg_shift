
'use client';

import { useState, useEffect, useTransition, useCallback, useRef, useMemo } from 'react';
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
import { getUsers, deleteUser, getChurches } from '@/app/actions';
import type { RecordModel } from 'pocketbase';
import { Loader2, Trash2, Edit, PlusCircle, UserCog, ArrowUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pb } from '@/lib/pocketbase';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserForm } from '@/components/admin/user-form';
import { useAuth } from '@/hooks/useAuth';


export function ManageUsersDialog() {
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [userToEdit, setUserToEdit] = useState<RecordModel | null>(null);
  const [users, setUsers] = useState<RecordModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<RecordModel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [allChurches, setAllChurches] = useState<RecordModel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [churchFilter, setChurchFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

  const { toast } = useToast();

  useEffect(() => {
    if (!open || !currentUser) return;
    
    setIsLoading(true);
    Promise.all([getUsers(currentUser.id, currentUser.role), getChurches(currentUser.id, currentUser.role)])
        .then(([usersData, churchesData]) => {
            setUsers(usersData);
            setAllChurches(churchesData);
        })
        .catch(() => {
            toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare dati.' });
        })
        .finally(() => setIsLoading(false));

    const handleSubscription = async ({ action, record }: { action: string; record: RecordModel }) => {
        // Simple refetch to ensure data consistency based on role
        getUsers(currentUser.id, currentUser.role).then(setUsers);
    };
    
    pb.collection('pdg_users').subscribe('*', handleSubscription);
    
    return () => {
        pb.collection('pdg_users').unsubscribe('*');
    };
    
  }, [open, toast, currentUser]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const processedUsers = useMemo(() => {
    let filtered = users.filter(user =>
        (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (roleFilter === 'all' || user.role === roleFilter) &&
        (churchFilter === 'all' || (user.church && user.church.includes(churchFilter)))
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
  }, [users, searchTerm, roleFilter, churchFilter, sortConfig]);

  useEffect(() => {
    if (open) {
      setView('list');
    }
  }, [open]);

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
  }

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    deleteUser(userToDelete.id)
      .then(() => {
        toast({ title: 'Successo', description: 'Utente eliminato con successo.' });
      })
      .catch((error) => {
        toast({ variant: 'destructive', title: 'Errore', description: error.message });
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
  
  const canManageUser = (targetUser: RecordModel) => {
    if (!currentUser) return false;
    if (currentUser.role === 'superuser') return true;
    if (currentUser.role === 'coordinatore' && targetUser.role !== 'superuser') return true;
    return false;
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
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                     <Input
                        placeholder="Cerca per nome o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                    />
                    <div className='flex flex-col sm:flex-row gap-2 w-full md:w-auto'>
                      <Select value={churchFilter} onValueChange={setChurchFilter}>
                          <SelectTrigger className="w-full sm:w-[180px]">
                              <SelectValue placeholder="Filtra per chiesa" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Tutte le chiese</SelectItem>
                              {allChurches.map(church => (
                                  <SelectItem key={church.id} value={church.id}>{church.name}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                          <SelectTrigger className="w-full sm:w-[150px]">
                              <SelectValue placeholder="Filtra per ruolo" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Tutti i ruoli</SelectItem>
                              {currentUser?.role === 'superuser' && <SelectItem value="superuser">Superuser</SelectItem>}
                              {(currentUser?.role === 'superuser' || currentUser?.role === 'coordinatore') && <SelectItem value="coordinatore">Coordinatore</SelectItem>}
                              <SelectItem value="leader">Leader</SelectItem>
                              <SelectItem value="volontario">Volontario</SelectItem>
                          </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAdd} className="w-full md:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Utente</Button>
                </div>
                <div className="rounded-md border max-h-[60vh] overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (
                    <Table className="table-fixed">
                    <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-[60px] px-2">Avatar</TableHead>
                          <TableHead className="w-1/4 px-2">
                            <span className="hidden md:inline-flex">
                                <Button variant="ghost" onClick={() => requestSort('name')} className="px-0 hover:bg-transparent">
                                    Nome
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </span>
                            <span className="md:hidden">Nome</span>
                          </TableHead>
                          <TableHead className="w-1/4 px-2">
                            <span className="hidden md:inline-flex">
                                <Button variant="ghost" onClick={() => requestSort('email')} className="px-0 hover:bg-transparent">
                                    Email
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </span>
                            <span className="md:hidden">Email</span>
                          </TableHead>
                          <TableHead className="w-1/4 px-2">Chiesa</TableHead>
                          <TableHead className="w-1/4 px-2">
                            <span className="hidden md:inline-flex">
                                <Button variant="ghost" onClick={() => requestSort('role')} className="px-0 hover:bg-transparent">
                                    Ruolo
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </span>
                             <span className="md:hidden">Ruolo</span>
                          </TableHead>
                          <TableHead className="text-right w-[120px] px-2">Azioni</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedUsers.map((user) => {
                            const canManage = canManageUser(user);
                            return (
                                <TableRow key={user.id}>
                                    <TableCell className="p-2">
                                        <Avatar>
                                            <AvatarImage src={user.avatar ? pb.getFileUrl(user, user.avatar, { thumb: '100x100' }) : `https://placehold.co/40x40.png`} alt={user.name} />
                                            <AvatarFallback>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell className="font-medium p-2 whitespace-nowrap">{user.name}</TableCell>
                                    <TableCell className="p-2 whitespace-nowrap truncate">{user.email}</TableCell>
                                    <TableCell className="p-2 whitespace-nowrap"><ChurchList user={user} /></TableCell>
                                    <TableCell className="capitalize p-2 whitespace-nowrap">{user.role}</TableCell>
                                    <TableCell className="text-right p-2">
                                        <div className="flex gap-2 justify-end">
                                            <Button size="icon" variant="ghost" onClick={() => handleEdit(user)} disabled={!canManage} title={!canManage ? "Non hai i permessi per modificare questo utente" : "Modifica utente"}><Edit className="h-4 w-4" /></Button>
                                            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setUserToDelete(user)} disabled={!canManage} title={!canManage ? "Non hai i permessi per eliminare questo utente" : "Elimina utente"}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                    </Table>
                )}
                </div>
             </div>
          ) : (
            <UserForm 
                user={userToEdit}
                onSave={handleBackToList}
                onCancel={() => setView('list')}
            />
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
                <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="animate-spin" /> : "Elimina"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
