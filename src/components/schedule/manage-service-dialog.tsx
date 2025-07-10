
'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
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
import { Loader2, Wand2 } from 'lucide-react';
import type { RecordModel } from 'pocketbase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import type { SuggestTeamOutput } from '@/ai/flows/smart-team-builder';

interface ManageServiceDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  service: RecordModel | null;
  churchId: string;
  eventDate: string;
  onServiceUpdated: () => void;
}

export function ManageServiceDialog({ isOpen, setIsOpen, service, churchId, eventDate, onServiceUpdated }: ManageServiceDialogProps) {
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

    const positions = service?.positions || [];

    useEffect(() => {
        if (isOpen && churchId) {
            setDataLoading(true);
            Promise.all([
                getLeaders(churchId),
                getUsers(undefined, undefined, churchId),
                getServiceTemplates(),
            ]).then(async ([leadersData, usersData, templatesData]) => {
                setLeaders(leadersData);
                setAllUsers(usersData);
                setServiceTemplates(templatesData);
                
                const userIds = usersData.map(u => u.id);
                const eventDateFormatted = new Date(eventDate).toISOString().split('T')[0];
                const unavail = await getAllUnavailabilities(userIds, eventDateFormatted);
                setUnavailabilityMap(unavail);

            }).catch(() => {
                toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i dati necessari.' });
            }).finally(() => {
                setDataLoading(false);
            });
        }

        if (service) {
            setName(service.name);
            setDescription(service.description);
            setLeaderId(service.leader || '');
            setTeamAssignments(service.team_assignments || {});
            setAiSuggestions(null); // Reset suggestions when opening
            setNewPositions('');
        }
    }, [isOpen, service, churchId, toast, eventDate]);

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

            const positionsArray = newPositions.split(',').map(p => p.trim()).filter(Boolean);
            const finalPositions = positions.length > 0 ? positions : positionsArray;

            const serviceData = {
                name,
                description,
                leader: leaderId === 'unassign' ? null : leaderId,
                team_assignments: finalAssignments,
                team: uniqueTeamIds,
                positions: finalPositions,
            };

            try {
                await updateService(service.id, serviceData);
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
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                <DialogTitle>Gestisci Servizio: {service?.name}</DialogTitle>
                <DialogDescription>
                    Modifica i dettagli, assegna un leader e componi il team per ogni posizione.
                </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-4">
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
                        <Select onValueChange={setLeaderId} value={leaderId} disabled={isPending || dataLoading}>
                            <SelectTrigger id="leader-select">
                                <SelectValue placeholder={dataLoading ? "Caricamento..." : "Seleziona un leader"} />
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

                    <Card>
                        <CardHeader>
                            <CardTitle>Team</CardTitle>
                            <CardDescription>Assegna un volontario ad ogni posizione richiesta.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {Array.isArray(positions) && positions.length > 0 ? (
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
                                            <SelectItem value="unassign">Non assegnato</SelectItem>
                                            {allUsers.map((u) => {
                                                const isUnavailable = unavailabilityMap[u.id];
                                                return (
                                                <SelectItem key={u.id} value={u.id}>
                                                    {u.name} {isUnavailable ? '(Non Disp.)' : '(Disponibile)'}
                                                </SelectItem>
                                            )})}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="new-positions">Aggiungi Posizioni</Label>
                                    <Textarea
                                        id="new-positions"
                                        value={newPositions}
                                        onChange={(e) => setNewPositions(e.target.value)}
                                        placeholder="Elenco di posizioni separate da virgola (es. Voce, Chitarra, Batteria)"
                                        disabled={isPending || dataLoading}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Una volta salvate, potrai assegnare i volontari a queste posizioni.
                                    </p>
                                </div>
                            )}

                            {Array.isArray(positions) && positions.length > 0 && (
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

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>Annulla</Button>
                        <Button type="submit" disabled={isPending || dataLoading}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salva Modifiche
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
