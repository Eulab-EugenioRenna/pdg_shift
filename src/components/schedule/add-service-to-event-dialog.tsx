
'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createService, getServiceTemplates, getLeaders } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import type { RecordModel } from 'pocketbase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '../ui/textarea';
import { useAuth } from '@/hooks/useAuth';

interface AddServiceToEventDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  eventId: string;
  churchId: string;
  onServiceAdded: () => void;
}

export function AddServiceToEventDialog({ isOpen, setIsOpen, eventId, churchId, onServiceAdded }: AddServiceToEventDialogProps) {
    const { user } = useAuth();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // Custom service form state
    const [customName, setCustomName] = useState('');
    const [customDescription, setCustomDescription] = useState('');
    const [customLeaderId, setCustomLeaderId] = useState('');
    
    // Template service form state
    const [serviceTemplates, setServiceTemplates] = useState<RecordModel[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [templateLeaderId, setTemplateLeaderId] = useState('');

    // Data
    const [leaders, setLeaders] = useState<RecordModel[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    
    const selectedTemplate = serviceTemplates.find(t => t.id === selectedTemplateId);

    useEffect(() => {
        if (isOpen) {
            setDataLoading(true);
            Promise.all([
                getServiceTemplates(user?.id, user?.role, churchId),
                getLeaders(churchId)
            ])
            .then(([templates, leadersData]) => {
                setServiceTemplates(templates);
                setLeaders(leadersData);
            })
            .catch(() => toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i dati necessari.' }))
            .finally(() => setDataLoading(false));
            
            // Reset forms
            setCustomName('');
            setCustomDescription('');
            setSelectedTemplateId('');
            setCustomLeaderId('');
            setTemplateLeaderId('');
        }
    }, [isOpen, churchId, toast, user]);
    
     useEffect(() => {
        if (selectedTemplate) {
            setTemplateLeaderId(selectedTemplate.leader || '');
        }
    }, [selectedTemplate]);


    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customName.trim()) {
            toast({ variant: 'destructive', title: 'Errore', description: 'Il nome del servizio è obbligatorio.' });
            return;
        }
        if (!customLeaderId) {
            toast({ variant: 'destructive', title: 'Errore', description: 'È obbligatorio assegnare un leader.' });
            return;
        }
        
        startTransition(async () => {
            const serviceData = {
                name: customName,
                description: customDescription,
                event: eventId,
                church: churchId,
                leader: customLeaderId,
                positions: [],
                team_assignments: {},
            };

            try {
                await createService(serviceData, user);
                toast({ title: 'Successo', description: 'Servizio creato con successo.' });
                onServiceAdded();
                setIsOpen(false);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Errore', description: error.message });
            }
        });
    };

    const handleTemplateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemplateId) {
            toast({ variant: 'destructive', title: 'Errore', description: 'Seleziona un modello di servizio.' });
            return;
        }
        if (!templateLeaderId) {
            toast({ variant: 'destructive', title: 'Errore', description: 'È obbligatorio assegnare un leader.' });
            return;
        }
        
        startTransition(async () => {
            if (!selectedTemplate) return;

            const serviceData = {
                name: selectedTemplate.name,
                description: selectedTemplate.description,
                event: eventId,
                church: churchId,
                leader: templateLeaderId,
                positions: selectedTemplate.positions || [],
                team_assignments: {},
            };
            
            try {
                await createService(serviceData, user);
                toast({ title: 'Successo', description: 'Servizio aggiunto con successo.' });
                onServiceAdded();
                setIsOpen(false);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Errore', description: error.message });
            }
        });
    }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi Servizio all'Evento</DialogTitle>
          <DialogDescription>
            Aggiungi un servizio da un modello pre-configurato o creane uno nuovo. È obbligatorio assegnare un leader.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="template" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template">Da Modello</TabsTrigger>
            <TabsTrigger value="custom">Nuovo Servizio</TabsTrigger>
          </TabsList>
          <TabsContent value="template">
            <form onSubmit={handleTemplateSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="template-select">Modello di Servizio</Label>
                    <Select onValueChange={setSelectedTemplateId} value={selectedTemplateId} disabled={isPending || dataLoading || serviceTemplates.length === 0} required>
                        <SelectTrigger id="template-select">
                            <SelectValue placeholder="Seleziona un modello..." />
                        </SelectTrigger>
                        <SelectContent>
                            {serviceTemplates.length > 0 ? serviceTemplates.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                    {t.name}
                                </SelectItem>
                            )) : <p className="text-sm text-muted-foreground p-2">Nessun modello per questa chiesa.</p>}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="template-leader-select">Leader</Label>
                    <Select onValueChange={setTemplateLeaderId} value={templateLeaderId} disabled={isPending || dataLoading || leaders.length === 0} required>
                        <SelectTrigger id="template-leader-select">
                            <SelectValue placeholder={dataLoading ? "Caricamento..." : "Seleziona un leader"} />
                        </SelectTrigger>
                        <SelectContent>
                            {leaders.map((l) => (
                                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>Annulla</Button>
                    <Button type="submit" disabled={isPending || dataLoading || !selectedTemplateId}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Aggiungi Servizio
                    </Button>
                </DialogFooter>
            </form>
          </TabsContent>
          <TabsContent value="custom">
            <form onSubmit={handleCustomSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="custom-name">Nome Servizio</Label>
                <Input id="custom-name" value={customName} onChange={(e) => setCustomName(e.target.value)} disabled={isPending} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-description">Descrizione (opzionale)</Label>
                <Textarea id="custom-description" value={customDescription} onChange={(e) => setCustomDescription(e.target.value)} disabled={isPending} />
              </div>
               <div className="space-y-2">
                    <Label htmlFor="custom-leader-select">Leader</Label>
                    <Select onValueChange={setCustomLeaderId} value={customLeaderId} disabled={isPending || dataLoading || leaders.length === 0} required>
                        <SelectTrigger id="custom-leader-select">
                            <SelectValue placeholder={dataLoading ? "Caricamento..." : "Seleziona un leader"} />
                        </SelectTrigger>
                        <SelectContent>
                            {leaders.map((l) => (
                                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>Annulla</Button>
                <Button type="submit" disabled={isPending || dataLoading}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crea Servizio
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
