
'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Bell, Loader2, CalendarDays, AlertTriangle, UserCheck, UserX, Briefcase } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { getDashboardData, type DashboardEvent, type UnavailabilityRecord } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, format, isWithinInterval, isSameMonth, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardCalendar } from '@/components/dashboard/dashboard-calendar';
import { WeeklyCalendarView } from '@/components/dashboard/weekly-calendar-view';
import { EventCard } from '@/components/dashboard/event-card';
import { useRouter } from 'next/navigation';
import { NotificationsDialog } from '@/components/dashboard/notifications-dialog';
import { cn } from '@/lib/utils';
import { IssuesDialog, type Issue } from '@/components/dashboard/issues-dialog';

type ViewMode = 'week' | 'month';

interface DashboardPageProps {
    profileJustCompleted?: boolean;
}

interface Stats {
    upcomingEvents: number;
    issues: Issue[];
    unreadNotifications: number;
}

export default function DashboardPage({ profileJustCompleted }: DashboardPageProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    
    const [allEvents, setAllEvents] = useState<DashboardEvent[]>([]);
    const [allUnavailabilities, setAllUnavailabilities] = useState<UnavailabilityRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [displayStats, setDisplayStats] = useState<Stats | null>(null);

    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isIssuesOpen, setIsIssuesOpen] = useState(false);
    
    const fetchData = useCallback(() => {
        if (!user) return;
        
        setIsLoading(true);
        getDashboardData(user.id, user.role, user.church || [])
            .then(newData => {
                setAllEvents(newData.events);
                setAllUnavailabilities(newData.unavailabilities);
                setDisplayStats(prev => ({...prev, unreadNotifications: newData.initialStats.unreadNotifications, upcomingEvents: newData.initialStats.upcomingEvents, issues: [] }));
            })
            .catch(error => {
                console.error(error);
                toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i dati della dashboard.' });
            })
            .finally(() => setIsLoading(false));
    }, [user, toast]);
    
    useEffect(() => {
        if (user) {
            fetchData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, profileJustCompleted]);

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

    useEffect(() => {
        if (isLoading || !allEvents || !user) return;

        const now = new Date();
        const statsStartDate = isSameMonth(currentDate, now) ? now : dateRange.start;

        const eventsInCurrentView = allEvents.filter(event => {
            const eventDate = new Date(event.start_date);
            return isWithinInterval(eventDate, dateRange) && eventDate >= statsStartDate;
        });

        const issues: Issue[] = [];

        eventsInCurrentView.forEach(event => {
             if (event.name.startsWith('[Annullato]')) return;

            event.expand?.services?.forEach((service: any) => {
                // 1. Check for missing leader
                if (!service.expand?.leader) {
                    issues.push({ event, service, type: 'leader_missing', details: `Leader non assegnato per ${service.name}.` });
                } else {
                    // Check leader's availability
                    const leaderUnavailable = allUnavailabilities.find(u => u.user === service.leader && isWithinInterval(parseISO(event.start_date), { start: parseISO(u.start_date), end: parseISO(u.end_date) }));
                    if (leaderUnavailable) {
                        issues.push({ event, service, type: 'availability_conflict', user: service.expand.leader, details: `Il leader ${service.expand.leader.name} si è reso indisponibile.` });
                    }
                }

                // 2. Check for unfilled positions
                const assignments = service.team_assignments || {};
                const positions = Array.isArray(service.positions) ? service.positions : [];
                positions.forEach((position: string) => {
                    if (!assignments[position]) {
                        issues.push({ event, service, type: 'position_unfilled', position, details: `Posizione "${position}" scoperta.` });
                    }
                });

                // 3. Check for team members' availability
                const teamMembers = service.expand?.team || [];
                teamMembers.forEach((member: any) => {
                    const memberUnavailable = allUnavailabilities.find(u => u.user === member.id && isWithinInterval(parseISO(event.start_date), { start: parseISO(u.start_date), end: parseISO(u.end_date) }));
                    if (memberUnavailable) {
                        const position = Object.keys(assignments).find(p => assignments[p] === member.id);
                        issues.push({ event, service, type: 'availability_conflict', user: member, position, details: `Il volontario ${member.name} (${position || 'team'}) si è reso indisponibile.` });
                    }
                });
            });
        });
        
        const activeEventsInView = eventsInCurrentView.filter(e => !e.name.startsWith('[Annullato]'));

        setDisplayStats(prev => ({
            ...prev!,
            upcomingEvents: activeEventsInView.length,
            issues,
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDate, viewMode, allEvents, isLoading, allUnavailabilities, user]);


    const handleViewChange = (mode: ViewMode) => {
        if (!mode) return;
        setViewMode(mode);
        setCurrentDate(new Date());
        setSelectedDate(undefined);
    };
    
    const handleMonthChange = (month: Date) => {
        setCurrentDate(month);
        setSelectedDate(undefined);
    }

    const handleGoToToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(undefined);
    }
    
    const eventsForCalendar = useMemo(() => allEvents.map(e => new Date(e.start_date)) || [], [allEvents]);

    const eventsForSelectedDay = useMemo(() => {
        if (!selectedDate || !allEvents) return [];
        return allEvents.filter(event => isSameDay(new Date(event.start_date), selectedDate));
    }, [allEvents, selectedDate]);
    
    const calendarMonth = dateRange.start;

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
    
    const isVolunteer = user?.role === 'volontario';

    const issueCounts = useMemo(() => {
        if (!displayStats) return { leaders: 0, positions: 0, conflicts: 0, total: 0 };
        const leaders = displayStats.issues.filter(i => i.type === 'leader_missing').length;
        const positions = displayStats.issues.filter(i => i.type === 'position_unfilled').length;
        const conflicts = displayStats.issues.filter(i => i.type === 'availability_conflict').length;
        return { leaders, positions, conflicts, total: leaders + positions + conflicts };
    }, [displayStats]);


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
                <Card
                  className={cn(isVolunteer ? "cursor-default" : "cursor-pointer hover:bg-card/95 transition-colors")}
                  onClick={!isVolunteer ? () => router.push('/dashboard/schedule') : undefined}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Prossimi Eventi</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading || displayStats === null ? <Loader2 className="h-6 w-6 animate-spin" /> : displayStats.upcomingEvents}</div>
                        <p className="text-xs text-muted-foreground">in questo periodo</p>
                    </CardContent>
                </Card>
                <Card
                  className={cn(isVolunteer || issueCounts.total === 0 ? "cursor-default" : "cursor-pointer hover:bg-card/95 transition-colors")}
                  onClick={() => !isVolunteer && issueCounts.total > 0 && setIsIssuesOpen(true)}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Problemi da Risolvere</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading || displayStats === null ? <Loader2 className="h-6 w-6 animate-spin" /> : issueCounts.total}</div>
                         <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                            <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" />L: {issueCounts.leaders}</span>
                            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />R: {issueCounts.positions}</span>
                            <span className="flex items-center gap-1"><UserX className="h-3 w-3" />S: {issueCounts.conflicts}</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-card/95 transition-colors" onClick={() => setIsNotificationsOpen(true)}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Notifiche</CardTitle>
                        <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading || displayStats === null ? <Loader2 className="h-6 w-6 animate-spin" /> : displayStats.unreadNotifications}</div>
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
                                    onMonthChange={handleMonthChange}
                                    onGoToToday={handleGoToToday}
                                />
                            ) : (
                                <WeeklyCalendarView 
                                    week={dateRange}
                                    events={allEvents}
                                    selected={selectedDate}
                                    onSelect={handleSelectDate}
                                />
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
                onNotificationsHandled={() => {
                    if (user) {
                         getDashboardData(user.id, user.role, user.church || [])
                            .then(newData => setDisplayStats(prev => ({...prev!, unreadNotifications: newData.initialStats.unreadNotifications})));
                    }
                }} 
            />
            <IssuesDialog
                isOpen={isIssuesOpen}
                setIsOpen={setIsIssuesOpen}
                issues={displayStats?.issues || []}
                onIssueHandled={fetchData}
            />
        </div>
    );
}
