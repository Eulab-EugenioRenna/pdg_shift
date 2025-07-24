
'use client';

import { useState, useTransition } from 'react';
import type { RecordModel } from 'pocketbase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar, Clock, MoreVertical, Repeat, Trash2, Edit } from 'lucide-react';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { ManageEventDialog } from './manage-event-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ServiceList } from './service-list';
import { deleteEvent, createEventOverride, createCancellationEvent, deleteRecurringEventAndPreserveHistory } from '@/app/actions';

interface EventDetailsProps {
    event: RecordModel;
    userChurches: RecordModel[];
    onEventUpserted: (event?: RecordModel) => void;
}

export function EventDetails({ event, userChurches, onEventUpserted }: EventDetailsProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<RecordModel | null>(null);

    const [eventToDelete, setEventToDelete] = useState<RecordModel | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [overrideInfo, setOverrideInfo] = useState<{ event: RecordModel; date: Date } | null>(null);
    const [isCreatingOverride, startOverrideTransition] = useTransition();
    
    const [occurrenceToCancel, setOccurrenceToCancel] = useState<{ event: RecordModel; date: Date } | null>(null);
    const [isCancelling, startCancelTransition] = useTransition();

    const [seriesToDelete, setSeriesToDelete] = useState<RecordModel | null>(null);
    const [isDeletingSeries, startDeleteSeriesTransition] = useTransition();

    const canManageEvent = () => {
        if (!user || !event) return false;
        if (user.role === 'superuser') return true;
        if (user.role === 'coordinatore' && user.church?.includes(event.church)) return true;
        return false;
    };

    const handleEditClick = () => {
        if (event.isRecurringInstance) {
            setOverrideInfo({ event, date: new Date(event.start_date) });
        } else {
            setEventToEdit(event);
            setIsEditDialogOpen(true);
        }
    };

    const handleDeleteClick = () => {
        setEventToDelete(event);
    };
    
    const handleCreateOverride = () => {
        if (!overrideInfo) return;
        
        startOverrideTransition(async () => {
            try {
                const newEvent = await createEventOverride(overrideInfo.event.id, overrideInfo.date.toISOString());
                toast({ title: "Successo", description: "Variazione creata. Ora puoi modificare i dettagli per questa data." });
                onEventUpserted(newEvent);
                setOverrideInfo(null);
            } catch (error: any) {
                toast({ variant: "destructive", title: "Errore", description: error.message });
            }
        });
    };
    
    const handleEditSeries = () => {
        if (!overrideInfo) return;
        setEventToEdit(overrideInfo.event);
        setIsEditDialogOpen(true);
        setOverrideInfo(null);
    };

    const handleDeleteSingleEvent = async () => {
        if (!eventToDelete) return;
        setIsDeleting(true);
        try {
            await deleteEvent(eventToDelete.id);
            toast({ title: "Successo", description: "Evento eliminato." });
            setEventToDelete(null);
            onEventUpserted(); // Notify parent that event is deleted
        } catch (error: any) {
            toast({ variant: "destructive", title: "Errore", description: error.message });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancelOccurrence = () => {
        if (!eventToDelete || !user) return;
        
        startCancelTransition(async () => {
            try {
                const cancelledEvent = await createCancellationEvent(eventToDelete.id, eventToDelete.start_date, user);
                toast({ title: "Successo", description: "L'occorrenza dell'evento è stata annullata." });
                onEventUpserted(cancelledEvent); 
                setEventToDelete(null);
            } catch (error: any) {
                toast({ variant: "destructive", title: "Errore", description: error.message });
            } finally {
                setEventToDelete(null);
            }
        });
    };

    const handleDeleteSeries = () => {
        if (!eventToDelete || !user) return;
        
        startDeleteSeriesTransition(async () => {
            try {
                await deleteRecurringEventAndPreserveHistory(eventToDelete.id, user);
                toast({ title: "Successo", description: "La serie di eventi è stata terminata e lo storico preservato." });
                onEventUpserted();
            } catch (error: any) {
                toast({ variant: "destructive", title: "Errore", description: error.message });
            } finally {
                setEventToDelete(null);
            }
        });
    }

    const DeleteDialog = () => {
        if (!eventToDelete) return null;

        if (eventToDelete.isRecurringInstance) {
            // Dialog with 3 options for recurring instances
            return (
                <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Gestisci Evento Ricorrente</AlertDialogTitle>
                            <AlertDialogDescription>
                                Stai agendo su un'occorrenza di un evento ricorrente. Cosa vorresti fare?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
                             <Button onClick={handleCancelOccurrence} disabled={isCancelling}>
                                {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Annulla solo questa data
                            </Button>
                             <Button variant="destructive" onClick={handleDeleteSeries} disabled={isDeletingSeries}>
                                {isDeletingSeries && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Elimina l'intera serie (conserva lo storico)
                            </Button>
                            <AlertDialogCancel>Indietro</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );
        } else {
            // Simple delete confirmation for single events
            return (
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
                            <AlertDialogAction onClick={handleDeleteSingleEvent} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Elimina
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );
        }
    };


    return (
        <>
            <Card className="animate-in fade-in-50">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                {event.name} 
                                {event.isRecurringInstance && <Repeat className="inline h-4 w-4 text-muted-foreground" title="Evento Ricorrente" />}
                            </CardTitle>
                            <CardDescription>{event.description || 'Nessuna descrizione.'}</CardDescription>
                        </div>
                        {canManageEvent() && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onSelect={handleEditClick}>
                                        <Edit className="mr-2 h-4 w-4" /> 
                                        <span>{event.isRecurringInstance ? "Modifica / Varia" : "Modifica"}</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={handleDeleteClick} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>{event.isRecurringInstance ? "Annulla / Elimina" : "Elimina"}</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <ServiceList 
                        eventId={event.id}
                        eventInstanceId={event.isRecurringInstance ? `${event.id}-${event.start_date}` : event.id}
                        isRecurringInstance={!!event.isRecurringInstance}
                        churchId={event.church}
                        eventDate={event.start_date}
                    />
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

            {eventToEdit && (
                <ManageEventDialog 
                    isOpen={isEditDialogOpen}
                    setIsOpen={setIsEditDialogOpen}
                    eventToEdit={eventToEdit}
                    userChurches={userChurches}
                    selectedChurchId={eventToEdit.church}
                    onEventUpserted={(updatedEvent) => {
                       onEventUpserted(updatedEvent);
                    }}
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
            
            <DeleteDialog />
        </>
    );
}
