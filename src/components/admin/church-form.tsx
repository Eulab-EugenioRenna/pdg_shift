'use client';

import { useState, useTransition, useRef } from 'react';
import type { RecordModel } from 'pocketbase';
import { useToast } from '@/hooks/use-toast';
import { addChurch, updateChurch } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Building } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { pb } from '@/lib/pocketbase';

interface ChurchFormProps {
    church: RecordModel | null;
    onSave: () => void;
    onCancel: () => void;
}

export function ChurchForm({ church, onSave, onCancel }: ChurchFormProps) {
  const [name, setName] = useState(church?.name || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(church?.logo ? pb.getFileUrl(church, church.logo, { thumb: '100x100' }) : null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Il nome della chiesa non può essere vuoto.' });
      return;
    }
    if (!church && !logoFile) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Il logo è obbligatorio per una nuova chiesa.' });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      try {
        if (church) {
          await updateChurch(church.id, formData);
          toast({ title: 'Successo', description: 'Chiesa aggiornata con successo.' });
        } else {
          await addChurch(formData);
          toast({ title: 'Successo', description: 'Chiesa aggiunta con successo.' });
        }
        onSave();
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Errore', description: error.message });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="flex flex-col items-center gap-4">
          <Avatar className="w-24 h-24">
              <AvatarImage src={preview || `https://placehold.co/100x100.png`} alt="Logo preview" />
              <AvatarFallback><Building className="w-12 h-12" /></AvatarFallback>
          </Avatar>
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              {preview ? 'Cambia Logo' : 'Carica Logo'}
          </Button>
          <Input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
          />
      </div>
      <div>
        <Label htmlFor="church-name">Nome Chiesa</Label>
        <Input 
          id="church-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          placeholder="Nome della chiesa"
          required
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Annulla</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : 'Salva'}
        </Button>
      </DialogFooter>
    </form>
  )
}
