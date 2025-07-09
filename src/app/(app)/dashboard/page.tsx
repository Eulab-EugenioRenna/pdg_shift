'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Bell, Loader2, CalendarDays } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { getDashboardData, type DashboardEvent } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardCalendar } from '@/components/dashboard/dashboard-calendar';
import { EventCard } from '@/components/dashboard/event-card';

type ViewMode = 'week' | 'month';

export default function DashboardPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [dateRange, setDateRange] = useState({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
    });
    
    const [data, setData] = useState<{ events: DashboardEvent[], stats: { upcomingEvents: number, openPositions: number } } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();

    useEffect(() => {
        if (!user) return;

        // An admin does not have a `church` property, so we send an empty array
        // The server action will know to fetch for all churches in that case.
        const userChurchIds = user.role === 'admin' ? [] : (user.church || []);

        setIsLoading(true);
        getDashboardData(user.role, userChurchIds, dateRange.start.toISOString(), dateRange.end.toISOString())
            .then(data => {
                setData(data);
                setSelectedDate(undefined); // Reset selection when data reloads
            })
            .catch(error => {
                console.error(error);
                toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i dati della dashboard.' });
            })
            .finally(() => setIsLoading(false));
            
    }, [user, dateRange, toast]);

    const handleViewChange = (mode: ViewMode) => {
        if (!mode) return;
        setViewMode(mode);
        const now = new Date();
        if (mode === 'week') {
            setDateRange({
                start: startOfWeek(now, { locale: it }),
                end: endOfWeek(now, { locale: it })
            });
        } else { // month
            setDateRange({
                start: startOfMonth(now),
                end: endOfMonth(now)
            });
        }
    };
    
    const eventsForCalendar = useMemo(() => data?.events.map(e => new Date(e.start_date)) || [], [data]);

    const eventsForSelectedDay = useMemo(() => {
        if (!selectedDate || !data?.events) return [];
        return data.events.filter(event => isSameDay(new Date(event.start_date), selectedDate));
    }, [data?.events, selectedDate]);
    
    // Set the month for the calendar view to the selected date if it exists, otherwise the start of the range
    const calendarMonth = selectedDate || dateRange.start;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Bentornato, {user?.name}!</h1>
                    <p className="text-muted-foreground">
                      Questa è la tua dashboard. Da qui potrai gestire i turni e i volontari.
                    </p>
                </div>
                 <Tabs value={viewMode} onValueChange={(v) => handleViewChange(v as ViewMode)} className="w-full md:w-auto mt-4 md:mt-0">
                    <TabsList className="grid w-full grid-cols-2 md:w-auto">
                        <TabsTrigger value="week">Settimana</TabsTrigger>
                        <TabsTrigger value="month">Mese</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Prossimi Eventi</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : data?.stats.upcomingEvents ?? 0}</div>
                        <p className="text-xs text-muted-foreground">in questo periodo</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Posizioni Aperte</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : data?.stats.openPositions ?? 0}</div>
                        <p className="text-xs text-muted-foreground">leader non assegnati</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Notifiche</CardTitle>
                        <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">nuove notifiche</p>
                    </CardContent>
                </Card>
            </div>
            
             <Card>
                <CardContent className="grid gap-6 lg:grid-cols-3 p-6">
                    <div className="lg:col-span-2">
                        <DashboardCalendar 
                            events={eventsForCalendar}
                            month={calendarMonth}
                            selected={selectedDate}
                            onSelect={(date) => {
                                // If clicking the same day, deselect it. Otherwise, select the new day.
                                if (date && selectedDate && isSameDay(date, selectedDate)) {
                                    setSelectedDate(undefined);
                                } else {
                                    setSelectedDate(date);
                                }
                            }}
                        />
                    </div>
                     <div className="lg:col-span-1 space-y-4 max-h-[600px] overflow-y-auto pr-3">
                        {isLoading && (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                        {!isLoading && !selectedDate && (
                            <div className="flex flex-col items-center justify-center h-full text-center p-4 rounded-lg border-2 border-dashed">
                                <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="font-semibold">Nessun giorno selezionato</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Seleziona un giorno dal calendario per vedere gli eventi in programma.
                                </p>
                            </div>
                        )}
                        {!isLoading && selectedDate && (
                            <>
                                <h3 className="font-bold text-xl">Eventi del {format(selectedDate, 'd MMMM yyyy', { locale: it })}</h3>
                                {eventsForSelectedDay.length > 0 ? (
                                    eventsForSelectedDay.map(event => (
                                        <EventCard key={event.id} event={event} />
                                    ))
                                ) : (
                                    <div className="flex items-center justify-center h-40 rounded-lg border-2 border-dashed">
                                        <p className="text-muted-foreground">Nessun evento in programma.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </CardContent>
              </Card>
        </div>
    );
}
