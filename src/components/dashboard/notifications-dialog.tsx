
'use client';

import { useState, useEffect, useTransition } from 'react';
import type { RecordModel } from 'pocketbase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '@/app/actions';
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
import { Loader2, Trash2, Check, CheckCheck, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface NotificationsDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onNotificationsHandled: () => void;
}

export function NotificationsDialog({ isOpen, setIsOpen, onNotificationsHandled }: NotificationsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<RecordModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, startUpdateTransition] = useTransition();

  const fetchNotifications = () => {
    if (!user) return;
    setIsLoading(true);
    getNotifications(user.id)
      .then(setNotifications)
      .catch(() => toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare le notifiche.' }))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, user]);

  const handleMarkAsRead = (id: string) => {
    startUpdateTransition(async () => {
      try {
        await markNotificationAsRead(id);
        fetchNotifications();
        onNotificationsHandled();
      } catch (error) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile segnare come letta.' });
      }
    });
  };
  
  const handleMarkAllAsRead = () => {
    if (!user) return;
    startUpdateTransition(async () => {
      try {
        await markAllNotificationsAsRead(user.id);
        fetchNotifications();
        onNotificationsHandled();
        toast({ title: 'Fatto!', description: 'Tutte le notifiche sono state segnate come lette.' });
      } catch (error) {
         toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile segnare tutto come letto.' });
      }
    });
  }

  const handleDelete = (id: string) => {
    startUpdateTransition(async () => {
      try {
        await deleteNotification(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        toast({ title: 'Successo', description: 'Notifica eliminata.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile eliminare la notifica.' });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Notifiche</DialogTitle>
          <DialogDescription>
            Qui trovi tutti gli aggiornamenti che ti riguardano.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
            {isUpdating && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            )}
            {isLoading ? (
            <div className="flex items-center justify-center h-60">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            ) : notifications.length > 0 ? (
            <ScrollArea className="h-80 pr-4">
                <div className="space-y-3">
                {notifications.map((n) => (
                    <div
                    key={n.id}
                    className={cn(
                        'p-3 rounded-lg border flex justify-between items-start gap-3',
                        !n.read && 'bg-accent/50 border-primary/50'
                    )}
                    >
                    <div className="flex-1">
                        <p className="font-semibold text-sm">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{n.body}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(n.created), { addSuffix: true, locale: it })}
                        </p>
                    </div>
                    <div className="flex gap-1">
                         {!n.read && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                title="Segna come letto"
                                onClick={() => handleMarkAsRead(n.id)}
                            >
                                <Check className="h-4 w-4" />
                            </Button>
                        )}
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Elimina"
                            onClick={() => handleDelete(n.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    </div>
                ))}
                </div>
            </ScrollArea>
            ) : (
                <div className="h-60 flex flex-col items-center justify-center text-center text-muted-foreground">
                    <BellOff className="h-10 w-10 mb-2"/>
                    <p>Nessuna notifica</p>
                    <p className="text-xs">Quando ci saranno novità, le troverai qui.</p>
                </div>
            )}
        </div>
        <DialogFooter className="sm:justify-between gap-2">
            <Button 
                variant="ghost"
                onClick={handleMarkAllAsRead}
                disabled={isUpdating || isLoading || notifications.every(n => n.read)}
            >
                <CheckCheck className="mr-2 h-4 w-4" />
                Segna tutte come lette
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
                Chiudi
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
