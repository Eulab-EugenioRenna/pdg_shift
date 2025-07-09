'use client';

import { Calendar } from "@/components/ui/calendar";
import { it } from 'date-fns/locale';

interface DashboardCalendarProps {
    events: Date[];
    month: Date;
    selected: Date | undefined;
    onSelect: (date: Date | undefined) => void;
}

export function DashboardCalendar({ events, month, selected, onSelect }: DashboardCalendarProps) {
    const eventDays = events.map(d => new Date(d));

    return (
        <Calendar
            locale={it}
            mode="single"
            month={month}
            selected={selected}
            onSelect={onSelect}
            showOutsideDays
            weekStartsOn={1}
            className="rounded-md border"
            classNames={{
                day_today: "bg-accent text-accent-foreground",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary",
            }}
            modifiers={{
                hasEvent: eventDays,
            }}
            modifiersClassNames={{
                hasEvent: "bg-primary/20",
            }}
        />
    );
}
