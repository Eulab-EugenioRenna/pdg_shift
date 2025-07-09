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
import { createService, getServiceTemplates } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import type { RecordModel } from 'pocketbase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '../ui/textarea';

interface AddServiceToEventDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  eventId: string;
  churchId: string;
  onServiceAdded: () => void;
}

export function AddServiceToEventDialog({ isOpen, setIsOpen, eventId, churchId, onServiceAdded }: AddServiceToEventDialogProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // Custom service form state
    const [customName, setCustomName] = useState('');
    const [customDescription, setCustomDescription] = useState('');
    
    // Template service form state
    const [serviceTemplates, setServiceTemplates] = useState<RecordModel[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            getServiceTemplates()
                .then(setServiceTemplates)
                .catch(() => toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i modelli di servizio.' }));
            // Reset forms
            setCustomName('');
            setCustomDescription('');
            setSelectedTemplateId('');
        }
    }, [isOpen, toast]);

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customName.trim()) {
            toast({ variant: 'destructive', title: 'Errore', description: 'Il nome del servizio è obbligatorio.' });
            return;
        }
        
        startTransition(async () => {
            const formData = new FormData();
            formData.append('name', customName);
            formData.append('description', customDescription);
            formData.append('event', eventId);
            formData.append('church', churchId);

            try {
                await createService(formData);
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
        
        startTransition(async () => {
            const template = serviceTemplates.find(t => t.id === selectedTemplateId);
            if (!template) return;

            const formData = new FormData();
            formData.append('name', template.name);
            formData.append('description', template.description);
            formData.append('event', eventId);
            formData.append('church', churchId);
            
            try {
                await createService(formData);
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
            Aggiungi un servizio da un modello pre-configurato o creane uno nuovo.
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
                    <Select onValueChange={setSelectedTemplateId} value={selectedTemplateId} disabled={isPending || serviceTemplates.length === 0} required>
                        <SelectTrigger id="template-select">
                            <SelectValue placeholder="Seleziona un modello..." />
                        </SelectTrigger>
                        <SelectContent>
                            {serviceTemplates.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                    {t.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>Annulla</Button>
                    <Button type="submit" disabled={isPending}>
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
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>Annulla</Button>
                <Button type="submit" disabled={isPending}>
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
