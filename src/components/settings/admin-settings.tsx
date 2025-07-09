'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, UserPlus, CalendarPlus } from 'lucide-react';

export default function AdminSettings() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Impostazioni Amministratore</CardTitle>
                    <CardDescription>
                        Da qui puoi gestire le impostazioni globali dell'applicazione.
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                         <div className="flex items-center gap-4">
                            <Building className="w-8 h-8 text-primary" />
                            <CardTitle>Gestione Chiese</CardTitle>
                         </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Aggiungi o modifica le chiese disponibili sulla piattaforma.</p>
                        <Button>Crea Chiesa</Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <UserPlus className="w-8 h-8 text-primary" />
                            <CardTitle>Gestione Utenti</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Aggiungi nuovi utenti e gestisci i loro ruoli.</p>
                        <Button>Crea Utente</Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <CalendarPlus className="w-8 h-8 text-primary" />
                            <CardTitle>Gestione Turni</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Crea e configura i modelli per i turni di servizio.</p>
                        <Button>Crea Turno</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
