
'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getSetting, updateSetting } from '@/app/actions';
import { History, Loader2 } from 'lucide-react';

const RECURRENCE_SETTING_KEY = 'recurring_event_months_visibility';

export function ManageRecurrenceSettingsCard() {
  const { toast } = useToast();
  const [selectedMonths, setSelectedMonths] = useState('3');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    setIsLoading(true);
    getSetting(RECURRENCE_SETTING_KEY)
      .then((setting) => {
        if (setting) {
          setSelectedMonths(setting.value);
        } else {
          setSelectedMonths('3'); // Default to 3 if not set
        }
      })
      .catch(() => {
        toast({
          variant: 'destructive',
          title: 'Errore',
          description: 'Impossibile caricare le impostazioni di ricorrenza.',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [toast]);

  const handleSave = () => {
    startSaveTransition(async () => {
      try {
        await updateSetting(RECURRENCE_SETTING_KEY, selectedMonths);
        toast({ title: 'Successo', description: 'Impostazioni di ricorrenza salvate.' });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Errore', description: error.message });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <History className="w-8 h-8 text-primary" />
          <CardTitle>Gestione Ricorrenze</CardTitle>
        </div>
        <CardDescription className="pt-2">
          Imposta per quanti mesi nel futuro devono essere generati e visualizzati gli eventi ricorrenti.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Caricamento...</span>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="recurrence-months-select">Mesi di visibilità</Label>
              <Select value={selectedMonths} onValueChange={setSelectedMonths}>
                <SelectTrigger id="recurrence-months-select" className="w-[180px]">
                  <SelectValue placeholder="Seleziona i mesi" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={num.toString()}>{num} {num === 1 ? 'Mese' : 'Mesi'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <p className="text-xs text-muted-foreground">Valori più bassi migliorano le performance.</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva Impostazioni
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
