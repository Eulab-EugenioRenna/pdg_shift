
'use client';

import { useState } from 'react';
import type { RecordModel } from 'pocketbase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, UserCheck, UserX, Briefcase, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ManageServiceDialog } from '../schedule/manage-service-dialog';

export interface Issue {
    event: RecordModel;
    service: RecordModel;
    type: 'leader_missing' | 'position_unfilled' | 'availability_conflict';
    position?: string;
    user?: RecordModel;
    details: string;
}

interface IssuesDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  issues: Issue[];
  onIssueHandled: () => void;
}

function getIconForIssue(type: Issue['type']) {    
    switch (type) {
        case 'leader_missing': return <UserCheck className="h-4 w-4 text-destructive" />;
        case 'position_unfilled': return <Briefcase className="h-4 w-4 text-destructive" />;
        case 'availability_conflict': return <UserX className="h-4 w-4 text-destructive" />;
        default: return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
}

export function IssuesDialog({ isOpen, setIsOpen, issues, onIssueHandled }: IssuesDialogProps) {

  const [serviceToManage, setServiceToManage] = useState<RecordModel | null>(null);
  const [isManageServiceOpen, setIsManageServiceOpen] = useState(false);

  const groupedIssues = issues.reduce((acc, issue) => {
    const key = issue.event.isRecurringInstance ? `${issue.event.id}-${issue.event.start_date}` : issue.event.id;
    if (!acc[key]) {
      acc[key] = {
        event: issue.event,
        issues: [],
      };
    }
    acc[key].issues.push(issue);
    return acc;
  }, {} as Record<string, { event: RecordModel; issues: Issue[] }>);


  const handleManageClick = (service: RecordModel) => {
    setServiceToManage(service);
    setIsManageServiceOpen(true);
  };
  
  const handleServiceUpdated = () => {
    setIsManageServiceOpen(false);
    onIssueHandled();
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Problemi da Risolvere</DialogTitle>
            <DialogDescription>
              Ecco un elenco dei problemi che richiedono la tua attenzione.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            {issues.length > 0 ? (
              <ScrollArea className="h-[60vh] pr-4">
                <Accordion type="multiple" className="w-full space-y-4">
                    {Object.values(groupedIssues).map(({ event, issues: eventIssues }) => (
                        <AccordionItem key={event.id} value={event.id} className="border rounded-lg px-4">
                            <AccordionTrigger className="py-3 hover:no-underline">
                                <div className='flex flex-col text-left'>
                                    <span className="font-semibold">{event.name}</span>
                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Calendar className="h-3 w-3"/>
                                        {format(new Date(event.start_date), "eeee d MMMM yyyy", { locale: it })}
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-3">
                                <div className="space-y-3">
                                {eventIssues.map((issue, index) => (
                                    <div key={index} className="flex items-center justify-between gap-4 p-2 rounded-md bg-secondary/50">
                                        <div className="flex items-start gap-3">
                                            {getIconForIssue(issue.type)}
                                            <div>
                                                <p className="font-medium text-sm">{issue.details}</p>
                                                <p className="text-xs text-muted-foreground">{issue.service.name}</p>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => handleManageClick(issue.service)}>
                                            Gestisci
                                        </Button>
                                    </div>
                                ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
              </ScrollArea>
            ) : (
                <div className="h-60 flex flex-col items-center justify-center text-center text-muted-foreground">
                    <AlertTriangle className="h-10 w-10 mb-2 text-green-500"/>
                    <p className="font-semibold">Nessun problema!</p>
                    <p className="text-xs">Tutti i turni sono coperti e non ci sono conflitti.</p>
                </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {serviceToManage && (
         <ManageServiceDialog
            isOpen={isManageServiceOpen}
            setIsOpen={setIsManageServiceOpen}
            service={serviceToManage}
            churchId={serviceToManage.church}
            eventDate={serviceToManage.event.start_date}
            onServiceUpdated={handleServiceUpdated}
        />
      )}
    </>
  );
}
