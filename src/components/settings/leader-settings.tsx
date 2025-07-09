'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListChecks, UserCog, Trash2 } from 'lucide-react';
import { ManageProfileDialog } from '@/components/settings/manage-profile-dialog';

export default function LeaderSettings() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Impostazioni Leader</CardTitle>
                    <CardDescription>
                        Gestisci i servizi a te assegnati e visualizza le tue informazioni.
                    </CardDescription>
                </CardHeader>
            </Card>
            
            <div className="grid gap-6 md:grid-cols-1">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <ListChecks className="w-8 h-8 text-primary" />
                            <CardTitle>I tuoi servizi</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Visualizza e gestisci i volontari per i servizi di cui sei responsabile.</p>
                        <Button>Vai ai tuoi servizi</Button>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <UserCog className="w-8 h-8 text-primary" />
                            <CardTitle>Profilo</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Modifica le tue informazioni personali e preferenze.</p>
                        <ManageProfileDialog />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Trash2 className="w-8 h-8 text-destructive" />
                            <CardTitle>Elimina Account</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Questa azione è irreversibile. Tutti i tuoi dati verranno cancellati.</p>
                        <Button variant="destructive">Elimina il tuo account</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
