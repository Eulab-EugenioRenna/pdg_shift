
'use client';

import { useState, useEffect } from 'react';
import { getServicesForEvent, deleteService } from '@/app/actions';
import type { RecordModel } from 'pocketbase';
import { Loader2, UserCheck, PlusCircle, Trash2, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/useAuth';
import { AddServiceToEventDialog } from './add-service-to-event-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ManageServiceDialog } from './manage-service-dialog';
import { pb } from '@/lib/pocketbase';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface ServiceListProps {
    eventId: string; // The ID of the template or single event
    eventInstanceId: string; // A unique ID for the specific instance (for recurring events)
    isRecurringInstance: boolean;
    churchId: string;
    eventDate: string;
}

function TeamDisplay({ service }: { service: RecordModel }) {
    const assignments = service.team_assignments || {};
    const positions = service.positions || [];
    const teamMembers = service.expand?.team || [];
    const teamMemberMap = new Map(teamMembers.map((m: RecordModel) => [m.id, m]));

    if (Array.isArray(positions) && positions.length > 0) {
        return (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                {positions.map((position: string) => {
                    const userId = assignments[position];
                    const user = userId ? teamMemberMap.get(userId) : null;
                    return (
                        <div key={position} className="flex items-center gap-2">
                            <span className="font-medium text-muted-foreground w-24 truncate" title={position}>{position}:</span>
                            {user ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1.5">
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={user.avatar ? pb.getFileUrl(user, user.avatar, { thumb: '100x100' }) : ''} alt={user.name} />
                                                <AvatarFallback>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="truncate">{user.name}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent><p>{user.name}</p></TooltipContent>
                                </Tooltip>
                            ) : (
                                <span className="text-muted-foreground/70 italic">Non assegnato</span>
                            )}
                        </div>
                    );
                })}
            </div>
        )
    }

    // Fallback for services without defined positions
    return (
        <div className="flex items-center gap-2 mt-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div className="flex -space-x-2">
                {teamMembers.length > 0 ? (
                    teamMembers.slice(0, 7).map((member: RecordModel) => (
                        <Tooltip key={member.id}>
                            <TooltipTrigger asChild>
                                <Avatar className="h-6 w-6 border-2 border-background">
                                    <AvatarImage src={member.avatar ? pb.getFileUrl(member, member.avatar, { thumb: '100x100' }) : ''} alt={member.name} />
                                    <AvatarFallback>{member.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent><p>{member.name}</p></TooltipContent>
                        </Tooltip>
                    ))
                ) : (
                    <span className="text-xs text-muted-foreground">Nessun volontario assegnato.</span>
                )}
                 {teamMembers.length > 7 && (
                    <Avatar className="h-6 w-6 border-2 border-background">
                        <AvatarFallback>+{teamMembers.length - 7}</AvatarFallback>
                    </Avatar>
                )}
            </div>
        </div>
    );
}

export function ServiceList({ eventId, eventInstanceId, isRecurringInstance, churchId, eventDate }: ServiceListProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [services, setServices] = useState<RecordModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<RecordModel | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [serviceToManage, setServiceToManage] = useState<RecordModel | null>(null);
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        // The eventId will always be the ID of the template/base event.
        getServicesForEvent(eventId)
            .then(data => setServices(data.sort((a,b) => a.name.localeCompare(b.name))))
            .finally(() => setIsLoading(false));

        const handleServiceSubscription = ({ action, record }: { action: string; record: RecordModel }) => {
            // We only care about services related to our base event.
            if (record.event !== eventId) return;

            const sortServices = (s: RecordModel[]) => s.sort((a, b) => a.name.localeCompare(b.name));

            const fetchFullRecord = (id: string) => {
                return pb.collection('pdg_services').getOne(id, { expand: 'leader,team' });
            }

            if (action === 'create') {
                fetchFullRecord(record.id).then(newService => {
                    setServices(prev => sortServices([...prev, newService]));
                });
            } else if (action === 'update') {
                fetchFullRecord(record.id).then(updatedService => {
                    setServices(prev => sortServices(prev.map(s => s.id === updatedService.id ? updatedService : s)));
                });
            } else if (action === 'delete') {
                setServices(prev => prev.filter(s => s.id !== record.id));
            }
        };

        const unsubscribePromise = pb.collection('pdg_services').subscribe('*', handleServiceSubscription);

        return () => {
            Promise.resolve(unsubscribePromise).then(unsubscribe => unsubscribe());
        };
    }, [eventId]);

    const handleServiceChange = () => {
        // The subscription will handle the UI update.
    }
    
    const handleDelete = async () => {
        if (!serviceToDelete) return;
        setIsDeleting(true);
        try {
            await deleteService(serviceToDelete.id);
            toast({ title: "Successo", description: "Servizio eliminato." });
            setServiceToDelete(null);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Errore", description: error.message });
        } finally {
            setIsDeleting(false);
        }
    }

    const canManageService = (service: RecordModel) => {
        if (!user) return false;
        // Superuser and coordinators of the church can always manage.
        if (user.role === 'superuser' || (user.role === 'coordinatore' && user.church?.includes(churchId))) return true;
        // Leaders can manage services they are assigned to, but not on recurring instances
        // because those edits should happen on the template or a variation.
        if (user.role === 'leader' && user.id === service.leader && !isRecurringInstance) return true;
        return false;
    };
    
    const canAddService = () => {
        if (!user) return false;
        // Cannot add services to a recurring instance, must create a variation.
        if (isRecurringInstance) return false;
        return user.role === 'superuser' || (user.role === 'coordinatore' && user.church?.includes(churchId));
    }

    if (isLoading) {
        return <Loader2 className="h-4 w-4 animate-spin my-2" />;
    }

    return (
        <TooltipProvider>
            <div className="space-y-4">
                {canAddService() && (
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
                        {services.map(service => {
                            const canManage = canManageService(service);
                            return (
                                <div key={service.id} className="p-3 rounded-md bg-secondary/50">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 space-y-1">
                                            <p className="font-semibold">{service.name}</p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-2"><UserCheck className="w-3 h-3"/> Leader: {service.expand?.leader?.name || 'Non assegnato'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {canManage && (
                                                <Button variant="outline" size="sm" onClick={() => {
                                                    setServiceToManage(service);
                                                    setIsManageDialogOpen(true);
                                                }}>
                                                    Gestisci Team
                                                </Button>
                                            )}
                                            {canAddService() && (
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => setServiceToDelete(service)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <TeamDisplay service={service} />
                                </div>
                            );
                        })}
                    </div>
                )}

                <ManageServiceDialog
                    isOpen={isManageDialogOpen}
                    setIsOpen={setIsManageDialogOpen}
                    service={serviceToManage}
                    churchId={churchId}
                    eventDate={eventDate}
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
        </TooltipProvider>
    );
}
