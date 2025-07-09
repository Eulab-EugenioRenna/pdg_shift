'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { RecordModel } from 'pocketbase';
import { getChurches } from '@/app/actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function SchedulePage() {
    const { user } = useAuth();
    const [churches, setChurches] = useState<RecordModel[]>([]);
    const [selectedChurch, setSelectedChurch] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // Filters state
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

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
                        <>
                           <Button onClick={() => setIsCreateDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Crea Evento
                           </Button>
                           <ManageEventDialog 
                                isOpen={isCreateDialogOpen}
                                setIsOpen={setIsCreateDialogOpen}
                                userChurches={churches} 
                                selectedChurchId={selectedChurch} 
                                onEventUpserted={onEventUpserted}
                           />
                        </>
                    )}
                </div>
            </div>

            <Card>
                <CardContent className="pt-6 flex flex-col md:flex-row items-center gap-4">
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
                            />
                        </PopoverContent>
                    </Popover>
                    {(searchTerm || dateRange) && (
                        <Button variant="ghost" onClick={() => { setSearchTerm(''); setDateRange(undefined); }}>
                            Reset Filtri
                        </Button>
                    )}
                </CardContent>
            </Card>

            {selectedChurch ? (
                <EventList churchId={selectedChurch} searchTerm={searchTerm} dateRange={dateRange} />
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
