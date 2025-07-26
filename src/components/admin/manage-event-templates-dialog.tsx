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
import { getEventTemplates, addEventTemplate, updateEventTemplate, deleteEventTemplate, getServiceTemplates, getChurches } from '@/app/actions';
import type { RecordModel } from 'pocketbase';
import { Loader2, Trash2, Edit, PlusCircle, ClipboardPlus, ArrowUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '../ui/textarea';
import { MultiSelect, type Option } from '../ui/multi-select';
import { Badge } from '../ui/badge';
import { pb } from '@/lib/pocketbase';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '../ui/scroll-area';


function EventTemplateForm({ template, onSave, onCancel }: { template: RecordModel | null; onSave: () => void; onCancel: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [selectedChurches, setSelectedChurches] = useState<string[]>(template?.churches || []);
  const [selectedServices, setSelectedServices] = useState<string[]>(template?.service_templates || []);
  
  const [allChurches, setAllChurches] = useState<RecordModel[]>([]);
  const [allServiceTemplates, setAllServiceTemplates] = useState<RecordModel[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const churchOptions: Option[] = allChurches.map(c => ({ value: c.id, label: c.name }));

  const filteredServiceOptions: Option[] = useMemo(() => {
    if (selectedChurches.length === 0) {
      return allServiceTemplates.map(s => ({ value: s.id, label: `${s.name} (${(s.expand?.church || []).map((c: any) => c.name).join(', ')})` }));
    }
    // Show only service templates that are available in ALL selected churches.
    return allServiceTemplates
      .filter(st => selectedChurches.every(churchId => (st.church || []).includes(churchId)))
      .map(s => ({ value: s.id, label: `${s.name} (${(s.expand?.church || []).map((c: any) => c.name).join(', ')})` }));
  }, [selectedChurches, allServiceTemplates]);

  useEffect(() => {
    setDataLoading(true);
    Promise.all([
      getChurches(user?.id, user?.role),
      getServiceTemplates(user?.id, user?.role)
    ]).then(([churchesData, servicesData]) => {
      setAllChurches(churchesData);
      setAllServiceTemplates(servicesData);
    }).catch(() => {
        toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i dati necessari.'})
    }).finally(() => {
      setDataLoading(false);
    });
  }, [toast, user]);

  useEffect(() => {
    // When selected churches change, filter the selected services
    const validServiceIds = new Set(filteredServiceOptions.map(opt => opt.value));
    setSelectedServices(prev => prev.filter(serviceId => validServiceIds.has(serviceId)));
  }, [selectedChurches, filteredServiceOptions]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Il nome del modello non può essere vuoto.' });
      return;
    }
     if (selectedChurches.length === 0) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Seleziona almeno una chiesa.' });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      
      selectedChurches.forEach(id => formData.append('churches', id));
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

  const showNoServicesMessage = selectedChurches.length > 0 && filteredServiceOptions.length === 0 && !dataLoading;

  return (
    <>
        <div className="flex-grow min-h-0 px-6">
            <ScrollArea className="h-full -mx-6 px-6">
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
                    <Label htmlFor="church-select">Chiese Applicabili</Label>
                    <MultiSelect
                        id="church-select"
                        options={churchOptions}
                        selected={selectedChurches}
                        onChange={setSelectedChurches}
                        placeholder={dataLoading ? "Caricamento..." : "Seleziona le chiese"}
                        disabled={dataLoading || isPending}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Questo modello sarà disponibile solo per le chiese selezionate.
                    </p>
                    </div>
                    <div>
                    <Label htmlFor="service-templates">Tipi di Servizio inclusi</Label>
                    <MultiSelect
                        id="service-templates"
                        options={filteredServiceOptions}
                        selected={selectedServices}
                        onChange={setSelectedServices}
                        placeholder={dataLoading ? "Caricamento..." : "Seleziona i servizi"}
                        disabled={dataLoading || isPending || selectedChurches.length === 0 || showNoServicesMessage}
                    />
                    {showNoServicesMessage ? (
                        <p className="text-xs text-destructive mt-1">
                            Nessun servizio disponibile per le chiese selezionate.
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground mt-1">
                            Vengono mostrati solo i servizi compatibili con le chiese selezionate.
                        </p>
                    )}
                    </div>
                </form>
            </ScrollArea>
        </div>
        <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Annulla</Button>
            <Button type="submit" onClick={handleSubmit} disabled={isPending || dataLoading}>
            {isPending ? <Loader2 className="animate-spin" /> : 'Salva'}
            </Button>
        </DialogFooter>
    </>
  )
}


export function ManageEventTemplatesDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [templateToEdit, setTemplateToEdit] = useState<RecordModel | null>(null);

  const [templates, setTemplates] = useState<RecordModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [templateToDelete, setTemplateToDelete] = useState<RecordModel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
  const [allChurches, setAllChurches] = useState<RecordModel[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    setIsLoading(true);
    Promise.all([
        getEventTemplates(user?.id, user?.role),
        getChurches(user?.id, user?.role)
    ])
    .then(([templatesData, churchesData]) => {
        setTemplates(templatesData);
        setAllChurches(churchesData);
    })
    .catch(() => {
        toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i modelli di evento.' });
    })
    .finally(() => setIsLoading(false));

    const handleSubscription = async ({ action, record }: { action: string; record: RecordModel }) => {
       getEventTemplates(user?.id, user?.role).then(setTemplates);
    };

    pb.collection('pdg_event_templates').subscribe('*', handleSubscription);

    return () => {
        pb.collection('pdg_event_templates').unsubscribe('*');
    };
  }, [open, toast, user]);

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
        setTemplateToDelete(null);
      })
      .catch((error) => {
        toast({ variant: 'destructive', title: 'Errore', description: error.message });
      })
      .finally(() => {
        setIsDeleting(false);
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
             {view === 'list' && (
                <DialogDescription>
                    Aggiungi, modifica o elimina modelli di evento con servizi pre-configurati.
                </DialogDescription>
             )}
          </DialogHeader>

          {view === 'list' ? (
             <>
                <div className="px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                     <Input
                        placeholder="Cerca modelli..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-xs"
                    />
                    <Button onClick={handleAdd} className="w-full md:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Modello</Button>
                </div>
                <div className="flex-grow min-h-0 px-6">
                    <ScrollArea className="h-full">
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
                                        Nome Modello
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </span>
                                <span className="md:hidden">Nome Modello</span>
                            </TableHead>
                            <TableHead className="w-1/3 px-2">Chiese</TableHead>
                            <TableHead className="w-1/3 px-2">Servizi Inclusi</TableHead>
                            <TableHead className="text-right w-[120px] px-2">Azioni</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processedTemplates.length > 0 ? processedTemplates.map((template) => (
                            <TableRow key={template.id}>
                                <TableCell className="font-medium p-2 whitespace-nowrap">{template.name}</TableCell>
                                <TableCell className="p-2">
                                    <div className='flex flex-wrap gap-1'>
                                        {(template.expand?.churches || []).map((church: RecordModel) => (
                                            <Badge key={church.id} variant="secondary">{church.name}</Badge>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell className="p-2">
                                    <div className='flex flex-wrap gap-1'>
                                        {template.expand?.service_templates?.map((st: RecordModel) => (
                                            <Badge key={st.id} variant="secondary">{st.name}</Badge>
                                        )) || 'N/A'}
                                    </div>
                                </TableCell>
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
                                <TableCell colSpan={4} className="text-center h-24">Nessun modello di evento trovato.</TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    )}
                    </ScrollArea>
                </div>
                 <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Chiudi</Button>
                    </DialogClose>
                </DialogFooter>
            </>
          ) : (
            <EventTemplateForm 
              template={templateToEdit}
              onSave={handleBackToList}
              onCancel={() => setView('list')}
            />
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
