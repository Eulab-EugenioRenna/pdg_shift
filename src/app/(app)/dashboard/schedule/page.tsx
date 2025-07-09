'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { RecordModel } from 'pocketbase';
import { getChurches } from '@/app/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { EventList } from '@/components/schedule/event-list';
import { ManageEventDialog } from '@/components/schedule/manage-event-dialog';

export default function SchedulePage() {
    const { user } = useAuth();
    const [churches, setChurches] = useState<RecordModel[]>([]);
    const [selectedChurch, setSelectedChurch] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const loadChurches = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            let userChurches: RecordModel[] = [];
            if (user.role === 'admin') {
                userChurches = await getChurches();
            } else {
                userChurches = user.expand?.church || [];
            }
            setChurches(userChurches);
            if (userChurches.length > 0) {
                setSelectedChurch(userChurches[0].id);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);
    
    useEffect(() => {
        loadChurches();
    }, [loadChurches]);

    const canCreateEvent = user?.role === 'admin' || user?.role === 'leader';
    const hasMultipleChurches = churches.length > 1;

    const onEventCreated = () => {
        setRefreshKey(prev => prev + 1);
    }
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Programma</h1>
                    <p className="text-muted-foreground">Visualizza e gestisci gli eventi e i servizi della chiesa.</p>
                </div>
                 <div className="flex items-center gap-4">
                    {hasMultipleChurches && (
                        <Select onValueChange={setSelectedChurch} value={selectedChurch}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <SelectValue placeholder="Seleziona una chiesa" />
                            </SelectTrigger>
                            <SelectContent>
                                {churches.map((church) => (
                                    <SelectItem key={church.id} value={church.id}>
                                        {church.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {canCreateEvent && selectedChurch && (
                       <ManageEventDialog 
                            userChurches={churches} 
                            selectedChurchId={selectedChurch} 
                            onEventCreated={onEventCreated}
                       />
                    )}
                </div>
            </div>

            {selectedChurch ? (
                <EventList key={refreshKey} churchId={selectedChurch} />
            ) : (
                 <Card>
                    <CardHeader>
                        <CardTitle>Nessuna chiesa selezionata</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            {churches.length > 0 ? 'Seleziona una chiesa per visualizzare il programma.' : 'Non sei associato a nessuna chiesa. Contatta un amministratore per essere aggiunto.'}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
