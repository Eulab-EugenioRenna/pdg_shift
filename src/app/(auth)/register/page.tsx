'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';
import { pb } from '@/lib/pocketbase';
import { MultiSelect, type Option } from '@/components/ui/multi-select';

export default function RegisterPage() {
  const { register, loginWithProvider } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [churches, setChurches] = useState<any[]>([]);
  const [selectedChurches, setSelectedChurches] = useState<string[]>([]);
  const [churchesLoading, setChurchesLoading] = useState(true);

  useEffect(() => {
    const fetchChurches = async () => {
      setChurchesLoading(true);
      try {
        const records = await pb.collection('pdg_church').getFullList({
          sort: 'name',
        });
        setChurches(records);
      } catch (error) {
        console.error("Failed to fetch churches:", error);
      } finally {
        setChurchesLoading(false);
      }
    };

    fetchChurches();
  }, []);

  const churchOptions: Option[] = churches.map(c => ({ value: c.id, label: c.name }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirm) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Le password non coincidono.' });
      return;
    }
    if (password.length < 8) {
      toast({ variant: 'destructive', title: 'Errore', description: 'La password deve contenere almeno 8 caratteri.' });
      return;
    }
     if (selectedChurches.length === 0) {
      toast({ variant: 'destructive', title: 'Errore', description: 'Per favore, seleziona almeno una chiesa.' });
      return;
    }
    setIsLoading(true);
    try {
      await register({ name, email, password, passwordConfirm, church: selectedChurches });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google') => {
    setIsSocialLoading(true);
    try {
      await loginWithProvider(provider);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSocialLoading(false);
    }
  };


  return (
     <main className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-sm space-y-4">
         <div className="text-center space-y-2">
           <Link href="/" className="flex items-center justify-center space-x-2">
            <Icons.logo className="h-8 w-8 text-primary" />
            <span className="font-bold font-headline text-2xl">
              Grace Services
            </span>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Registrati</CardTitle>
            <CardDescription>Inserisci le tue informazioni per creare un account.</CardDescription>
          </CardHeader>
          <form onSubmit={handleRegister}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome e Cognome</Label>
                <Input id="name" placeholder="Mario Rossi" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="mario.rossi@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="church">Chiesa/e</Label>
                <MultiSelect
                    options={churchOptions}
                    selected={selectedChurches}
                    onChange={setSelectedChurches}
                    placeholder={churchesLoading ? "caricamento..." : "Seleziona una o più chiese"}
                    disabled={churchesLoading || churches.length === 0}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="passwordConfirm">Conferma Password</Label>
                <Input id="passwordConfirm" type="password" required value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button className="w-full" type="submit" disabled={isLoading || churchesLoading || churches.length === 0}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crea account
              </Button>
            </CardFooter>
          </form>
           <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                      Oppure registrati con
                  </span>
              </div>
          </div>
          <CardFooter className="flex flex-col gap-4">
             <Button variant="outline" className="w-full" onClick={() => handleSocialLogin('google')} disabled={isLoading || isSocialLoading}>
                 {isSocialLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.google className="mr-2 h-4 w-4" />}
                 Google
             </Button>
            <div className="text-center text-sm">
                Hai già un account?{' '}
                <Link href="/login" className="underline">
                  Accedi
                </Link>
              </div>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
