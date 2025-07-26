
'use client';

import { useState, useTransition, useEffect } from 'react';
import type { RecordModel } from 'pocketbase';
import { useToast } from '@/hooks/use-toast';
import { addSocialLink, updateSocialLink, deleteSocialLink } from '@/app/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, type Option } from '@/components/ui/multi-select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from '../ui/scroll-area';

interface ManageSocialLinkDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  link: RecordModel | null;
  userChurches: RecordModel[];
  onSave: () => void;
}

export function ManageSocialLinkDialog({ isOpen, setIsOpen, link, userChurches, onSave }: ManageSocialLinkDialogProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('altro');
  const [selectedChurches, setSelectedChurches] = useState<string[]>([]);
  
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const churchOptions: Option[] = userChurches.map(c => ({ value: c.id, label: c.name }));

  useEffect(() => {
    if (isOpen) {
      if (link) {
        setName(link.name || '');
        setUrl(link.url || '');
        setType(link.type || 'altro');
        setSelectedChurches(link.church || []);
      } else {
        setName('');
        setUrl('');
        setType('altro');
        // If user has only one church, pre-select it
        if (userChurches.length === 1) {
            setSelectedChurches([userChurches[0].id]);
        } else {
            setSelectedChurches([]);
        }
      }
    }
  }, [isOpen, link, userChurches]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim() || selectedChurches.length === 0) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Nome, URL e almeno una chiesa sono obbligatori.' });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('url', url.trim());
      formData.append('type', type);
      selectedChurches.forEach(id => formData.append('church', id));

      try {
        if (link) {
          await updateSocialLink(link.id, formData);
          toast({ title: 'Successo', description: 'Link aggiornato con successo.' });
        } else {
          await addSocialLink(formData);
          toast({ title: 'Successo', description: 'Link aggiunto con successo.' });
        }
        onSave();
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Errore', description: error.message });
      }
    });
  };

  const handleDelete = () => {
    if (!link) return;
    startDeleteTransition(async () => {
        try {
            await deleteSocialLink(link.id);
            toast({ title: 'Successo', description: 'Link eliminato.' });
            onSave();
            setIsDeleteAlertOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Errore', description: error.message });
        }
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{link ? 'Modifica Link Social' : 'Aggiungi Nuovo Link'}</DialogTitle>
            <DialogDescription>
              Compila i dettagli del link. Verrà visualizzato nella pagina Social per le chiese selezionate.
            </DialogDescription>
          </DialogHeader>
            <ScrollArea>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                    <Label htmlFor="link-name">Nome</Label>
                    <Input
                        id="link-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isPending}
                        placeholder="Es. Gruppo Lode"
                        required
                    />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="link-url">URL</Label>
                    <Input
                        id="link-url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isPending}
                        placeholder="https://..."
                        required
                    />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="church-select">Chiesa/e</Label>
                        {userChurches.length > 1 ? (
                            <MultiSelect
                                options={churchOptions}
                                selected={selectedChurches}
                                onChange={setSelectedChurches}
                                placeholder="Seleziona una o più chiese"
                                disabled={isPending}
                            />
                        ) : (
                            <Input value={userChurches[0]?.name || 'Nessuna chiesa'} disabled />
                        )}
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="link-type">Tipo</Label>
                    <Select onValueChange={setType} value={type} disabled={isPending}>
                        <SelectTrigger id="link-type">
                        <SelectValue placeholder="Seleziona un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="telegram">Telegram</SelectItem>
                        <SelectItem value="altro">Altro</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                </form>
            </ScrollArea>
            <DialogFooter className="flex-row justify-between pt-4">
            <div>
                {link && (
                    <Button type="button" variant="destructive" onClick={() => setIsDeleteAlertOpen(true)} disabled={isPending}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Elimina
                    </Button>
                )}
            </div>
            <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>Annulla</Button>
                <Button type="submit" onClick={handleSubmit} disabled={isPending}>
                {isPending ? <Loader2 className="animate-spin" /> : 'Salva'}
                </Button>
            </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Questa azione non può essere annullata. Questo eliminerà permanentemente il link.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="animate-spin" /> : "Elimina"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
