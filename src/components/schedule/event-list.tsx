
'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { getEvents, deleteEvent, getChurches, createEventOverride } from '@/app/actions';
import type { RecordModel } from 'pocketbase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Calendar, Clock, MoreVertical, Repeat } from 'lucide-react';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { ManageEventDialog } from './manage-event-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ServiceList } from './service-list';
import { pb } from '@/lib/pocketbase';
import type { DateRange } from 'react-day-picker';

interface EventListProps {
    churchIds: string[];
    searchTerm: string;
    dateRange?: DateRange;
    showPastEvents: boolean;
}

const generateRecurringInstances = (
    event: RecordModel,
    rangeStart: Date,
    rangeEnd: Date
): (RecordModel & { isRecurringInstance: boolean })[] => {
    if (!event.is_recurring || event.recurring_day === null || event.recurring_day === undefined) {
        return [];
    }

    const instances = [];
    const recurrenceStartDate = new Date(event.start_date);
    recurrenceStartDate.setHours(0, 0, 0, 0);

    let currentDate = new Date(rangeStart > recurrenceStartDate ? rangeStart : recurrenceStartDate);
    
    const recurringDay = parseInt(event.recurring_day, 10);
    
    const dayOfWeek = currentDate.getDay();
    const daysToAdd = (recurringDay - dayOfWeek + 7) % 7;
    currentDate.setDate(currentDate.getDate() + daysToAdd);

    const originalStartTime = new Date(event.start_date);
    const originalEndTime = new Date(event.end_date);
    const duration = originalEndTime.getTime() - originalStartTime.getTime();

    while (currentDate <= rangeEnd) {
        const newStartDate = new Date(currentDate);
        newStartDate.setHours(originalStartTime.getHours(), originalStartTime.getMinutes(), originalStartTime.getSeconds());
        
        const newEndDate = new Date(newStartDate.getTime() + duration);

        instances.push({
            ...event,
            id: event.id,
            start_date: newStartDate.toISOString(),
            end_date: newEndDate.toISOString(),
            isRecurringInstance: true,
        });

        currentDate.setDate(currentDate.getDate() + 7);
    }

    return instances;
};


export function EventList({ churchIds, searchTerm, dateRange, showPastEvents }: EventListProps) {
    const { user } = useAuth();
    const [events, setEvents] = useState<RecordModel[]>([]);
    const [churches, setChurches] = useState<RecordModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [eventToEdit, setEventToEdit] = useState<RecordModel | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const [eventToDelete, setEventToDelete] = useState<RecordModel | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [overrideInfo, setOverrideInfo] = useState<{ event: RecordModel; date: Date } | null>(null);
    const [isCreatingOverride, startOverrideTransition] = useTransition();
    
    const { toast } = useToast();
    
    const fetchAndSetEvents = () => {
        if (churchIds.length === 0) {
            setEvents([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const churchFilter = `(${churchIds.map(id => `church = "${id}"`).join(' || ')})`;
        getEvents(churchFilter)
            .then(eventsData => setEvents(eventsData))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        if (churchIds.length === 0) {
            setEvents([]);
            setIsLoading(false);
            return;
        };

        setIsLoading(true);
        
        const churchFilter = `(${churchIds.map(id => `church = "${id}"`).join(' || ')})`;

        Promise.all([
            getEvents(churchFilter),
            user?.role === 'superuser' ? getChurches() : getChurches(user?.id, user?.role)
        ]).then(([eventsData, churchesData]) => {
            setEvents(eventsData);
            setChurches(churchesData);
        }).finally(() => {
            setIsLoading(false);
        });

        const handleEventSubscription = () => fetchAndSetEvents();

        pb.collection('pdg_events').subscribe('*', handleEventSubscription);
        pb.collection('pdg_services').subscribe('*', handleEventSubscription);

        return () => {
            pb.collection('pdg_events').unsubscribe('*');
            pb.collection('pdg_services').unsubscribe('*');
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [churchIds, user]);
    
    useEffect(() => {
        if (eventToEdit) {
            setIsEditDialogOpen(true);
        }
    }, [eventToEdit]);
    
    useEffect(() => {
        if (!isEditDialogOpen) {
            setEventToEdit(null);
        }
    }, [isEditDialogOpen]);

    const filteredEvents = useMemo(() => {
        // 1. Separate events and templates
        const singleEvents = events.filter(e => !e.is_recurring);
        const recurringTemplates = events.filter(e => e.is_recurring);
    
        const singleEventDateKeys = new Set(
            singleEvents.map(e => `${format(new Date(e.start_date), 'yyyy-MM-dd')}-${e.church}`)
        );
        
        // 2. Define range for generating recurring instances
        let recurrenceRangeStart = new Date();
        const futureLimit = new Date();
        futureLimit.setMonth(futureLimit.getMonth() + 3);
    
        if (dateRange?.from) {
            recurrenceRangeStart = new Date(dateRange.from);
        } else if (showPastEvents) {
            // If showing past events, go back a reasonable amount
            recurrenceRangeStart.setFullYear(recurrenceRangeStart.getFullYear() - 1);
        } else {
            // Default view: start from 2 days ago
            recurrenceRangeStart.setDate(recurrenceRangeStart.getDate() - 2);
        }
        recurrenceRangeStart.setHours(0, 0, 0, 0);
    
        const recurringInstances = recurringTemplates
            .flatMap(event => generateRecurringInstances(event, recurrenceRangeStart, futureLimit))
            .filter(instance => {
                const dateKey = `${format(new Date(instance.start_date), 'yyyy-MM-dd')}-${instance.church}`;
                return !singleEventDateKeys.has(dateKey);
            });
    
        const allPossibleEvents = [...singleEvents, ...recurringInstances];
    
        // 3. Apply final filters
        const finalFilteredEvents = allPossibleEvents.filter(event => {
            const matchSearch = searchTerm
                ? event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase()))
                : true;
            
            let matchDate = true;
            if (dateRange?.from) {
                // Filter by date picker range
                const eventStart = new Date(event.start_date);
                const eventEnd = event.end_date ? new Date(event.end_date) : new Date(event.start_date);
                const filterFrom = new Date(dateRange.from);
                filterFrom.setHours(0, 0, 0, 0);
                const filterTo = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
                filterTo.setHours(23, 59, 59, 999);
                matchDate = eventStart <= filterTo && eventEnd >= filterFrom;
            } else if (!showPastEvents) {
                // Default filter: hide events older than 2 days
                const twoDaysAgo = new Date();
                twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                twoDaysAgo.setHours(0, 0, 0, 0);
                matchDate = new Date(event.start_date) >= twoDaysAgo;
            }
    
            return matchSearch && matchDate;
        });
    
        return finalFilteredEvents.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    }, [events, searchTerm, dateRange, showPastEvents]);


    const handleEventUpdated = () => {
        // The subscription will handle the UI update.
    }
    
    const handleCreateOverride = () => {
        if (!overrideInfo) return;
        
        startOverrideTransition(async () => {
            try {
                await createEventOverride(overrideInfo.event.id, overrideInfo.date.toISOString());
                toast({ title: "Successo", description: "Variazione dell'evento creata. Ora puoi modificare i dettagli per questa data specifica." });
                setOverrideInfo(null);
            } catch (error: any) {
                toast({ variant: "destructive", title: "Errore", description: error.message });
            }
        });
    };
    
    const handleEditSeries = () => {
        if (!overrideInfo) return;
        setEventToEdit(overrideInfo.event);
        setOverrideInfo(null);
    };

    const handleDelete = async () => {
        if (!eventToDelete) return;
        setIsDeleting(true);
        try {
            await deleteEvent(eventToDelete.id);
            toast({ title: "Successo", description: "Evento eliminato." });
            setEventToDelete(null);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Errore", description: error.message });
        } finally {
            setIsDeleting(false);
        }
    }
    
    const canManageEvent = (event: RecordModel) => {
        if (user?.role === 'superuser') return true;
        if (user?.role === 'coordinatore' && user.church?.includes(event.church)) return true;
        return false;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (events.length === 0 && churchIds.length > 0) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Nessun evento trovato per questa chiesa. Crea il primo!</p>
                </CardContent>
            </Card>
        );
    }

    if (filteredEvents.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Nessun evento corrisponde ai filtri selezionati.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {filteredEvents.map(event => (
                <Card key={event.isRecurringInstance ? `${event.id}-${event.start_date}` : event.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    {event.name} 
                                    {event.isRecurringInstance && <Repeat className="inline h-4 w-4 text-muted-foreground" title="Evento Ricorrente" />}
                                </CardTitle>
                                <CardDescription>{event.description || 'Nessuna descrizione.'}</CardDescription>
                            </div>
                            {canManageEvent(event) && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem 
                                            onSelect={() => {
                                                if (event.isRecurringInstance) {
                                                    setOverrideInfo({ event, date: new Date(event.start_date) });
                                                } else {
                                                    setEventToEdit(event);
                                                }
                                            }}
                                        >
                                            Modifica
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setEventToDelete(event)} className="text-destructive">Elimina</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                         <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>Visualizza Servizi</AccordionTrigger>
                                <AccordionContent>
                                    <ServiceList eventId={event.id} churchId={event.church} eventDate={event.start_date} />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                    <CardFooter className="flex flex-wrap gap-x-6 gap-y-2 justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(event.start_date), "eeee d MMMM yyyy", { locale: it })}</span>
                        </div>
                         <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{format(new Date(event.start_date), "HH:mm")} - {format(new Date(event.end_date), "HH:mm")}</span>
                        </div>
                    </CardFooter>
                </Card>
            ))}

            {eventToEdit && (
                <ManageEventDialog 
                    isOpen={isEditDialogOpen}
                    setIsOpen={setIsEditDialogOpen}
                    eventToEdit={eventToEdit}
                    userChurches={churches}
                    selectedChurchId={eventToEdit.church}
                    onEventUpserted={handleEventUpdated}
                />
            )}

            <AlertDialog open={!!overrideInfo} onOpenChange={() => setOverrideInfo(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Modifica Evento Ricorrente</AlertDialogTitle>
                        <AlertDialogDescription>
                            Stai modificando un'occorrenza di un evento ricorrente. Vuoi modificare solo questa data o l'intera serie di eventi?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel disabled={isCreatingOverride}>Annulla</AlertDialogCancel>
                        <Button variant="outline" onClick={handleEditSeries} disabled={isCreatingOverride}>
                            Modifica Serie
                        </Button>
                        <AlertDialogAction onClick={handleCreateOverride} disabled={isCreatingOverride}>
                            {isCreatingOverride && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crea Variazione per questa data
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Questa azione non può essere annullata. Questo eliminerà permanentemente l'evento "{eventToDelete?.name}" e tutti i suoi servizi.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                             {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Elimina
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
