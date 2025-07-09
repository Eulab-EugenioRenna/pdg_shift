'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Bell, Loader2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { getDashboardData, type DashboardEvent } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardCalendar } from '@/components/dashboard/dashboard-calendar';
import { EventCard } from '@/components/dashboard/event-card';

type ViewMode = 'week' | 'month';

export default function DashboardPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [dateRange, setDateRange] = useState({
        start: startOfWeek(new Date(), { locale: it }),
        end: endOfWeek(new Date(), { locale: it })
    });
    
    const [data, setData] = useState<{ events: DashboardEvent[], stats: { upcomingEvents: number, openPositions: number } } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        // An admin does not have a `church` property, so we send an empty array
        // The server action will know to fetch for all churches in that case.
        const userChurchIds = user.role === 'admin' ? [] : (user.church || []);

        setIsLoading(true);
        getDashboardData(user.role, userChurchIds, dateRange.start.toISOString(), dateRange.end.toISOString())
            .then(setData)
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

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Bentornato, {user?.name}!</h1>
             <p className="text-muted-foreground">
              Questa è la tua dashboard. Da qui potrai gestire i turni e i volontari.
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <CardTitle>Il Tuo Calendario</CardTitle>
                            <CardDescription>
                                {viewMode === 'week' ? 'Eventi per la settimana corrente.' : 'Eventi per il mese corrente.'}
                            </CardDescription>
                        </div>
                        <Tabs value={viewMode} onValueChange={(v) => handleViewChange(v as ViewMode)} className="w-full md:w-auto">
                            <TabsList className="grid w-full grid-cols-2 md:w-auto">
                                <TabsTrigger value="week">Settimana</TabsTrigger>
                                <TabsTrigger value="month">Mese</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-2">
                    <DashboardCalendar 
                        events={eventsForCalendar}
                        month={dateRange.start}
                    />
                     <div className="space-y-4 max-h-[500px] overflow-y-auto pr-3">
                        {isLoading && (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                        {!isLoading && data?.events && data.events.length > 0 && data.events.map(event => (
                            <EventCard key={event.id} event={event} />
                        ))}
                        {!isLoading && (!data?.events || data.events.length === 0) && (
                            <div className="flex items-center justify-center h-40 rounded-lg border-2 border-dashed">
                                <p className="text-muted-foreground">Nessun evento in programma per questo periodo.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
              </Card>
        </div>
    );
}
