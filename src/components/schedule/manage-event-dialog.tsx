
'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createEvent, getEventTemplates, updateEvent } from '@/app/actions';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import type { RecordModel } from 'pocketbase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { useAuth } from '@/hooks/useAuth';

interface ManageEventDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    eventToEdit?: RecordModel | null;
    userChurches: RecordModel[];
    selectedChurchId: string;
    onEventUpserted: () => void;
}

export function ManageEventDialog({ 
    isOpen, 
    setIsOpen, 
    eventToEdit, 
    userChurches, 
    selectedChurchId, 
    onEventUpserted 
}: ManageEventDialogProps) {
    const { user } = useAuth();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [church, setChurch] = useState(selectedChurchId);
    const [date, setDate] = useState<Date | undefined>();
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringDay, setRecurringDay] = useState('');

    const [eventTemplates, setEventTemplates] = useState<RecordModel[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [templatesLoading, setTemplatesLoading] = useState(false);
    
    const isEditMode = !!eventToEdit;

    const resetForm = () => {
        if (eventToEdit) {
            setName(eventToEdit.name || '');
            setDescription(eventToEdit.description || '');
            setChurch(eventToEdit.church || selectedChurchId);
            const startDate = parseISO(eventToEdit.start_date);
            const endDate = parseISO(eventToEdit.end_date);
            setDate(startDate);
            setStartTime(format(startDate, 'HH:mm'));
            setEndTime(format(endDate, 'HH:mm'));
            setIsRecurring(eventToEdit.is_recurring || false);
            setRecurringDay(eventToEdit.recurring_day?.toString() || '');
        } else {
            setName('');
            setDescription('');
            setChurch(selectedChurchId);
            setDate(undefined);
            setStartTime('');
            setEndTime('');
            setSelectedTemplateId('');
            setIsRecurring(false);
            setRecurringDay('');
        }
    };
    
    useEffect(() => {
        if (isOpen) {
          resetForm();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, eventToEdit, selectedChurchId]);

    useEffect(() => {
        if (isOpen && church) {
            setTemplatesLoading(true);
            getEventTemplates(user?.id, user?.role, church)
                .then(setEventTemplates)
                .catch(() => toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i modelli di evento per questa chiesa.' }))
                .finally(() => setTemplatesLoading(false));
        }
    }, [isOpen, church, toast, user]);


    const handleTemplateChange = (templateId: string) => {
        const template = eventTemplates.find(t => t.id === templateId);
        if (template) {
            setSelectedTemplateId(template.id);
            if (!isEditMode) {
                setName(template.name);
                setDescription(template.description);
            }
        } else {
            setSelectedTemplateId('');
            if (!isEditMode) {
                setName('');
                setDescription('');
            }
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !startTime || !endTime || !name) {
            toast({ variant: 'destructive', title: 'Errore', description: 'Tutti i campi (eccetto la descrizione) sono obbligatori.' });
            return;
        }

        if (isRecurring && !recurringDay) {
            toast({ variant: 'destructive', title: 'Errore', description: "Seleziona un giorno per la ricorrenza." });
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
            formData.append('is_recurring', isRecurring.toString());
            if (isRecurring) {
                formData.append('recurring_day', recurringDay);
            }
            
            try {
                if (isEditMode) {
                    await updateEvent(eventToEdit.id, formData, user);
                    toast({ title: 'Successo', description: 'Evento aggiornato con successo.' });
                } else {
                     if (selectedTemplateId) {
                        formData.append('templateId', selectedTemplateId);
                    }
                    await createEvent(formData, user);
                    toast({ title: 'Successo', description: 'Evento creato con successo.' });
                }
                onEventUpserted();
                setIsOpen(false);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Errore nella creazione', description: error.message });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Modifica Evento' : 'Crea Nuovo Evento'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode 
                            ? "Modifica i dettagli dell'evento."
                            : "Compila i dettagli per creare un nuovo evento. Puoi partire da un modello per velocizzare."
                        }
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-4">
                    {userChurches.length > 1 && (
                        <div className="space-y-2">
                            <Label htmlFor="event-church">Chiesa</Label>
                            <Select onValueChange={setChurch} value={church} required disabled={isPending || isEditMode}>
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
                    {!isEditMode && (
                        <div className="space-y-2">
                            <Label htmlFor="event-template">Modello (Opzionale)</Label>
                            <Select onValueChange={handleTemplateChange} value={selectedTemplateId} disabled={isPending || templatesLoading || eventTemplates.length === 0}>
                                <SelectTrigger id="event-template">
                                    <SelectValue placeholder={templatesLoading ? "Caricamento..." : "Seleziona un modello"} />
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
                    )}

                     <div className="space-y-2">
                        <Label htmlFor="event-name">Nome Evento</Label>
                        <Input id="event-name" value={name} onChange={(e) => setName(e.target.value)} disabled={isPending} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="event-description">Descrizione (opzionale)</Label>
                        <Textarea id="event-description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isPending} />
                    </div>

                     <div className="space-y-2">
                        <Label htmlFor="event-date">Data {isRecurring ? 'di inizio ricorrenza' : ''}</Label>
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
                                    locale={it}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Switch id="is-recurring" checked={isRecurring} onCheckedChange={setIsRecurring} disabled={isPending} />
                        <Label htmlFor="is-recurring">Evento Ricorrente</Label>
                    </div>
                    
                    {isRecurring && (
                        <div className="space-y-2">
                            <Label htmlFor="recurring-day">Giorno della ricorrenza</Label>
                            <Select onValueChange={setRecurringDay} value={recurringDay} required>
                                <SelectTrigger id="recurring-day"><SelectValue placeholder="Seleziona un giorno" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">Domenica</SelectItem>
                                    <SelectItem value="1">Lunedì</SelectItem>
                                    <SelectItem value="2">Martedì</SelectItem>
                                    <SelectItem value="3">Mercoledì</SelectItem>
                                    <SelectItem value="4">Giovedì</SelectItem>
                                    <SelectItem value="5">Venerdì</SelectItem>
                                    <SelectItem value="6">Sabato</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

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

                    <div className="pt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>Annulla</Button>
                        <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditMode ? 'Salva Modifiche' : 'Crea Evento'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
