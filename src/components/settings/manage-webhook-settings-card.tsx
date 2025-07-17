
'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getSetting, updateSetting } from '@/app/actions';
import { Rss, Loader2 } from 'lucide-react';

const WEBHOOK_SETTING_KEY = 'webhook_url';
const WEBHOOK_URLS = {
  prod: 'https://n8n.eulab.cloud/webhook/pdg-service',
  test: 'https://n8n.eulab.cloud/webhook-test/pdg-service',
};

export function ManageWebhookSettingsCard() {
  const { toast } = useToast();
  const [selectedUrl, setSelectedUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    setIsLoading(true);
    getSetting(WEBHOOK_SETTING_KEY)
      .then((setting) => {
        if (setting) {
          setSelectedUrl(setting.value);
        } else {
          setSelectedUrl(WEBHOOK_URLS.prod); // Default to prod if not set
        }
      })
      .catch(() => {
        toast({
          variant: 'destructive',
          title: 'Errore',
          description: 'Impossibile caricare le impostazioni del webhook.',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [toast]);

  const handleSave = () => {
    startSaveTransition(async () => {
      try {
        await updateSetting(WEBHOOK_SETTING_KEY, selectedUrl);
        toast({ title: 'Successo', description: 'Impostazioni webhook salvate.' });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Errore', description: error.message });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Rss className="w-8 h-8 text-primary" />
          <CardTitle>Gestione Webhook</CardTitle>
        </div>
        <CardDescription className="pt-2">
          Seleziona l'URL a cui inviare le notifiche automatiche per eventi come nuove registrazioni, creazione di eventi/servizi, ecc.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Caricamento impostazioni...</span>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="webhook-url-select">URL del Webhook</Label>
              <Select value={selectedUrl} onValueChange={setSelectedUrl}>
                <SelectTrigger id="webhook-url-select">
                  <SelectValue placeholder="Seleziona un URL..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={WEBHOOK_URLS.prod}>Produzione</SelectItem>
                  <SelectItem value={WEBHOOK_URLS.test}>Test</SelectItem>
                </SelectContent>
              </Select>
               <p className="text-xs text-muted-foreground">URL: {selectedUrl || 'Nessuno selezionato'}</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva Impostazioni Webhook
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
