'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
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
import { getServiceTemplates, addServiceTemplate, updateServiceTemplate, deleteServiceTemplate, getChurches, getLeaders } from '@/app/actions';
import type { RecordModel } from 'pocketbase';
import { Loader2, Trash2, Edit, PlusCircle, ListTodo, ArrowUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '../ui/textarea';
import { pb } from '@/lib/pocketbase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';


function ServiceTemplateForm({ template, onSave, onCancel }: { template: RecordModel | null; onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [positions, setPositions] = useState(template?.positions?.join(', ') || '');
  const [churchId, setChurchId] = useState(template?.church || '');
  const [leaderId, setLeaderId] = useState(template?.leader || '');

  const [churches, setChurches] = useState<RecordModel[]>([]);
  const [leaders, setLeaders] = useState<RecordModel[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    getChurches()
        .then(setChurches)
        .catch(() => toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare le chiese.'}))
        .finally(() => setDataLoading(false));
  }, [toast]);
  
  useEffect(() => {
    if (churchId) {
        setDataLoading(true);
        getLeaders(churchId)
            .then(setLeaders)
            .catch(() => toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i leader per questa chiesa.'}))
            .finally(() => setDataLoading(false));
    } else {
        setLeaders([]);
    }
  }, [churchId, toast]);

  const handleChurchChange = (value: string) => {
    setChurchId(value);
    setLeaderId(''); // Reset leader when church changes
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !churchId) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Nome e Chiesa sono obbligatori.' });
      return;
    }

    startTransition(async () => {
      const data = {
        name: name.trim(),
        description: description.trim(),
        positions: positions.split(',').map(p => p.trim()).filter(Boolean),
        church: churchId,
        leader: leaderId || null,
      };

      try {
        if (template) {
          await updateServiceTemplate(template.id, data);
          toast({ title: 'Successo', description: 'Tipo di servizio aggiornato con successo.' });
        } else {
          await addServiceTemplate(data);
          toast({ title: 'Successo', description: 'Tipo di servizio aggiunto con successo.' });
        }
        onSave();
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Errore', description: error.message });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div>
        <Label htmlFor="template-name">Nome Tipo di Servizio</Label>
        <Input 
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          placeholder="Es. Team Lode"
          required
        />
      </div>
      <div>
        <Label htmlFor="church-select">Chiesa</Label>
        <Select onValueChange={handleChurchChange} value={churchId} disabled={isPending || dataLoading} required>
            <SelectTrigger id="church-select">
                <SelectValue placeholder="Seleziona una chiesa..." />
            </SelectTrigger>
            <SelectContent>
                {churches.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>
       <div>
        <Label htmlFor="template-description">Descrizione (Opzionale)</Label>
        <Textarea 
          id="template-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          placeholder="Breve descrizione del servizio"
        />
      </div>
       <div>
        <Label htmlFor="template-positions">Posizioni del Team</Label>
        <Textarea 
          id="template-positions"
          value={positions}
          onChange={(e) => setPositions(e.target.value)}
          disabled={isPending}
          placeholder="Elenco di posizioni separate da virgola (es. Voce, Chitarra, Batteria)"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Inserisci le posizioni richieste per questo servizio, separate da una virgola.
        </p>
      </div>
      <div>
        <Label htmlFor="leader-select">Leader Predefinito (Opzionale)</Label>
        <Select onValueChange={setLeaderId} value={leaderId} disabled={isPending || dataLoading || !churchId || leaders.length === 0}>
            <SelectTrigger id="leader-select">
                <SelectValue placeholder={!churchId ? "Prima seleziona una chiesa" : "Seleziona un leader..."} />
            </SelectTrigger>
            <SelectContent>
                 <SelectItem value="">Nessun leader predefinito</SelectItem>
                {leaders.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Annulla</Button>
        <Button type="submit" disabled={isPending || dataLoading}>
          {isPending ? <Loader2 className="animate-spin" /> : 'Salva'}
        </Button>
      </DialogFooter>
    </form>
  )
}


export function ManageServiceTemplatesDialog() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [templateToEdit, setTemplateToEdit] = useState<RecordModel | null>(null);

  const [templates, setTemplates] = useState<RecordModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [templateToDelete, setTemplateToDelete] = useState<RecordModel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
  
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    setIsLoading(true);
    getServiceTemplates()
        .then(setTemplates)
        .catch(() => {
            toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i tipi di servizio.' });
        })
        .finally(() => setIsLoading(false));

    const handleSubscription = async ({ action, record }: { action: string; record: RecordModel }) => {
        const fullRecord = await pb.collection('pdg_service_templates').getOne(record.id, { expand: 'church,leader'});
        if (action === 'create') {
            setTemplates(prev => [...prev, fullRecord]);
        } else if (action === 'update') {
            setTemplates(prev => prev.map(t => t.id === fullRecord.id ? fullRecord : t));
        } else if (action === 'delete') {
            setTemplates(prev => prev.filter(t => t.id !== record.id));
        }
    };

    pb.collection('pdg_service_templates').subscribe('*', handleSubscription);

    return () => {
        pb.collection('pdg_service_templates').unsubscribe('*');
    };
  }, [open, toast]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const processedTemplates = useMemo(() => {
    let filtered = templates.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase())
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
  }, [templates, searchTerm, sortConfig]);

  useEffect(() => {
    if (open) {
      setView('list');
    }
  }, [open]);

  const handleEdit = (template: RecordModel) => {
    setTemplateToEdit(template);
    setView('form');
  }

  const handleAdd = () => {
    setTemplateToEdit(null);
    setView('form');
  }

  const handleBackToList = () => {
    setView('list');
    setTemplateToEdit(null);
  }

  const handleDeleteTemplate = () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    deleteServiceTemplate(templateToDelete.id)
      .then(() => {
        toast({ title: 'Successo', description: 'Tipo di servizio eliminato con successo.' });
      })
      .catch((error) => {
        toast({ variant: 'destructive', title: 'Errore', description: error.message });
      })
      .finally(() => {
        setIsDeleting(false);
        setTemplateToDelete(null);
      });
  };

  const getDialogTitle = () => {
    if (view === 'form') {
      return templateToEdit ? 'Modifica Tipo di Servizio' : 'Aggiungi Nuovo Tipo di Servizio';
    }
    return 'Gestione Tipi di Servizio';
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <ListTodo className="mr-2" />
            Gestisci Tipi Servizio
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
             {view === 'list' && (
                <DialogDescription>
                    Aggiungi, modifica o elimina i tipi di servizio riutilizzabili.
                </DialogDescription>
             )}
          </DialogHeader>

          {view === 'list' ? (
             <div className="space-y-4 py-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                     <Input
                        placeholder="Cerca tipi di servizio..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-xs"
                    />
                    <Button onClick={handleAdd} className="w-full md:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Tipo</Button>
                </div>
                <div className="rounded-md border max-h-80 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Table className="table-fixed">
                    <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-1/3 px-2">
                             <span className="hidden md:inline-flex">
                                <Button variant="ghost" onClick={() => requestSort('name')} className="px-0 hover:bg-transparent">
                                    Nome
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                             </span>
                             <span className="md:hidden">Nome</span>
                          </TableHead>
                          <TableHead className="w-1/3 px-2">Chiesa</TableHead>
                           <TableHead className="w-1/3 px-2">Leader Predefinito</TableHead>
                          <TableHead className="text-right w-[120px] px-2">Azioni</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedTemplates.length > 0 ? processedTemplates.map((template) => (
                        <TableRow key={template.id}>
                            <TableCell className="font-medium p-2 whitespace-nowrap">{template.name}</TableCell>
                             <TableCell className="p-2 whitespace-nowrap">{template.expand?.church?.name || 'N/A'}</TableCell>
                            <TableCell className="p-2 whitespace-nowrap">{template.expand?.leader?.name || 'Nessuno'}</TableCell>
                            <TableCell className="text-right p-2">
                                <div className="flex gap-2 justify-end">
                                    <Button size="icon" variant="ghost" onClick={() => handleEdit(template)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setTemplateToDelete(template)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                        )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center h-24">Nessun tipo di servizio trovato.</TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                )}
                </div>
             </div>
          ) : (
            <ServiceTemplateForm 
              template={templateToEdit}
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
      <AlertDialog open={!!templateToDelete} onOpenChange={(isOpen) => !isOpen && setTemplateToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Questa azione non può essere annullata. Questo eliminerà permanentemente il tipo di servizio "{templateToDelete?.name}".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTemplate} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="animate-spin" /> : "Elimina"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
