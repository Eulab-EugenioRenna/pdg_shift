'use client';

import { Calendar } from "@/components/ui/calendar";
import { it } from 'date-fns/locale';

interface DashboardCalendarProps {
    events: Date[];
    month: Date;
}

export function DashboardCalendar({ events, month }: DashboardCalendarProps) {
    const eventDays = events.map(d => new Date(d));

    return (
        <Calendar
            locale={it}
            mode="single"
            month={month}
            showOutsideDays
            weekStartsOn={1}
            className="p-0"
            classNames={{
                day_disabled: "cursor-default",
                day_today: "bg-primary/20"
            }}
            modifiers={{
                hasEvent: eventDays,
            }}
            modifiersClassNames={{
                hasEvent: "bg-accent text-accent-foreground rounded-md font-bold",
            }}
            disabled // Disables interaction
        />
    );
}
