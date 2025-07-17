
'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { getEvents, getChurches } from '@/app/actions';
import type { RecordModel } from 'pocketbase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Repeat, Building } from 'lucide-react';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { pb } from '@/lib/pocketbase';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

interface EventListProps {
    churchIds: string[];
    searchTerm: string;
    dateRange?: DateRange;
    showPastEvents: boolean;
    onSelectEvent: (event: RecordModel) => void;
    selectedEventId?: string;
    onEventsFiltered: (events: RecordModel[]) => void;
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


export function EventList({ churchIds, searchTerm, dateRange, showPastEvents, onSelectEvent, selectedEventId, onEventsFiltered }: EventListProps) {
    const { user } = useAuth();
    const [events, setEvents] = useState<RecordModel[]>([]);
    const [churchesMap, setChurchesMap] = useState<Map<string, string>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    
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
            getChurches(user?.id, user?.role)
        ]).then(([eventsData, churchesData]) => {
            setEvents(eventsData);
            const map = new Map();
            churchesData.forEach((c: RecordModel) => map.set(c.id, c.name));
            setChurchesMap(map);
        }).finally(() => {
            setIsLoading(false);
        });

        const handleEventSubscription = () => fetchAndSetEvents();

        pb.collection('pdg_events').subscribe('*', handleEventSubscription);

        return () => {
            pb.collection('pdg_events').unsubscribe('*');
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [churchIds, user]);
    
    const filteredEvents = useMemo(() => {
        const singleEvents = events.filter(e => !e.is_recurring);
        const recurringTemplates = events.filter(e => e.is_recurring);
    
        const singleEventDateKeys = new Set(
            singleEvents.map(e => `${format(new Date(e.start_date), 'yyyy-MM-dd')}-${e.church}`)
        );
        
        let recurrenceRangeStart = new Date();
        const futureLimit = new Date();
        futureLimit.setMonth(futureLimit.getMonth() + 3);
    
        if (dateRange?.from) {
            recurrenceRangeStart = new Date(dateRange.from);
        } else if (showPastEvents) {
            recurrenceRangeStart.setFullYear(recurrenceRangeStart.getFullYear() - 1);
        } else {
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
    
        const finalFilteredEvents = allPossibleEvents.filter(event => {
            const matchSearch = searchTerm
                ? event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase()))
                : true;
            
            let matchDate = true;
            if (dateRange?.from) {
                const eventStart = new Date(event.start_date);
                const eventEnd = event.end_date ? new Date(event.end_date) : new Date(event.start_date);
                const filterFrom = new Date(dateRange.from);
                filterFrom.setHours(0, 0, 0, 0);
                const filterTo = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
                filterTo.setHours(23, 59, 59, 999);
                matchDate = eventStart <= filterTo && eventEnd >= filterFrom;
            } else if (!showPastEvents) {
                const twoDaysAgo = new Date();
                twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                twoDaysAgo.setHours(0, 0, 0, 0);
                matchDate = new Date(event.start_date) >= twoDaysAgo;
            }
    
            return matchSearch && matchDate;
        });
    
        return finalFilteredEvents.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    }, [events, searchTerm, dateRange, showPastEvents]);
    
    useEffect(() => {
        onEventsFiltered(filteredEvents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredEvents]);

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
                    <p className="text-center text-muted-foreground">Nessun evento trovato. Crea il primo!</p>
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
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle>Eventi in Programma</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-grow flex flex-col">
                <ScrollArea className="flex-grow">
                    <div className="space-y-2 p-4 pt-0">
                        {filteredEvents.map(event => (
                            <button
                                key={event.isRecurringInstance ? `${event.id}-${event.start_date}` : event.id}
                                onClick={() => onSelectEvent(event)}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg border transition-colors",
                                    selectedEventId === (event.isRecurringInstance ? `${event.id}-${event.start_date}` : event.id) ? "bg-accent border-primary" : "hover:bg-accent/50"
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold">{event.name}</p>
                                    {event.isRecurringInstance && <Repeat className="h-4 w-4 text-muted-foreground" title="Evento Ricorrente" />}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {format(new Date(event.start_date), "eeee d MMMM yyyy", { locale: it })}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <Building className="h-3 w-3" />
                                    <span>{churchesMap.get(event.church) || 'Chiesa non trovata'}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
