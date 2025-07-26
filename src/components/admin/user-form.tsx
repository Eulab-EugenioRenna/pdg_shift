
'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import type { RecordModel } from 'pocketbase';
import { useToast } from '@/hooks/use-toast';
import { addUserByAdmin, updateUserByAdmin, getChurches } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { pb } from '@/lib/pocketbase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, type Option } from '@/components/ui/multi-select';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '../ui/scroll-area';

interface UserFormProps {
    user: RecordModel | null;
    onSave: () => void;
    onCancel: () => void;
}

export function UserForm({ user, onSave, onCancel }: UserFormProps) {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    passwordConfirm: '',
    role: user?.role || 'volontario',
    church: user?.church || [],
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(user?.avatar ? pb.getFileUrl(user, user.avatar, { thumb: '100x100' }) : null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [churches, setChurches] = useState<RecordModel[]>([]);
  const [churchesLoading, setChurchesLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  const churchOptions: Option[] = churches.map(c => ({ value: c.id, label: c.name }));

  useEffect(() => {
    getChurches(currentUser?.id, currentUser?.role)
      .then(setChurches)
      .finally(() => setChurchesLoading(false));
  }, [currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string) => (value: string | string[]) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (user) { // Editing user
      if (!formData.name.trim() || !formData.role) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Nome e Ruolo sono obbligatori.' });
        return;
      }
    } else { // Adding new user
      if (!formData.name.trim() || !formData.email.trim() || !formData.password || !formData.role) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Nome, Email, Password e Ruolo sono obbligatori.' });
        return;
      }
      if (formData.password !== formData.passwordConfirm) {
        toast({ variant: 'destructive', title: 'Errore', description: 'Le password non coincidono.' });
        return;
      }
      if (formData.password.length < 8) {
        toast({ variant: 'destructive', title: 'Errore', description: 'La password deve avere almeno 8 caratteri.' });
        return;
      }
    }

    startTransition(async () => {
      try {
        const data = new FormData();
        data.append('name', formData.name.trim());
        data.append('role', formData.role);
        
        if (formData.church.length > 0) {
            formData.church.forEach((c: string) => data.append('church', c));
        } else {
            data.append('church', '');
        }
        
        if (avatarFile) {
          data.append('avatar', avatarFile);
        }

        if (user) {
          await updateUserByAdmin(user.id, data, currentUser);
          toast({ title: 'Successo', description: 'Utente aggiornato con successo.' });
        } else {
          data.append('email', formData.email.trim());
          data.append('password', formData.password);
          data.append('passwordConfirm', formData.passwordConfirm);
          await addUserByAdmin(data, currentUser);
          toast({ title: 'Successo', description: 'Utente aggiunto con successo.' });
        }
        onSave();
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Errore', description: error.message });
      }
    });
  };

  return (
     <ScrollArea className="h-[70vh]">
        <form onSubmit={handleSubmit} className="space-y-6 py-4 pr-4">
        <div className="flex flex-col items-center gap-4 col-span-full">
            <Avatar className="w-24 h-24">
                <AvatarImage src={preview || `https://placehold.co/100x100.png`} alt="Avatar preview" />
                <AvatarFallback>{formData.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                {preview ? 'Cambia Avatar' : 'Carica Avatar'}
            </Button>
            <Input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
            <div className="space-y-2">
            <Label htmlFor="name">Nome e Cognome</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} disabled={isPending} required />
            </div>
            <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} disabled={isPending || !!user} required={!user} />
            </div>
        
            {!user && (
            <>
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} disabled={isPending} required={!user} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="passwordConfirm">Conferma Password</Label>
                    <Input id="passwordConfirm" name="passwordConfirm" type="password" value={formData.passwordConfirm} onChange={handleChange} disabled={isPending} required={!user} />
                </div>
            </>
            )}
        
            <div className="space-y-2">
            <Label htmlFor="church">Chiesa/e</Label>
            <MultiSelect
                options={churchOptions}
                selected={formData.church}
                onChange={handleSelectChange('church')}
                placeholder={churchesLoading ? "caricamento..." : "Seleziona una o più chiese"}
                disabled={churchesLoading || isPending}
            />
            </div>
            <div className="space-y-2">
            <Label htmlFor="role">Ruolo</Label>
            <Select name="role" onValueChange={handleSelectChange('role')} value={formData.role} required disabled={isPending}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Seleziona un ruolo" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="volontario">Volontario</SelectItem>
                    <SelectItem value="leader">Leader</SelectItem>
                    {(currentUser?.role === 'superuser' || currentUser?.role === 'coordinatore') && <SelectItem value="coordinatore">Coordinatore</SelectItem>}
                    {currentUser?.role === 'superuser' && <SelectItem value="superuser">Superuser</SelectItem>}
                </SelectContent>
            </Select>
            </div>
        </div>
        <DialogFooter className="sticky bottom-0 bg-background pt-4 -mx-4 px-4 pb-0">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Annulla</Button>
            <Button type="submit" disabled={isPending || churchesLoading}>
            {isPending ? <Loader2 className="animate-spin" /> : 'Salva'}
            </Button>
        </DialogFooter>
        </form>
    </ScrollArea>
  )
}
