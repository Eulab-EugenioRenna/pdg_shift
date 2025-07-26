
'use client';

import { useState, useTransition, useEffect, useMemo, useCallback } from 'react';
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
import { updateService, getLeaders, getUsers, getAiTeamSuggestions, getServiceTemplates, getAllUnavailabilities } from '@/app/actions';
import { Loader2, Wand2, UserPlus, CircleUser, CheckCircle, XCircle } from 'lucide-react';
import type { RecordModel } from 'pocketbase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import type { SuggestTeamOutput } from '@/ai/flows/smart-team-builder';
import { useAuth } from '@/hooks/useAuth';
import { ManageUsersDialog } from '../admin/manage-users-dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';


interface ManageServiceDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  service: RecordModel | null;
  churchId: string;
  eventDate: string;
  onServiceUpdated: () => void;
}

export function ManageServiceDialog({ isOpen, setIsOpen, service, churchId, eventDate, onServiceUpdated }: ManageServiceDialogProps) {
    const { user } = useAuth();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [leaderId, setLeaderId] = useState('');
    const [teamAssignments, setTeamAssignments] = useState<Record<string, string>>({});
    const [newPositions, setNewPositions] = useState('');
    
    const [leaders, setLeaders] = useState<RecordModel[]>([]);
    const [allUsers, setAllUsers] = useState<RecordModel[]>([]);
    const [serviceTemplates, setServiceTemplates] = useState<RecordModel[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    
    const [unavailabilityMap, setUnavailabilityMap] = useState<Record<string, boolean>>({});

    const [aiSuggestions, setAiSuggestions] = useState<SuggestTeamOutput | null>(null);
    const [isSuggesting, startAiTransition] = useTransition();

    const positions = useMemo(() => {
        if (!service) return [];
        const currentPositions = service.positions || [];
        const addedPositions = newPositions.split(',').map(p => p.trim()).filter(Boolean);
        return [...new Set([...currentPositions, ...addedPositions])];
    }, [service, newPositions]);


    const fetchUsersAndData = useCallback(async () => {
        if (!churchId) return;
        setDataLoading(true);
        try {
            const [leadersData, usersData, templatesData] = await Promise.all([
                getLeaders(churchId),
                getUsers(undefined, undefined, churchId),
                getServiceTemplates(user?.id, user?.role, churchId),
            ]);
            setLeaders(leadersData);
            setAllUsers(usersData);
            setServiceTemplates(templatesData);

            const userIds = usersData.map((u: RecordModel) => u.id);
            const eventDateFormatted = new Date(eventDate).toISOString().split('T')[0];
            const unavail = await getAllUnavailabilities(userIds, eventDateFormatted);
            setUnavailabilityMap(unavail);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i dati necessari.' });
        } finally {
            setDataLoading(false);
        }
    }, [churchId, eventDate, toast, user]);

    useEffect(() => {
        if (isOpen) {
           fetchUsersAndData();
        }
    }, [isOpen, fetchUsersAndData]);

    useEffect(() => {
        if (service) {
            setName(service.name);
            setDescription(service.description);
            setLeaderId(service.leader || '');
            setTeamAssignments(service.team_assignments || {});
            setAiSuggestions(null); // Reset suggestions when opening
            setNewPositions('');
        }
    }, [service]);

    const usersByPreferenceAndAvailability = useMemo(() => {
        if (!service || allUsers.length === 0) {
            return { suggested: [], available: [], unavailable: [] };
        }

        const serviceNameLower = service.name.toLowerCase();
        
        // Find a template that matches the current service's name to check preferences
        const matchingTemplate = serviceTemplates.find(t => t.name.toLowerCase() === serviceNameLower);
        const preferredUserIds = new Set(
            allUsers
                .filter(u => matchingTemplate && (u.service_preferences || []).includes(matchingTemplate.id))
                .map(u => u.id)
        );
        
        const suggested: RecordModel[] = [];
        const available: RecordModel[] = [];
        const unavailable: RecordModel[] = [];

        allUsers.forEach(u => {
            const isUnavailable = unavailabilityMap[u.id];
            if (isUnavailable) {
                unavailable.push(u);
            } else if (preferredUserIds.has(u.id)) {
                suggested.push(u);
            } else {
                available.push(u);
            }
        });
        
        return { suggested, available, unavailable };
    }, [allUsers, service, serviceTemplates, unavailabilityMap]);


    const handleGetAiSuggestions = () => {
        if (!service) return;

        const openPositions = positions.filter((pos: string) => !teamAssignments[pos] || teamAssignments[pos] === 'unassign');

        if (openPositions.length === 0) {
            toast({ title: 'Tutto coperto!', description: "Non ci sono posizioni aperte da riempire." });
            return;
        }

        startAiTransition(async () => {
            const serviceTemplatesMap = new Map(serviceTemplates.map((t) => [t.id, t.name]));
            
            if(allUsers.length === 0) {
                 setAiSuggestions({
                    suggestions: [],
                    message: "Non ci sono volontari in questa chiesa per generare suggerimenti."
                });
                return;
            }

            const volunteerData = allUsers.map(user => {
                const isUnavailable = unavailabilityMap[user.id] || false;
                const preferences = (user.service_preferences || [])
                    .map((id: string) => serviceTemplatesMap.get(id))
                    .filter(Boolean)
                    .join(', ');

                return {
                    volunteerName: user.name,
                    availability: isUnavailable ? "non disponibile" : "disponibile",
                    skills: user.skills || 'Nessuna competenza specificata',
                    preferences: preferences || 'Nessuna preferenza specificata',
                };
            });
            
            try {
                const result = await getAiTeamSuggestions({
                    serviceName: service.name,
                    date: new Date(eventDate).toLocaleDateString('it-IT'),
                    positions: openPositions,
                    volunteerAvailability: volunteerData,
                });
                setAiSuggestions(result);
                if (result.suggestions.length > 0) {
                    toast({ title: 'Suggerimenti Pronti!', description: "L'IA ha generato delle proposte per le posizioni aperte." });
                }
            } catch (error) {
                toast({ variant: "destructive", title: "Errore IA", description: "Impossibile ottenere suggerimenti dall'IA." });
            }
        });
    };
    
    const applySuggestion = (position: string, volunteerName: string) => {
        const volunteer = allUsers.find(u => u.name === volunteerName);
        if (volunteer) {
            setTeamAssignments(prev => ({ ...prev, [position]: volunteer.id }));
        } else {
            toast({ variant: "destructive", title: "Errore", description: `Volontario "${volunteerName}" non trovato.`});
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!service) return;

        startTransition(async () => {
            const finalAssignments = { ...teamAssignments };
            Object.keys(finalAssignments).forEach(key => {
                if(finalAssignments[key] === 'unassign' || !finalAssignments[key]) {
                    delete finalAssignments[key];
                }
            });

            const teamIds = Object.values(finalAssignments).filter(id => id);
            const uniqueTeamIds = [...new Set(teamIds)];

            const serviceData = {
                name,
                description,
                leader: leaderId === 'unassign' ? null : leaderId,
                team_assignments: finalAssignments,
                team: uniqueTeamIds,
                positions: positions,
            };

            try {
                await updateService(service.id, serviceData, user);
                toast({ title: 'Successo', description: 'Servizio aggiornato con successo.' });
                onServiceUpdated();
                setIsOpen(false);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Errore', description: error.message });
            }
        });
    };

    const renderUserOptions = (users: RecordModel[], icon?: React.ReactNode) => {
        return users.map(u => (
            <SelectItem key={u.id} value={u.id} disabled={unavailabilityMap[u.id]}>
                <div className="flex items-center gap-2">
                    {icon}
                    <span>{u.name}</span>
                </div>
            </SelectItem>
        ));
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh]">
                <DialogHeader>
                <DialogTitle>Gestisci Servizio: {service?.name}</DialogTitle>
                <DialogDescription>
                    Modifica i dettagli, assegna un leader e componi il team per ogni posizione.
                </DialogDescription>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                    <ScrollArea className="h-full -mx-6 px-6">
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
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="leader-select">Leader</Label>
                                    <ManageUsersDialog onUsersUpdated={fetchUsersAndData} triggerButton={
                                        <Button type="button" variant="ghost" size="sm" className="h-auto px-2 py-1">
                                            <UserPlus className="h-4 w-4 mr-1"/> Aggiungi Utente
                                        </Button>
                                    }/>
                                </div>
                                <Select onValueChange={setLeaderId} value={leaderId} disabled={isPending || dataLoading}>
                                    <SelectTrigger id="leader-select">
                                        <SelectValue placeholder={dataLoading ? "Caricamento..." : "Seleziona un leader"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dataLoading ? (
                                            <div className="flex items-center justify-center p-2">
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                <span>Caricamento utenti...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <SelectItem value="unassign">Non assegnato</SelectItem>
                                                {leaders.map((l) => (
                                                    <SelectItem key={l.id} value={l.id}>
                                                        {l.name}
                                                    </SelectItem>
                                                ))}
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Team</CardTitle>
                                    <CardDescription>Assegna un volontario ad ogni posizione richiesta.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {positions.length > 0 ? (
                                        positions.map((pos: string) => (
                                        <div key={pos} className="grid grid-cols-3 items-center gap-4">
                                            <Label htmlFor={`pos-${pos}`} className="text-right">{pos}</Label>
                                            <Select
                                                value={teamAssignments[pos] || ''}
                                                onValueChange={(value) => setTeamAssignments(prev => ({...prev, [pos]: value}))}
                                                disabled={isPending || dataLoading}
                                            >
                                                <SelectTrigger id={`pos-${pos}`} className="col-span-2">
                                                    <SelectValue placeholder="Seleziona un volontario..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {dataLoading ? (
                                                        <div className="flex items-center justify-center p-2">
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <SelectItem value="unassign">Non assegnato</SelectItem>
                                                            {usersByPreferenceAndAvailability.suggested.length > 0 && (
                                                                <SelectGroup>
                                                                    <SelectLabel className="text-primary">Suggeriti (disponibili con preferenza)</SelectLabel>
                                                                    {renderUserOptions(usersByPreferenceAndAvailability.suggested, <CheckCircle className="text-green-500" />)}
                                                                </SelectGroup>
                                                            )}
                                                            {usersByPreferenceAndAvailability.available.length > 0 && (
                                                                <SelectGroup>
                                                                    <SelectLabel>Disponibili</SelectLabel>
                                                                    {renderUserOptions(usersByPreferenceAndAvailability.available, <CircleUser />)}
                                                                </SelectGroup>
                                                            )}
                                                            {usersByPreferenceAndAvailability.unavailable.length > 0 && (
                                                                <SelectGroup>
                                                                    <SelectLabel className="text-destructive">Indisponibili</SelectLabel>
                                                                    {renderUserOptions(usersByPreferenceAndAvailability.unavailable, <XCircle className="text-destructive"/>)}
                                                                </SelectGroup>
                                                            )}
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))
                                    ) : null}
                                    
                                    <div className="space-y-2 pt-2">
                                        <Label htmlFor="new-positions">Aggiungi altre posizioni</Label>
                                        <Textarea
                                            id="new-positions"
                                            value={newPositions}
                                            onChange={(e) => setNewPositions(e.target.value)}
                                            placeholder="Elenco di posizioni separate da virgola (es. Basso, Tastiera)"
                                            disabled={isPending || dataLoading}
                                        />
                                    </div>
                                    

                                    {positions.length > 0 && (
                                        <>
                                            <Button type="button" variant="outline" onClick={handleGetAiSuggestions} disabled={isSuggesting || dataLoading} className="mt-4 w-full">
                                                {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4" />}
                                                Suggerisci Team con IA
                                            </Button>
                                            {aiSuggestions && (
                                                <div className="space-y-2 mt-4 p-4 bg-accent/50 rounded-lg">
                                                    <h4 className="font-semibold text-accent-foreground">Suggerimenti IA:</h4>
                                                    {aiSuggestions.suggestions && aiSuggestions.suggestions.length > 0 ? (
                                                        aiSuggestions.suggestions.map((s, i) => (
                                                            <div key={i} className="text-sm flex items-center justify-between gap-2">
                                                            <div>
                                                                    <span className="font-medium">{s.position}:</span> {s.volunteerName} - <em className="text-muted-foreground">{s.reason}</em>
                                                            </div>
                                                                <Button type="button" size="sm" variant="secondary" onClick={() => applySuggestion(s.position, s.volunteerName)}>Applica</Button>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">{aiSuggestions.message || "L'IA non è riuscita a trovare candidati idonei."}</p>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </form>
                    </ScrollArea>
                </div>
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>Annulla</Button>
                    <Button type="submit" onClick={handleSubmit} disabled={isPending || dataLoading}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salva Modifiche
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
