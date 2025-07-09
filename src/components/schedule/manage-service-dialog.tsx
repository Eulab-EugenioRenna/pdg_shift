
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateService, getLeaders } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import type { RecordModel } from 'pocketbase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '../ui/textarea';

interface ManageServiceDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  service: RecordModel | null;
  churchId: string;
  onServiceUpdated: () => void;
}

export function ManageServiceDialog({ isOpen, setIsOpen, service, churchId, onServiceUpdated }: ManageServiceDialogProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [leaderId, setLeaderId] = useState('');
    
    // Data
    const [leaders, setLeaders] = useState<RecordModel[]>([]);
    const [leadersLoading, setLeadersLoading] = useState(true);
    
    useEffect(() => {
        if (isOpen && churchId) {
            setLeadersLoading(true);
            getLeaders(churchId)
                .then(setLeaders)
                .catch(() => toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i leader.' }))
                .finally(() => setLeadersLoading(false));
        }

        if (service) {
            setName(service.name);
            setDescription(service.description);
            setLeaderId(service.leader || '');
        }
    }, [isOpen, service, churchId, toast]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!service) return;

        startTransition(async () => {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);
            // If 'unassign' is selected, send an empty string to remove the relation
            formData.append('leader', leaderId === 'unassign' ? '' : leaderId);

            try {
                await updateService(service.id, formData);
                toast({ title: 'Successo', description: 'Servizio aggiornato con successo.' });
                onServiceUpdated();
                setIsOpen(false);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Errore', description: error.message });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Gestisci Servizio: {service?.name}</DialogTitle>
                <DialogDescription>
                    Modifica i dettagli del servizio e assegna un leader.
                </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="service-name">Nome Servizio</Label>
                        <Input id="service-name" value={name} onChange={(e) => setName(e.target.value)} disabled={isPending} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="service-description">Descrizione (opzionale)</Label>
                        <Textarea id="service-description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isPending} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="leader-select">Leader</Label>
                        <Select onValueChange={setLeaderId} value={leaderId} disabled={isPending || leadersLoading}>
                            <SelectTrigger id="leader-select">
                                <SelectValue placeholder={leadersLoading ? "Caricamento leader..." : "Seleziona un leader"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassign">Non assegnato</SelectItem>
                                {leaders.map((l) => (
                                    <SelectItem key={l.id} value={l.id}>
                                        {l.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>Annulla</Button>
                        <Button type="submit" disabled={isPending || leadersLoading}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salva Modifiche
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
