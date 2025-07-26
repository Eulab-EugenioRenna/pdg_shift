
'use client';

import { useState, useEffect, useTransition } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { RecordModel } from 'pocketbase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { addUnavailability, updateUnavailability } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

interface ManageUnavailabilityDialogProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    period: RecordModel | null;
    onSave: () => void;
}

export function ManageUnavailabilityDialog({ isOpen, setIsOpen, period, onSave }: ManageUnavailabilityDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [reason, setReason] = useState('');
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (isOpen) {
            if (period) {
                setDateRange({
                    from: new Date(period.start_date),
                    to: new Date(period.end_date),
                });
                setReason(period.reason || '');
            } else {
                setDateRange(undefined);
                setReason('');
            }
        }
    }, [isOpen, period]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !dateRange || !dateRange.from) {
            toast({ variant: 'destructive', title: 'Errore', description: 'Seleziona almeno una data di inizio.' });
            return;
        }

        startTransition(async () => {
            const data = {
                user: user.id,
                start_date: format(dateRange.from!, 'yyyy-MM-dd'),
                end_date: format(dateRange.to || dateRange.from!, 'yyyy-MM-dd'),
                reason: reason.trim(),
            };

            try {
                if (period) {
                    await updateUnavailability(period.id, data);
                    toast({ title: 'Successo', description: 'Periodo di indisponibilità aggiornato.' });
                } else {
                    await addUnavailability(data);
                    toast({ title: 'Successo', description: 'Periodo di indisponibilità aggiunto.' });
                }
                onSave();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Errore', description: error.message });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{period ? 'Modifica' : 'Aggiungi'} Periodo di Indisponibilità</DialogTitle>
                    <DialogDescription>
                        Seleziona le date in cui non sarai disponibile. Se è solo un giorno, seleziona la stessa data due volte.
                    </DialogDescription>
                </DialogHeader>
                 <ScrollArea className="max-h-[70vh] -mx-6">
                    <form onSubmit={handleSubmit} className="space-y-6 py-4 px-6">
                        <div>
                            <Label htmlFor="unavailability-date-range">Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="unavailability-date-range"
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
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
                                            <span>Seleziona un intervallo di date</span>
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
                                        weekStartsOn={1}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label htmlFor="reason">Motivo (Opzionale)</Label>
                            <Textarea
                                id="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Es. Vacanza, impegni familiari..."
                                disabled={isPending}
                            />
                        </div>
                        <DialogFooter className="sticky bottom-0 bg-background pt-4 -mx-6 px-6 pb-0">
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                                Annulla
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salva
                            </Button>
                        </DialogFooter>
                    </form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
