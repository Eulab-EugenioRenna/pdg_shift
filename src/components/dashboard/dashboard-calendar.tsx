
'use client';

import { Calendar } from "@/components/ui/calendar";
import { it } from 'date-fns/locale';

interface DashboardCalendarProps {
    events: Date[];
    month: Date;
    selected: Date | undefined;
    onSelect: (date: Date | undefined) => void;
    onMonthChange: (month: Date) => void;
}

export function DashboardCalendar({ events, month, selected, onSelect, onMonthChange }: DashboardCalendarProps) {
    const eventDays = events.map(d => new Date(d));

    return (
        <Calendar
            locale={it}
            mode="single"
            month={month}
            onMonthChange={onMonthChange}
            selected={selected}
            onSelect={onSelect}
            showOutsideDays
            weekStartsOn={1}
            className="p-0"
            classNames={{
                months: "flex flex-col sm:flex-row",
                month: "space-y-4 w-full",
                caption: "flex justify-center pt-1 relative items-center text-lg",
                caption_label: "font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-full justify-center flex font-normal text-sm",
                row: "flex w-full mt-2 min-h-[100px]",
                cell: "h-auto w-full text-left text-sm p-0 relative [&:has([aria-selected])]:bg-accent/50 focus-within:relative focus-within:z-20 border-t border-l first:border-l-0",
                day: "h-full w-full p-2 justify-start items-start font-normal hover:bg-accent/50 rounded-none",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "day-outside text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "",
                day_hidden: "invisible",
            }}
            modifiers={{
                hasEvent: eventDays,
            }}
            modifiersClassNames={{
                hasEvent: "relative after:content-[''] after:absolute after:bottom-2 after:left-1/2 after:-translate-x-1/2 after:h-2 after:w-2 after:rounded-full after:bg-primary after:transition-transform hover:after:scale-150",
            }}
        />
    );
}
