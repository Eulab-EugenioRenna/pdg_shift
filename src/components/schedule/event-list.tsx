'use client';

import { useState, useEffect } from 'react';
import { getEvents, deleteEvent, getChurches } from '@/app/actions';
import type { RecordModel } from 'pocketbase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Calendar, Clock, MoreVertical } from 'lucide-react';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { ManageEventDialog } from './manage-event-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ServiceList } from './service-list';

export function EventList({ churchId, onEventChange }: { churchId: string; onEventChange: () => void; }) {
    const { user } = useAuth();
    const [events, setEvents] = useState<RecordModel[]>([]);
    const [churches, setChurches] = useState<RecordModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [eventToEdit, setEventToEdit] = useState<RecordModel | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const [eventToDelete, setEventToDelete] = useState<RecordModel | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const { toast } = useToast();

    useEffect(() => {
        if (churchId) {
            setIsLoading(true);
            Promise.all([
                getEvents(churchId),
                user?.role === 'admin' ? getChurches() : Promise.resolve(user?.expand?.church || [])
            ]).then(([eventsData, churchesData]) => {
                setEvents(eventsData);
                setChurches(churchesData);
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, [churchId, user]);
    
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


    const handleEventUpdated = () => {
        onEventChange();
        // Manually refetch events after update
        setIsLoading(true);
        getEvents(churchId).then(setEvents).finally(() => setIsLoading(false));
    }

    const handleDelete = async () => {
        if (!eventToDelete) return;
        setIsDeleting(true);
        try {
            await deleteEvent(eventToDelete.id);
            toast({ title: "Successo", description: "Evento eliminato." });
            setEventToDelete(null);
            onEventChange();
            // Manually refetch events after delete
            setEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
        } catch (error: any) {
            toast({ variant: "destructive", title: "Errore", description: error.message });
        } finally {
            setIsDeleting(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (events.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Nessun evento trovato per questa chiesa.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {events.map(event => (
                <Card key={event.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{event.name}</CardTitle>
                                <CardDescription>{event.description || 'Nessuna descrizione.'}</CardDescription>
                            </div>
                            {user?.role === 'admin' && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => setEventToEdit(event)}>Modifica</DropdownMenuItem>
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
                                    <ServiceList eventId={event.id} churchId={event.church} />
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
