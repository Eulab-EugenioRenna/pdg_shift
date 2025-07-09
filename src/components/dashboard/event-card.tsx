'use client';

import type { DashboardEvent } from "@/app/actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar, Clock, Repeat, UserCheck, Users } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import type { RecordModel } from "pocketbase";

interface EventCardProps {
    event: DashboardEvent;
}

export function EventCard({ event }: EventCardProps) {
    return (
        <TooltipProvider>
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {event.name} 
                        {event.isRecurringInstance && <Repeat className="inline h-4 w-4 text-muted-foreground" title="Evento Ricorrente" />}
                    </CardTitle>
                    <CardDescription>{event.description || 'Nessuna descrizione.'}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                   {event.expand.services.length > 0 ? (
                    event.expand.services.map(service => (
                        <div key={service.id} className="p-3 rounded-md bg-secondary/50">
                            <p className="font-semibold">{service.name}</p>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                <UserCheck className="w-3 h-3"/> 
                                Leader: {service.expand?.leader?.name || <span className="text-destructive">Non assegnato</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <div className="flex -space-x-2">
                                    {service.expand?.team && service.expand.team.length > 0 ? (
                                        service.expand.team.slice(0, 7).map((member: RecordModel) => (
                                            <Tooltip key={member.id}>
                                                <TooltipTrigger asChild>
                                                    <Avatar className="h-6 w-6 border-2 border-background">
                                                        <AvatarImage src={member.avatar ? pb.getFileUrl(member, member.avatar, { thumb: '100x100' }) : `https://placehold.co/24x24.png`} alt={member.name} />
                                                        <AvatarFallback>{member.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                </TooltipTrigger>
                                                <TooltipContent><p>{member.name}</p></TooltipContent>
                                            </Tooltip>
                                        ))
                                    ) : (
                                        <span className="text-xs text-muted-foreground">Nessun volontario.</span>
                                    )}
                                    {service.expand?.team && service.expand.team.length > 7 && (
                                        <Avatar className="h-6 w-6 border-2 border-background">
                                            <AvatarFallback>+{service.expand.team.length - 7}</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                   ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Nessun servizio per questo evento.</p>
                   )}
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm text-muted-foreground pt-4 border-t">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(event.start_date), "eeee d MMMM", { locale: it })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{format(new Date(event.start_date), "HH:mm")} - {format(new Date(event.end_date), "HH:mm")}</span>
                    </div>
                </CardFooter>
            </Card>
        </TooltipProvider>
    );
}
