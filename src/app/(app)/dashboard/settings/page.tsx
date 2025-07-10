'use client';

import { useAuth } from '@/hooks/useAuth';
import AdminSettings from '@/components/settings/admin-settings';
import LeaderSettings from '@/components/settings/leader-settings';
import VolunteerSettings from '@/components/settings/volunteer-settings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ManageAvailabilityCard } from '@/components/settings/manage-availability-card';

export default function SettingsPage() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    const renderSettingsByRole = () => {
        switch (user?.role) {
            case 'admin':
                return <AdminSettings />;
            case 'leader':
                return <LeaderSettings />;
            case 'volontario':
                return <VolunteerSettings />;
            default:
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Accesso non autorizzato</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Non hai i permessi per visualizzare questa pagina.</p>
                        </CardContent>
                    </Card>
                );
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Impostazioni</h1>
                <p className="text-muted-foreground">Gestisci le impostazioni del tuo account e dell'applicazione.</p>
            </div>
            {renderSettingsByRole()}
            <ManageAvailabilityCard />
        </div>
    );
}
