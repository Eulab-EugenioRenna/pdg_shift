'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createEvent, getEventTemplates } from '@/app/actions';
import { Loader2, PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
import type { RecordModel } from 'pocketbase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Textarea } from '../ui/textarea';


export function ManageEventDialog({ userChurches, selectedChurchId, onEventCreated }: { userChurches: RecordModel[], selectedChurchId: string, onEventCreated: () => void }) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [church, setChurch] = useState(selectedChurchId);
    const [date, setDate] = useState<Date | undefined>();
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const [eventTemplates, setEventTemplates] = useState<RecordModel[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');


    useEffect(() => {
        if (open) {
            getEventTemplates()
                .then(setEventTemplates)
                .catch(() => toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i modelli di evento.' }));
            // Reset form on open
            setName('');
            setDescription('');
            setDate(undefined);
            setStartTime('');
            setEndTime('');
            setSelectedTemplateId('');
            setChurch(selectedChurchId);
        }
    }, [open, selectedChurchId, toast]);

    const handleTemplateChange = (templateId: string) => {
        const template = eventTemplates.find(t => t.id === templateId);
        if (template) {
            setSelectedTemplateId(template.id);
            setName(template.name);
            setDescription(template.description);
        } else {
            setSelectedTemplateId('');
            setName('');
            setDescription('');
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !startTime || !endTime || !name) {
            toast({ variant: 'destructive', title: 'Errore', description: 'Tutti i campi (eccetto la descrizione) sono obbligatori.' });
            return;
        }

        const startDateTime = new Date(date);
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        startDateTime.setHours(startHours, startMinutes, 0, 0);

        const endDateTime = new Date(date);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        endDateTime.setHours(endHours, endMinutes, 0, 0);

        if (endDateTime <= startDateTime) {
            toast({ variant: 'destructive', title: 'Errore', description: "L'orario di fine deve essere successivo all'orario di inizio." });
            return;
        }

        startTransition(async () => {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description);
            formData.append('church', church);
            formData.append('start_date', startDateTime.toISOString());
            formData.append('end_date', endDateTime.toISOString());
            if (selectedTemplateId) {
                formData.append('templateId', selectedTemplateId);
            }

            try {
                await createEvent(formData);
                toast({ title: 'Successo', description: 'Evento creato con successo.' });
                onEventCreated();
                setOpen(false);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Errore nella creazione', description: error.message });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Crea Evento
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Crea Nuovo Evento</DialogTitle>
                    <DialogDescription>
                        Compila i dettagli per creare un nuovo evento. Puoi partire da un modello per velocizzare.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="event-template">Modello (Opzionale)</Label>
                        <Select onValueChange={handleTemplateChange} value={selectedTemplateId} disabled={isPending || eventTemplates.length === 0}>
                            <SelectTrigger id="event-template">
                                <SelectValue placeholder="Seleziona un modello" />
                            </SelectTrigger>
                            <SelectContent>
                                {eventTemplates.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                     <div className="space-y-2">
                        <Label htmlFor="event-name">Nome Evento</Label>
                        <Input id="event-name" value={name} onChange={(e) => setName(e.target.value)} disabled={isPending} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="event-description">Descrizione (opzionale)</Label>
                        <Textarea id="event-description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isPending} />
                    </div>
                    
                    {userChurches.length > 1 && (
                        <div className="space-y-2">
                            <Label htmlFor="event-church">Chiesa</Label>
                            <Select onValueChange={setChurch} value={church} required disabled={isPending}>
                                <SelectTrigger id="event-church">
                                    <SelectValue placeholder="Seleziona una chiesa" />
                                </SelectTrigger>
                                <SelectContent>
                                    {userChurches.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    
                     <div className="space-y-2">
                        <Label htmlFor="event-date">Data</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="event-date"
                                    variant={"outline"}
                                    className={"w-full justify-start text-left font-normal"}
                                    disabled={isPending}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: it }) : <span>Seleziona una data</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start-time">Orario di Inizio</Label>
                            <Input id="start-time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} disabled={isPending} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end-time">Orario di Fine</Label>
                            <Input id="end-time" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} disabled={isPending} required />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Annulla</Button>
                        <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crea Evento
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
