'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog, Trash2 } from 'lucide-react';
import { ManageProfileDialog } from '@/components/settings/manage-profile-dialog';
import { DeleteAccountDialog } from '@/components/settings/delete-account-dialog';

export default function VolunteerSettings() {
    const { user } = useAuth();
    
    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Le tue Impostazioni</CardTitle>
                    <CardDescription>
                        Gestisci le informazioni del tuo profilo.
                    </CardDescription>
                </CardHeader>
            </Card>

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
                        <DeleteAccountDialog />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
