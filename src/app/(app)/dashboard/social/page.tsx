
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { RecordModel } from 'pocketbase';
import { getChurches, getSocialLinks } from '@/app/actions';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { pb } from '@/lib/pocketbase';
import { SocialLinkCard } from '@/components/social/social-link-card';
import { ManageSocialLinkDialog } from '@/components/social/manage-social-link-dialog';
import { Separator } from '@/components/ui/separator';

const socialTypes = [
    { id: 'facebook', label: 'Facebook' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'telegram', label: 'Telegram' },
    { id: 'altro', label: 'Altro' },
];

// Helper to get the label for a given type ID
const getTypeLabel = (typeId: string) => {
    return socialTypes.find(t => t.id === typeId)?.label || 'Altro';
}


export default function SocialPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [links, setLinks] = useState<RecordModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userChurches, setUserChurches] = useState<RecordModel[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string | null>(null);

    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
    const [linkToEdit, setLinkToEdit] = useState<RecordModel | null>(null);

    const fetchLinks = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const churches = await getChurches(user.id, user.role);
            setUserChurches(churches);
            if (churches.length > 0) {
                const churchIds = churches.map((c: RecordModel) => c.id);
                const socialLinks = await getSocialLinks(churchIds, filterType ?? undefined);
                setLinks(socialLinks);
            } else {
                setLinks([]);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i dati.' });
        } finally {
            setIsLoading(false);
        }
    }, [user, filterType, toast]);
    
    useEffect(() => {
        if (user) {
            fetchLinks();
        }
    
        const handleSubscription = () => {
          if (user) {
            fetchLinks();
          }
        };
    
        const unsubscribePromise = pb.collection('pdg_social_links').subscribe('*', handleSubscription);
    
        return () => {
            Promise.resolve(unsubscribePromise).then(unsubscribe => unsubscribe());
        };
    }, [user, fetchLinks]);
    
    const groupedAndFilteredLinks = useMemo(() => {
        const filtered = links.filter(link => 
            link.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filtered.reduce((acc, link) => {
            const type = link.type || 'altro';
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(link);
            return acc;
        }, {} as Record<string, RecordModel[]>);

    }, [links, searchTerm]);

    const handleEditLink = (link: RecordModel) => {
        setLinkToEdit(link);
        setIsManageDialogOpen(true);
    };

    const handleAddLink = () => {
        setLinkToEdit(null);
        setIsManageDialogOpen(true);
    };

    const canManageLinks = user?.role !== 'volontario';

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Social</h1>
                    <p className="text-muted-foreground">Trova tutti i link utili per rimanere connesso.</p>
                </div>
                {canManageLinks && userChurches.length > 0 && (
                    <Button onClick={handleAddLink}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Link
                    </Button>
                )}
            </div>

            <Card>
                <CardContent className="pt-6 flex flex-col md:flex-row items-center gap-4 flex-wrap">
                    <div className="relative flex-1 w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cerca per nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap justify-center">
                        <Button
                            variant={filterType === null ? 'default' : 'outline'}
                            onClick={() => setFilterType(null)}
                        >
                            Tutti
                        </Button>
                        {socialTypes.map(type => (
                            <Button
                                key={type.id}
                                variant={filterType === type.id ? 'default' : 'outline'}
                                onClick={() => setFilterType(type.id)}
                            >
                                {type.label}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>
            
            <div className="space-y-8">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : Object.keys(groupedAndFilteredLinks).length > 0 ? (
                    Object.entries(groupedAndFilteredLinks)
                        .sort(([typeA], [typeB]) => socialTypes.findIndex(t => t.id === typeA) - socialTypes.findIndex(t => t.id === typeB))
                        .map(([type, linksOfType]) => (
                        <div key={type} className="space-y-4">
                            <div>
                                <h2 className="text-xl font-semibold">{getTypeLabel(type)}</h2>
                                <Separator className="mt-2" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {linksOfType.map(link => (
                                    <SocialLinkCard 
                                        key={link.id} 
                                        link={link} 
                                        canManage={canManageLinks}
                                        onEdit={handleEditLink}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>Nessun link trovato per le tue chiese o per i filtri selezionati.</p>
                        {canManageLinks && <p className="text-sm">Aggiungine uno per iniziare!</p>}
                    </div>
                )}
            </div>


            {canManageLinks && (
                <ManageSocialLinkDialog
                    isOpen={isManageDialogOpen}
                    setIsOpen={setIsManageDialogOpen}
                    link={linkToEdit}
                    userChurches={userChurches}
                    onSave={() => {
                        setIsManageDialogOpen(false);
                    }}
                />
            )}
        </div>
    );
}
