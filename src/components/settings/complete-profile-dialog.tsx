
'use client';

import { useState, useTransition, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile, getServiceTemplates, getChurches } from '@/app/actions';
import { Loader2, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { pb } from '@/lib/pocketbase';
import { useAuth } from '@/hooks/useAuth';
import { Textarea } from '../ui/textarea';
import { MultiSelect, type Option } from '../ui/multi-select';
import type { RecordModel } from 'pocketbase';
import { sendNotification } from '@/lib/notifications';
import { ScrollArea } from '../ui/scroll-area';

interface CompleteProfileDialogProps {
    isOpen: boolean;
    onProfileCompleted: () => void;
}

export function CompleteProfileDialog({ isOpen, onProfileCompleted }: CompleteProfileDialogProps) {
  const { user, logout } = useAuth();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    skills: '',
    church: [] as string[],
    service_preferences: [] as string[],
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [allChurches, setAllChurches] = useState<RecordModel[]>([]);
  const [allServiceTemplates, setAllServiceTemplates] = useState<RecordModel[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
        setDataLoading(true);
        Promise.all([
          getChurches(),
          getServiceTemplates()
        ])
        .then(([churchesData, servicesData]) => {
          setAllChurches(churchesData);
          setAllServiceTemplates(servicesData);
        })
        .catch(() => toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile caricare i dati necessari.'}))
        .finally(() => setDataLoading(false));

        setFormData({
            name: user.name || '',
            phone: user.phone || '',
            skills: user.skills || '',
            church: user.church || [],
            service_preferences: user.service_preferences || [],
        });
        setPreview(user.avatar ? pb.getFileUrl(user, user.avatar, { thumb: '100x100' }) : null);
        setAvatarFile(null);
    }
  }, [isOpen, user, toast]);

  const churchOptions: Option[] = allChurches.map(c => ({ value: c.id, label: c.name }));
  
  const filteredServiceOptions: Option[] = useMemo(() => {
    if (formData.church.length === 0) {
      return [];
    }
    // Show only service templates that are available for at least one of the selected churches.
    return allServiceTemplates
      .filter(st => (st.church || []).some((churchId: string) => formData.church.includes(churchId)))
      .map(s => ({ value: s.id, label: s.name }));
  }, [formData.church, allServiceTemplates]);

  useEffect(() => {
    // When selected churches change, filter the selected services to remove ones that are no longer valid
    const validServiceIds = new Set(filteredServiceOptions.map(opt => opt.value));
    setFormData(prev => ({
        ...prev,
        service_preferences: prev.service_preferences.filter(serviceId => validServiceIds.has(serviceId))
    }));
  }, [formData.church, filteredServiceOptions]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: 'church' | 'service_preferences') => (value: string[]) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim() || formData.church.length === 0) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Per favore, completa tutti i campi richiesti (Nome, Telefono, Chiesa).' });
      return;
    }

    startTransition(async () => {
        if (!user) return;

        const data = new FormData();
        data.append('name', formData.name.trim());
        data.append('phone', formData.phone.trim());
        data.append('skills', formData.skills.trim());

        if (formData.church.length > 0) {
            formData.church.forEach((id: string) => data.append('church', id));
        } else {
            data.append('church', '');
        }

        if (formData.service_preferences.length > 0) {
            formData.service_preferences.forEach((id: string) => data.append('service_preferences', id));
        } else {
            data.append('service_preferences', '');
        }
        
        // Set role and email visibility in the background
        data.append('role', 'volontario');
        data.append('emailVisibility', 'true');

        if (avatarFile) {
            data.append('avatar', avatarFile);
        }

        try {
            const updatedUser = await updateUserProfile(user.id, data);
            
            // Send notification AFTER profile is successfully completed
            await sendNotification({
                type: 'user_registered_oauth',
                title: `Nuovo utente registrato: ${updatedUser.name}`,
                body: `Un nuovo utente si è registrato con Google.`,
                data: { user: updatedUser },
                userIds: [updatedUser.id]
            });
            
            toast({ title: 'Grazie!', description: 'Profilo completato con successo.' });
            onProfileCompleted();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Errore', description: error.message || 'Impossibile aggiornare il profilo.' });
            logout();
        }
    });
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="sm:max-w-md max-h-[90vh]"
        hideCloseButton={true}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
       >
        <DialogHeader>
          <DialogTitle>Completa il tuo profilo</DialogTitle>
          <DialogDescription>
            Benvenuto in Grace Services! Per continuare, ti chiediamo di completare il tuo profilo. Questo ci aiuterà a suggerirti i turni più adatti a te.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="flex flex-col items-center gap-4">
                <Avatar className="w-24 h-24">
                    <AvatarImage src={preview || `https://placehold.co/100x100.png`} alt="Avatar preview" />
                    <AvatarFallback>{formData.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isPending}>
                    <Upload className="mr-2 h-4 w-4" />
                    {preview ? 'Cambia Avatar' : 'Carica Avatar'}
                </Button>
                <Input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    disabled={isPending}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="name">Nome e Cognome</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} disabled={isPending} required />
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="phone">Numero di Telefono</Label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} disabled={isPending} required />
            </div>

            <div className="space-y-2">
                <Label htmlFor="church">Chiesa/e</Label>
                <MultiSelect
                    id="church"
                    options={churchOptions}
                    selected={formData.church}
                    onChange={handleSelectChange('church')}
                    placeholder={dataLoading ? "Caricamento..." : "Seleziona una o più chiese"}
                    disabled={dataLoading || isPending}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="skills">Competenze (opzionale)</Label>
                <Textarea id="skills" name="skills" value={formData.skills} onChange={handleChange} disabled={isPending} placeholder="Es. Canto, chitarra, social..." />
            </div>

            <div className="space-y-2">
                <Label htmlFor="service_preferences">Preferenze di Servizio (opzionale)</Label>
                <MultiSelect
                    id="service_preferences"
                    options={filteredServiceOptions}
                    selected={formData.service_preferences}
                    onChange={handleSelectChange('service_preferences')}
                    placeholder={dataLoading ? "Caricamento..." : (formData.church.length === 0 ? "Seleziona prima una chiesa" : "Seleziona i servizi")}
                    disabled={dataLoading || isPending || formData.church.length === 0}
                />
            </div>
            </form>
        </ScrollArea>
        <DialogFooter>
            <Button type="submit" onClick={handleSubmit} disabled={isPending || dataLoading}>
            {isPending ? <Loader2 className="animate-spin" /> : 'Salva e Continua'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
