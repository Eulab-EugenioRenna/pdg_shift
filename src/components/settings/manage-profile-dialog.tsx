'use client';

import { useState, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/app/actions';
import { Loader2, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { pb } from '@/lib/pocketbase';
import { useAuth } from '@/hooks/useAuth';

export function ManageProfileDialog() {
  const { user, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    password: '',
    passwordConfirm: '',
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(user?.avatar ? pb.getFileUrl(user, user.avatar, { thumb: '100x100' }) : null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Il nome non può essere vuoto.' });
      return;
    }

    if (formData.password && formData.password !== formData.passwordConfirm) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Le password non coincidono.' });
      return;
    }
    
    if (formData.password && formData.password.length < 8) {
        toast({ variant: 'destructive', title: 'Errore', description: 'La nuova password deve avere almeno 8 caratteri.' });
        return;
    }

    startTransition(async () => {
        if (!user) return;

        const data = new FormData();
        data.append('name', formData.name.trim());
        if (avatarFile) {
            data.append('avatar', avatarFile);
        }
        if (formData.password) {
            data.append('password', formData.password);
            data.append('passwordConfirm', formData.passwordConfirm);
        }

        try {
            await updateUserProfile(user.id, data);
            await refreshUser();
            toast({ title: 'Successo', description: 'Profilo aggiornato con successo.' });
            setOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Errore', description: error.message || 'Impossibile aggiornare il profilo.' });
        }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Modifica Profilo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifica Profilo</DialogTitle>
          <DialogDescription>
            Aggiorna le tue informazioni personali. Lascia i campi password vuoti per non modificarla.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
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
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" value={user?.email || ''} disabled />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="password">Nuova Password</Label>
                <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} disabled={isPending} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Conferma Password</Label>
                <Input id="passwordConfirm" name="passwordConfirm" type="password" value={formData.passwordConfirm} onChange={handleChange} disabled={isPending} />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Annulla</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : 'Salva Modifiche'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
