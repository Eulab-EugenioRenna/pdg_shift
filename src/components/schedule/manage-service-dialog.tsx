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
import { updateService, getLeaders, getUsers, getAiTeamSuggestions } from '@/app/actions';
import { Loader2, Wand2 } from 'lucide-react';
import type { RecordModel } from 'pocketbase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import type { SuggestTeamOutput } from '@/ai/flows/smart-team-builder';

const volunteerPool = [
    { volunteerName: "Alice", availability: "disponibile", skills: "Cantante, accoglienza", preferences: "preferisce i servizi mattutini" },
    { volunteerName: "Bob", availability: "disponibile", skills: "Musicista (chitarra), supporto tecnico", preferences: "disponibile per qualsiasi servizio" },
    { volunteerName: "Charlie", availability: "non disponibile", skills: "Assistenza all'infanzia, sicurezza", preferences: "preferisce i servizi serali" },
    { volunteerName: "Diana", availability: "disponibile", skills: "Supporto tecnico, mixer audio", preferences: "preferisce lavorare in team" },
    { volunteerName: "Ethan", availability: "disponibile", skills: "Usciere, allestimento/smontaggio", preferences: "non gli dispiace rimanere fino a tardi" },
    { volunteerName: "Fiona", availability: "disponibile", skills: "Cantante (voce di supporto), social media", preferences: "disponibile per servizi speciali" },
    { volunteerName: "George", availability: "disponibile", skills: "Musicista (basso)", preferences: "preferisce i servizi mattutini" },
    { volunteerName: "Hannah", availability: "disponibile", skills: "Musicista (batteria)", preferences: "puntuale" },
];

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

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [leaderId, setLeaderId] = useState('');
    const [teamAssignments, setTeamAssignments] = useState<Record<string, string>>({});
    
    const [leaders, setLeaders] = useState<RecordModel[]>([]);
    const [allUsers, setAllUsers] = useState<RecordModel[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    const [aiSuggestions, setAiSuggestions] = useState<SuggestTeamOutput | null>(null);
    const [isSuggesting, startAiTransition] = useTransition();

    useEffect(() => {
        if (isOpen && churchId) {
            setDataLoading(true);
            Promise.all([
                getLeaders(churchId),
                getUsers(), // In a real app, this should be scoped to the church
            ]).then(([leadersData, usersData]) => {
                setLeaders(leadersData);
                setAllUsers(usersData);
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
        }
    }, [isOpen, service, churchId, toast]);

    const handleGetAiSuggestions = () => {
        if (!service) return;

        const openPositions = (service.positions || []).filter((pos: string) => !teamAssignments[pos]);

        if (openPositions.length === 0) {
            toast({ title: 'Tutto coperto!', description: "Non ci sono posizioni aperte da riempire." });
            return;
        }

        startAiTransition(async () => {
            try {
                const result = await getAiTeamSuggestions({
                    serviceName: service.name,
                    date: new Date().toLocaleDateString('it-IT'),
                    positions: openPositions,
                    volunteerAvailability: volunteerPool, // This should be dynamic in a real app
                });
                setAiSuggestions(result);
                 toast({ title: 'Suggerimenti Pronti!', description: "L'IA ha generato delle proposte per le posizioni aperte." });
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
                if(finalAssignments[key] === 'unassign') {
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
    
    const positions = service?.positions || [];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                <DialogTitle>Gestisci Servizio: {service?.name}</DialogTitle>
                <DialogDescription>
                    Modifica i dettagli, assegna un leader e componi il team per ogni posizione.
                </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
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
                            {positions.length > 0 ? positions.map((pos: string) => (
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
                                            {allUsers.map((u) => (
                                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )) : <p className="text-sm text-muted-foreground">Nessuna posizione definita per questo servizio.</p>}

                            {positions.length > 0 && (
                                <>
                                    <Button type="button" variant="outline" onClick={handleGetAiSuggestions} disabled={isSuggesting} className="mt-4 w-full">
                                        {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4" />}
                                        Suggerisci Team con IA
                                    </Button>
                                    {aiSuggestions && aiSuggestions.suggestions.length > 0 && (
                                        <div className="space-y-2 mt-4 p-4 bg-accent/50 rounded-lg">
                                            <h4 className="font-semibold text-accent-foreground">Suggerimenti IA:</h4>
                                            {aiSuggestions.suggestions.map((s, i) => (
                                                <div key={i} className="text-sm flex items-center justify-between gap-2">
                                                   <div>
                                                        <span className="font-medium">{s.position}:</span> {s.volunteerName} - <em className="text-muted-foreground">{s.reason}</em>
                                                   </div>
                                                    <Button type="button" size="sm" variant="secondary" onClick={() => applySuggestion(s.position, s.volunteerName)}>Applica</Button>
                                                </div>
                                            ))}
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
