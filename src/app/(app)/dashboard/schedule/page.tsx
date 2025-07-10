
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { RecordModel } from 'pocketbase';
import { getChurches } from '@/app/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, PlusCircle, Calendar as CalendarIcon } from 'lucide-react';
import { EventList } from '@/components/schedule/event-list';
import { ManageEventDialog } from '@/components/schedule/manage-event-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MultiSelect, type Option } from '@/components/ui/multi-select';

export default function SchedulePage() {
    const { user } = useAuth();
    const [churches, setChurches] = useState<RecordModel[]>([]);
    const [selectedChurches, setSelectedChurches] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // Filters state
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [showPastEvents, setShowPastEvents] = useState(false);

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
                // Pre-select the first church
                setSelectedChurches([userChurches[0].id]);
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
    
    const churchOptions: Option[] = churches.map(c => ({ value: c.id, label: c.name }));

    const onEventUpserted = () => {
        // This is now handled by subscriptions
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
                    {churchOptions.length > 1 && (
                        <MultiSelect
                            options={churchOptions}
                            selected={selectedChurches}
                            onChange={setSelectedChurches}
                            placeholder="Seleziona una o più chiese"
                            className="w-full md:w-[280px]"
                        />
                    )}
                    {canCreateEvent && (
                        <>
                           <Button 
                                onClick={() => setIsCreateDialogOpen(true)} 
                                disabled={selectedChurches.length !== 1}
                                title={selectedChurches.length !== 1 ? "Seleziona una sola chiesa per creare un evento" : "Crea Evento"}
                           >
                                <PlusCircle className="mr-2 h-4 w-4" /> Crea Evento
                           </Button>
                           {selectedChurches.length === 1 && (
                                <ManageEventDialog 
                                    isOpen={isCreateDialogOpen}
                                    setIsOpen={setIsCreateDialogOpen}
                                    userChurches={churches} 
                                    selectedChurchId={selectedChurches[0]} 
                                    onEventUpserted={onEventUpserted}
                               />
                           )}
                        </>
                    )}
                </div>
            </div>

            <Card>
                <CardContent className="pt-6 flex flex-col md:flex-row items-center gap-4 flex-wrap">
                     <Input
                        placeholder="Cerca per nome evento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:max-w-sm"
                    />
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-full md:w-[300px] justify-start text-left font-normal",
                                    !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "d MMM y", { locale: it })} -{" "}
                                            {format(dateRange.to, "d MMM y", { locale: it })}
                                        </>
                                    ) : (
                                        format(dateRange.from, "d MMM y", { locale: it })
                                    )
                                ) : (
                                    <span>Filtra per data</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                                locale={it}
                            />
                        </PopoverContent>
                    </Popover>
                    {(searchTerm || dateRange) && (
                        <Button variant="ghost" onClick={() => { setSearchTerm(''); setDateRange(undefined); }}>
                            Reset Filtri
                        </Button>
                    )}
                    <div className="flex items-center space-x-2 md:ml-auto">
                        <Switch
                            id="show-past-events"
                            checked={showPastEvents}
                            onCheckedChange={setShowPastEvents}
                        />
                        <Label htmlFor="show-past-events">Mostra eventi passati</Label>
                    </div>
                </CardContent>
            </Card>

            {selectedChurches.length > 0 ? (
                <EventList churchIds={selectedChurches} searchTerm={searchTerm} dateRange={dateRange} showPastEvents={showPastEvents} />
            ) : (
                 <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">
                            {churches.length > 0 ? 'Seleziona una chiesa per visualizzare il programma.' : 'Non sei associato a nessuna chiesa. Contatta un amministratore per essere aggiunto.'}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
