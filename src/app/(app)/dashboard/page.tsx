'use client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Bell } from 'lucide-react';

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Bentornato, {user?.name}!</h1>
             <p className="text-muted-foreground">
              Questa è la tua dashboard. Da qui potrai gestire i turni e i volontari.
            </p>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Prossimi Servizi</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">nei prossimi 7 giorni</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Posizioni Aperte</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">in tutti i prossimi servizi</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Notifiche</CardTitle>
                        <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">nuove notifiche</p>
                    </CardContent>
                </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Il Tuo Calendario</CardTitle>
                  <CardDescription>I tuoi prossimi impegni saranno visualizzati qui.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center h-40 rounded-lg border-2 border-dashed">
                    <p className="text-muted-foreground">Il componente calendario verrà aggiunto qui.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
        </div>
    );
}
