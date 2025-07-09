'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ListChecks } from 'lucide-react';

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
    );
}
