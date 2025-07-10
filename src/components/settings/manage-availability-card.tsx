'use client';

import { useState, useEffect, useTransition } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { RecordModel } from 'pocketbase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getUnavailabilityForUser, deleteUnavailability } from '@/app/actions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CalendarOff, Trash2, Edit, PlusCircle, AlertCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { ManageUnavailabilityDialog } from './manage-unavailability-dialog';

export function ManageAvailabilityCard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [unavailabilities, setUnavailabilities] = useState<RecordModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
    const [periodToEdit, setPeriodToEdit] = useState<RecordModel | null>(null);

    const [periodToDelete, setPeriodToDelete] = useState<RecordModel | null>(null);
    const [isDeleting, startDeleteTransition] = useTransition();

    const fetchUnavailabilities = () => {
        if (!user) return;
        setIsLoading(true);
        getUnavailabilityForUser(user.id)
            .then(setUnavailabilities)
            .catch(() => toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare le indisponibilità.' }))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        fetchUnavailabilities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleEdit = (period: RecordModel) => {
        setPeriodToEdit(period);
        setIsManageDialogOpen(true);
    };

    const handleAdd = () => {
        setPeriodToEdit(null);
        setIsManageDialogOpen(true);
    };

    const handleDialogSave = () => {
        setIsManageDialogOpen(false);
        fetchUnavailabilities();
    };

    const handleDelete = () => {
        if (!periodToDelete) return;
        startDeleteTransition(async () => {
            try {
                await deleteUnavailability(periodToDelete.id);
                toast({ title: 'Successo', description: 'Periodo di indisponibilità eliminato.' });
                fetchUnavailabilities();
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Errore', description: error.message });
            } finally {
                setPeriodToDelete(null);
            }
        });
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-4">
                            <CalendarOff className="w-8 h-8 text-primary" />
                            <CardTitle>Le Mie Indisponibilità</CardTitle>
                        </div>
                        <CardDescription className="mt-2">
                            Aggiungi i periodi in cui non sei disponibile. Questo aiuterà i leader a non contattarti per errore.
                        </CardDescription>
                    </div>
                    <Button onClick={handleAdd} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Aggiungi Periodo
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : unavailabilities.length > 0 ? (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Dal</TableHead>
                                        <TableHead>Al</TableHead>
                                        <TableHead className="hidden sm:table-cell">Motivo</TableHead>
                                        <TableHead className="text-right">Azioni</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {unavailabilities.map((period) => (
                                        <TableRow key={period.id}>
                                            <TableCell>{format(new Date(period.start_date), 'dd MMMM yyyy', { locale: it })}</TableCell>
                                            <TableCell>{format(new Date(period.end_date), 'dd MMMM yyyy', { locale: it })}</TableCell>
                                            <TableCell className="hidden sm:table-cell">{period.reason || 'N/D'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <Button size="icon" variant="ghost" onClick={() => handleEdit(period)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setPeriodToDelete(period)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                            <p>Non hai periodi di indisponibilità registrati.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <ManageUnavailabilityDialog
                isOpen={isManageDialogOpen}
                setIsOpen={setIsManageDialogOpen}
                period={periodToEdit}
                onSave={handleDialogSave}
            />

            <AlertDialog open={!!periodToDelete} onOpenChange={() => setPeriodToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Questa azione non può essere annullata. Questo eliminerà permanentemente il periodo di indisponibilità selezionato.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Elimina"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
