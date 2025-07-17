
'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Bell, Loader2, CalendarDays } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { getDashboardData, type DashboardEvent } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardCalendar } from '@/components/dashboard/dashboard-calendar';
import { WeeklyCalendarView } from '@/components/dashboard/weekly-calendar-view';
import { EventCard } from '@/components/dashboard/event-card';
import { useRouter } from 'next/navigation';
import { NotificationsDialog } from '@/components/dashboard/notifications-dialog';

type ViewMode = 'week' | 'month';

interface DashboardPageProps {
    profileJustCompleted?: boolean;
}

export default function DashboardPage({ profileJustCompleted }: DashboardPageProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    
    const [data, setData] = useState<{ events: DashboardEvent[], stats: { upcomingEvents: number, openPositions: number, unreadNotifications: number } } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    const dateRange = useMemo(() => {
        if (viewMode === 'week') {
            return {
                start: startOfWeek(currentDate, { locale: it }),
                end: endOfWeek(currentDate, { locale: it })
            };
        }
        return {
            start: startOfMonth(currentDate),
            end: endOfMonth(currentDate)
        };
    }, [viewMode, currentDate]);
    
    const fetchData = useCallback(() => {
        if (!user) return;
        
        setIsLoading(true);
        getDashboardData(user.id, user.role, user.church || [], dateRange.start.toISOString(), dateRange.end.toISOString())
            .then(newData => {
                setData(newData);
                if (selectedDate) {
                    const isSelectedDateStillPresent = newData.events.some(e => isSameDay(new Date(e.start_date), selectedDate));
                    if (!isSelectedDateStillPresent) {
                        setSelectedDate(undefined);
                    }
                }
            })
            .catch(error => {
                console.error(error);
                toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i dati della dashboard.' });
            })
            .finally(() => setIsLoading(false));
    }, [user, dateRange.start, dateRange.end, toast, selectedDate]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, dateRange, fetchData]);
    
    useEffect(() => {
        if(profileJustCompleted) {
            fetchData();
        }
    }, [profileJustCompleted, fetchData]);

    const handleViewChange = (mode: ViewMode) => {
        if (!mode) return;
        setViewMode(mode);
        setCurrentDate(new Date());
        setSelectedDate(undefined);
    };
    
    const eventsForCalendar = useMemo(() => data?.events.map(e => new Date(e.start_date)) || [], [data]);

    const eventsForSelectedDay = useMemo(() => {
        if (!selectedDate || !data?.events) return [];
        return data.events.filter(event => isSameDay(new Date(event.start_date), selectedDate));
    }, [data?.events, selectedDate]);
    
    const calendarMonth = selectedDate || dateRange.start;

    const handleSelectDate = (date: Date | undefined) => {
        if (date && !eventsForCalendar.some(eventDate => isSameDay(eventDate, date))) {
            setSelectedDate(undefined);
            return;
        }

        if (date && selectedDate && isSameDay(date, selectedDate)) {
            setSelectedDate(undefined);
        } else {
            setSelectedDate(date);
        }
    };

    const getOpenPositionsDescription = () => {
        if (user?.role === 'volontario') {
            return "leader non assegnati nei tuoi servizi";
        }
        return "leader non assegnati";
    };

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
                <Card className="cursor-pointer hover:bg-card/95 transition-colors" onClick={() => router.push('/dashboard/schedule')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Prossimi Eventi</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : data?.stats.upcomingEvents ?? 0}</div>
                        <p className="text-xs text-muted-foreground">in questo periodo</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-card/95 transition-colors" onClick={() => router.push('/dashboard/schedule')}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Posizioni Aperte</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : data?.stats.openPositions ?? 0}</div>
                        <p className="text-xs text-muted-foreground">{getOpenPositionsDescription()}</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-card/95 transition-colors" onClick={() => setIsNotificationsOpen(true)}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Notifiche</CardTitle>
                        <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : data?.stats.unreadNotifications ?? 0}</div>
                        <p className="text-xs text-muted-foreground">nuove notifiche</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                    <Card>
                        <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center min-h-[400px]">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : viewMode === 'month' ? (
                                <DashboardCalendar 
                                    events={eventsForCalendar}
                                    month={calendarMonth}
                                    selected={selectedDate}
                                    onSelect={handleSelectDate}
                                />
                            ) : (
                                data && (
                                    <WeeklyCalendarView 
                                        week={dateRange}
                                        events={data.events}
                                        selected={selectedDate}
                                        onSelect={handleSelectDate}
                                    />
                                )
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="xl:col-span-1">
                    {!selectedDate && (
                        <Card className="flex flex-col items-center justify-center text-center h-full min-h-[200px] animate-in fade-in-50">
                            <CardContent className="flex flex-col items-center justify-center pt-6">
                                <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="font-semibold">Nessun giorno selezionato</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Seleziona un giorno dal calendario per vederne i dettagli.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {selectedDate && eventsForSelectedDay.length > 0 && (
                         <div className="space-y-4 animate-in fade-in-50 h-full">
                            <h3 className="font-bold text-xl">Eventi del {format(selectedDate, 'd MMMM yyyy', { locale: it })}</h3>
                            <div className="space-y-4 max-h-[calc(100vh-350px)] overflow-y-auto pr-2">
                                {eventsForSelectedDay.map(event => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
             <NotificationsDialog
                isOpen={isNotificationsOpen}
                setIsOpen={setIsNotificationsOpen}
                onNotificationsHandled={fetchData} 
            />
        </div>
    );
}
