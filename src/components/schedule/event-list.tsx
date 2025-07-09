'use client';

import { useState, useEffect } from 'react';
import { getEvents, getServicesForEvent } from '@/app/actions';
import type { RecordModel } from 'pocketbase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, Calendar, Clock, UserCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

function ServiceList({ eventId }: { eventId: string }) {
    const [services, setServices] = useState<RecordModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getServicesForEvent(eventId)
            .then(setServices)
            .finally(() => setIsLoading(false));
    }, [eventId]);

    if (isLoading) {
        return <Loader2 className="h-4 w-4 animate-spin my-2" />;
    }

    if (services.length === 0) {
        return <p className="text-sm text-muted-foreground py-2">Nessun servizio per questo evento.</p>
    }

    return (
        <div className="space-y-2 pt-2">
            {services.map(service => (
                <div key={service.id} className="p-3 rounded-md bg-secondary/50 flex justify-between items-center">
                    <div>
                        <p className="font-semibold">{service.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2"><UserCheck className="w-3 h-3"/> Leader: {service.expand?.leader?.name || 'Non assegnato'}</p>
                    </div>
                    <Button variant="outline" size="sm">Gestisci</Button>
                </div>
            ))}
        </div>
    );
}

export function EventList({ churchId }: { churchId: string }) {
    const [events, setEvents] = useState<RecordModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (churchId) {
            setIsLoading(true);
            getEvents(churchId)
                .then(setEvents)
                .finally(() => setIsLoading(false));
        }
    }, [churchId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (events.length === 0) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Nessun evento trovato per questa chiesa.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {events.map(event => (
                <Card key={event.id}>
                    <CardHeader>
                        <CardTitle>{event.name}</CardTitle>
                        <CardDescription>{event.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1">
                                <AccordionTrigger>Visualizza Servizi</AccordionTrigger>
                                <AccordionContent>
                                    <ServiceList eventId={event.id} />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                    <CardFooter className="flex flex-wrap gap-x-6 gap-y-2 justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(event.start_date), "eeee d MMMM yyyy", { locale: it })}</span>
                        </div>
                         <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{format(new Date(event.start_date), "HH:mm")} - {format(new Date(event.end_date), "HH:mm")}</span>
                        </div>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
