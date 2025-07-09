'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, UserPlus, UserCog, Trash2, ListTodo, ClipboardPlus } from 'lucide-react';
import { ManageChurchesDialog } from '@/components/admin/manage-churches-dialog';
import { ManageUsersDialog } from '@/components/admin/manage-users-dialog';
import { ManageProfileDialog } from '@/components/settings/manage-profile-dialog';
import { DeleteAccountDialog } from '@/components/settings/delete-account-dialog';
import { ManageServiceTemplatesDialog } from '@/components/admin/manage-service-templates-dialog';
import { ManageEventTemplatesDialog } from '@/components/admin/manage-event-templates-dialog';

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

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                         <div className="flex items-center gap-4">
                            <Building className="w-8 h-8 text-primary" />
                            <CardTitle>Gestione Chiese</CardTitle>
                         </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Aggiungi o modifica le chiese disponibili sulla piattaforma.</p>
                        <ManageChurchesDialog />
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
                        <p className="text-muted-foreground mb-4">Aggiungi, modifica o elimina utenti e gestisci i loro ruoli.</p>
                        <ManageUsersDialog />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <ListTodo className="w-8 h-8 text-primary" />
                            <CardTitle>Gestisci Tipi di Servizio</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Definisci i ruoli e i servizi riutilizzabili (es. Lode, Accoglienza).</p>
                        <ManageServiceTemplatesDialog />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <ClipboardPlus className="w-8 h-8 text-primary" />
                            <CardTitle>Gestisci Modelli Evento</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Crea modelli di evento con servizi pre-configurati.</p>
                        <ManageEventTemplatesDialog />
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
                        <DeleteAccountDialog />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
