'use client';

import { useMemo } from 'react';
import { addDays, format, isSameDay, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DashboardEvent } from '@/app/actions';

interface WeeklyCalendarViewProps {
    week: { start: Date; end: Date };
    events: DashboardEvent[];
    selected: Date | undefined;
    onSelect: (date: Date | undefined) => void;
}

export function WeeklyCalendarView({ week, events, selected, onSelect }: WeeklyCalendarViewProps) {
    const days = useMemo(() => {
        const dayArray = [];
        for (let i = 0; i < 7; i++) {
            dayArray.push(addDays(week.start, i));
        }
        return dayArray;
    }, [week]);

    const eventsByDay = useMemo(() => {
        const map = new Map<string, DashboardEvent[]>();
        days.forEach(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const eventsForDay = events.filter(event => isSameDay(new Date(event.start_date), day));
            map.set(dayKey, eventsForDay);
        });
        return map;
    }, [days, events]);

    return (
        <div className="border-t">
            <header className="grid grid-cols-7">
                {days.map(day => (
                    <div key={day.toISOString()} className="text-center text-sm font-medium text-muted-foreground p-2 border-b border-l first:border-l-0">
                        {format(day, 'eee', { locale: it })}
                    </div>
                ))}
            </header>
            <div className="grid grid-cols-7 h-[calc(100vh-400px)] min-h-[300px]">
                {days.map(day => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayEvents = eventsByDay.get(dayKey) || [];
                    const isSelected = selected && isSameDay(day, selected);

                    return (
                        <div
                            key={dayKey}
                            onClick={() => onSelect(day)}
                            className={cn(
                                'border-b border-l first:border-l-0 p-2 relative cursor-pointer transition-colors overflow-y-auto',
                                isSelected ? 'bg-accent' : 'hover:bg-accent/50',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex items-center justify-center h-6 w-6 rounded-full text-sm mb-2',
                                    isToday(day) && !isSelected && 'bg-primary text-primary-foreground',
                                    isSelected && 'bg-primary text-primary-foreground ring-2 ring-background'
                                )}
                            >
                                {format(day, 'd')}
                            </span>
                            <div className="space-y-1">
                                {dayEvents.map(event => (
                                     <div key={event.id} className="text-xs p-1 rounded-sm bg-primary/20 truncate" title={event.name}>
                                        {event.name}
                                     </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
