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
import { getEventTemplates, addEventTemplate, updateEventTemplate, deleteEventTemplate, getServiceTemplates } from '@/app/actions';
import type { RecordModel } from 'pocketbase';
import { Loader2, Trash2, Edit, PlusCircle, ClipboardPlus, ArrowUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '../ui/textarea';
import { MultiSelect, type Option } from '../ui/multi-select';
import { Badge } from '../ui/badge';
import { pb } from '@/lib/pocketbase';


function EventTemplateForm({ template, onSave, onCancel }: { template: RecordModel | null; onSave: () => void; onCancel: () => void }) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [selectedServices, setSelectedServices] = useState<string[]>(template?.service_templates || []);
  
  const [serviceTemplates, setServiceTemplates] = useState<RecordModel[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const serviceOptions: Option[] = serviceTemplates.map(s => ({ value: s.id, label: s.name }));

  useEffect(() => {
    getServiceTemplates()
      .then(setServiceTemplates)
      .finally(() => setServicesLoading(false));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Il nome del modello non può essere vuoto.' });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      selectedServices.forEach(id => formData.append('service_templates', id));

      try {
        if (template) {
          await updateEventTemplate(template.id, formData);
          toast({ title: 'Successo', description: 'Modello di evento aggiornato.' });
        } else {
          await addEventTemplate(formData);
          toast({ title: 'Successo', description: 'Modello di evento aggiunto.' });
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
        <Label htmlFor="template-name">Nome Modello</Label>
        <Input 
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          placeholder="Es. Culto Domenicale"
          required
        />
      </div>
       <div>
        <Label htmlFor="template-description">Descrizione (Opzionale)</Label>
        <Textarea 
          id="template-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          placeholder="Breve descrizione del modello di evento"
        />
      </div>
      <div>
        <Label htmlFor="service-templates">Tipi di Servizio inclusi</Label>
        <MultiSelect
            id="service-templates"
            options={serviceOptions}
            selected={selectedServices}
            onChange={setSelectedServices}
            placeholder={servicesLoading ? "Caricamento..." : "Seleziona i servizi"}
            disabled={servicesLoading || isPending}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Annulla</Button>
        <Button type="submit" disabled={isPending || servicesLoading}>
          {isPending ? <Loader2 className="animate-spin" /> : 'Salva'}
        </Button>
      </DialogFooter>
    </form>
  )
}


export function ManageEventTemplatesDialog() {
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
    getEventTemplates()
        .then(setTemplates)
        .catch(() => {
            toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i modelli di evento.' });
        })
        .finally(() => setIsLoading(false));

    const handleSubscription = async ({ action, record }: { action: string; record: RecordModel }) => {
        if (action === 'create' || action === 'update') {
            try {
                const fullRecord = await pb.collection('pdg_event_templates').getOne(record.id, { expand: 'service_templates' });
                if (action === 'create') {
                    setTemplates(prev => [...prev, fullRecord]);
                } else { // update
                    setTemplates(prev => prev.map(t => t.id === fullRecord.id ? fullRecord : t));
                }
            } catch (e) {
                console.error("Failed to fetch full event template record for subscription update:", e);
            }
        } else if (action === 'delete') {
            setTemplates(prev => prev.filter(t => t.id !== record.id));
        }
    };

    pb.collection('pdg_event_templates').subscribe('*', handleSubscription);

    return () => {
        pb.collection('pdg_event_templates').unsubscribe('*');
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
        template.name.toLowerCase().includes(searchTerm.toLowerCase())
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
    deleteEventTemplate(templateToDelete.id)
      .then(() => {
        toast({ title: 'Successo', description: 'Modello di evento eliminato.' });
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
      return templateToEdit ? 'Modifica Modello di Evento' : 'Aggiungi Nuovo Modello di Evento';
    }
    return 'Gestione Modelli di Evento';
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <ClipboardPlus className="mr-2" />
            Gestisci Modelli
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
             {view === 'list' && (
                <DialogDescription>
                    Aggiungi, modifica o elimina modelli di evento pre-configurati.
                </DialogDescription>
             )}
          </DialogHeader>

          {view === 'list' ? (
             <div className="space-y-4 py-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                     <Input
                        placeholder="Cerca modelli..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-xs"
                    />
                    <Button onClick={handleAdd} className="w-full md:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Modello</Button>
                </div>
                <div className="rounded-md border max-h-80 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead>
                            <span className="hidden md:inline-flex">
                                <Button variant="ghost" onClick={() => requestSort('name')} className="px-0 hover:bg-transparent">
                                    Nome Modello
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </span>
                            <span className="md:hidden">Nome Modello</span>
                          </TableHead>
                          <TableHead>Servizi Inclusi</TableHead>
                          <TableHead className="text-right w-[120px]">Azioni</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedTemplates.length > 0 ? processedTemplates.map((template) => (
                        <TableRow key={template.id}>
                            <TableCell className="font-medium">{template.name}</TableCell>
                            <TableCell>
                                <div className='flex flex-wrap gap-1'>
                                    {template.expand?.service_templates?.map((st: RecordModel) => (
                                        <Badge key={st.id} variant="secondary">{st.name}</Badge>
                                    )) || 'N/A'}
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
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
                            <TableCell colSpan={3} className="text-center h-24">Nessun modello di evento trovato.</TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                )}
                </div>
             </div>
          ) : (
            <EventTemplateForm 
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
                    Questa azione non può essere annullata. Questo eliminerà permanentemente il modello "{templateToDelete?.name}".
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
