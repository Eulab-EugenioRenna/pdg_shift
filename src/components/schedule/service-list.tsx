
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getServicesForEvent, deleteService } from '@/app/actions';
import type { RecordModel } from 'pocketbase';
import { Loader2, UserCheck, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/useAuth';
import { AddServiceToEventDialog } from './add-service-to-event-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ManageServiceDialog } from './manage-service-dialog';

export function ServiceList({ eventId, churchId }: { eventId: string, churchId: string }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [services, setServices] = useState<RecordModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<RecordModel | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [serviceToManage, setServiceToManage] = useState<RecordModel | null>(null);
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

    const fetchServices = useCallback(() => {
        setIsLoading(true);
        getServicesForEvent(eventId)
            .then(setServices)
            .finally(() => setIsLoading(false));
    }, [eventId]);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const handleServiceChange = () => {
        fetchServices();
    }
    
    const handleDelete = async () => {
        if (!serviceToDelete) return;
        setIsDeleting(true);
        try {
            await deleteService(serviceToDelete.id);
            toast({ title: "Successo", description: "Servizio eliminato." });
            setServiceToDelete(null);
            fetchServices();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Errore", description: error.message });
        } finally {
            setIsDeleting(false);
        }
    }


    if (isLoading) {
        return <Loader2 className="h-4 w-4 animate-spin my-2" />;
    }

    return (
        <div className="space-y-4">
            {user?.role === 'admin' && (
                <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setIsAddDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Aggiungi Servizio
                    </Button>
                    <AddServiceToEventDialog 
                        isOpen={isAddDialogOpen}
                        setIsOpen={setIsAddDialogOpen}
                        eventId={eventId}
                        churchId={churchId}
                        onServiceAdded={handleServiceChange}
                    />
                </div>
            )}

            {services.length === 0 ? (
                 <p className="text-sm text-muted-foreground py-2 text-center">Nessun servizio per questo evento.</p>
            ) : (
                <div className="space-y-2">
                    {services.map(service => (
                        <div key={service.id} className="p-3 rounded-md bg-secondary/50 flex justify-between items-center">
                            <div className="flex-1">
                                <p className="font-semibold">{service.name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-2"><UserCheck className="w-3 h-3"/> Leader: {service.expand?.leader?.name || 'Non assegnato'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {user?.role === 'admin' && (
                                    <Button variant="outline" size="sm" onClick={() => {
                                        setServiceToManage(service);
                                        setIsManageDialogOpen(true);
                                    }}>
                                        Gestisci
                                    </Button>
                                )}
                                {user?.role === 'admin' && (
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setServiceToDelete(service)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ManageServiceDialog
                isOpen={isManageDialogOpen}
                setIsOpen={setIsManageDialogOpen}
                service={serviceToManage}
                churchId={churchId}
                onServiceUpdated={handleServiceChange}
            />

            <AlertDialog open={!!serviceToDelete} onOpenChange={() => setServiceToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Questa azione non può essere annullata. Questo eliminerà il servizio "{serviceToDelete?.name}".
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
