
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getAiTeamSuggestions } from "@/app/actions";
import type { SuggestTeamOutput } from "@/ai/flows/smart-team-builder";
import { Loader2, Users, Wand2, Sparkles } from "lucide-react";
import { Textarea } from "../ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { ScrollArea } from "../ui/scroll-area";

const volunteerPool = [
  { volunteerName: "Alice", availability: "disponibile", skills: "Cantante, accoglienza", preferences: "preferisce i servizi mattutini" },
  { volunteerName: "Bob", availability: "disponibile", skills: "Musicista (chitarra), supporto tecnico", preferences: "disponibile per qualsiasi servizio" },
  { volunteerName: "Charlie", availability: "non disponibile", skills: "Assistenza all'infanzia, sicurezza", preferences: "preferisce i servizi serali" },
  { volunteerName: "Diana", availability: "disponibile", skills: "Supporto tecnico, mixer audio", preferences: "preferisce lavorare in team" },
  { volunteerName: "Ethan", availability: "disponibile", skills: "Usciere, allestimento/smontaggio", preferences: "non gli dispiace rimanere fino a tardi" },
  { volunteerName: "Fiona", availability: "disponibile", skills: "Cantante (voce di supporto), social media", preferences: "disponibile per servizi speciali" },
  { volunteerName: "George", availability: "disponibile", skills: "Musicista (basso)", preferences: "preferisce i servizi mattutini" },
  { volunteerName: "Hannah", availability: "disponibile", skills: "Musicista (batteria)", preferences: "puntuale" },
];

export function SmartRosterDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestTeamOutput | null>(null);
  
  const [serviceName, setServiceName] = useState("Culto Domenicale Mattutino");
  const [date, setDate] = useState(new Date(new Date().setDate(new Date().getDate() + (7 - new Date().getDay()))).toLocaleDateString());
  const [positions, setPositions] = useState("Voce, Chitarra, Batteria");

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setServiceName("Culto Domenicale Mattutino");
      setDate(new Date(new Date().setDate(new Date().getDate() + (7 - new Date().getDay()))).toLocaleDateString());
      setPositions("Voce, Chitarra, Batteria");
      setSuggestions(null);
      setIsLoading(false);
    }
  }, [open]);

  const handleSuggestion = async () => {
    setIsLoading(true);
    setSuggestions(null);
    
    const positionArray = positions.split(',').map(p => p.trim()).filter(Boolean);
    if(positionArray.length === 0){
        toast({
            variant: "destructive",
            title: "Errore",
            description: "Inserisci almeno una posizione da ricoprire.",
        });
        setIsLoading(false);
        return;
    }

    try {
      const result = await getAiTeamSuggestions({
        serviceName,
        date,
        positions: positionArray,
        volunteerAvailability: volunteerPool,
      });
      setSuggestions(result);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile ottenere suggerimenti. Riprova.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full text-lg">
            <Wand2 className="mr-2 h-5 w-5" />
            Prova l'Assistente IA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-center">Composizione Intelligente dei Turni</DialogTitle>
            <DialogDescription className="text-center">
              Usa la nostra IA per trovare i volontari più adatti per ogni ruolo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-grow min-h-0">
            <ScrollArea className="h-full px-6">
                <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                        <Label htmlFor="serviceName">Nome del Servizio</Label>
                        <Input id="serviceName" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="date">Data</Label>
                        <Input id="date" value={date} onChange={(e) => setDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="positions">Posizioni da ricoprire (separate da virgola)</Label>
                    <Textarea 
                        id="positions"
                        value={positions}
                        onChange={(e) => setPositions(e.target.value)}
                        placeholder="Es. Voce, Chitarra, Batteria"
                        />
                    </div>
                </div>
                
                <div className="flex justify-center my-4">
                <Button onClick={handleSuggestion} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Suggerisci Volontari
                </Button>
                </div>

                {isLoading && (
                <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                )}

                {suggestions && (
                <div className="animate-in fade-in-50">
                    <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/> Suggerimenti dall'IA</CardTitle>
                        <CardDescription>
                        La nostra IA raccomanda i seguenti volontari per riempire i posti disponibili.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {suggestions.suggestions.length > 0 ? (
                        <div className="space-y-4">
                            {suggestions.suggestions.map((s, i) => (
                            <div key={i} className="p-3 rounded-lg bg-accent/50">
                                <h4 className="font-semibold text-accent-foreground">{s.position}: {s.volunteerName}</h4>
                                <p className="text-sm text-muted-foreground">{s.reason}</p>
                            </div>
                            ))}
                        </div>
                        ) : (
                        <p className="text-center text-sm text-muted-foreground py-4">{suggestions.message || "Nessun suggerimento disponibile per questa configurazione."}</p>
                        )}
                    </CardContent>
                    </Card>
                </div>
                )}

                {!isLoading && !suggestions && (
                    <div className="text-center text-sm text-muted-foreground py-6">
                        <p>I suggerimenti dell'IA appariranno qui.</p>
                    </div>
                )}

                <Accordion type="single" collapsible className="w-full mt-4">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>Visualizza l'elenco dei volontari di esempio</AccordionTrigger>
                        <AccordionContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                L'IA userà questi dati di esempio per i suoi suggerimenti.
                            </p>
                            <ul className="space-y-2 text-sm max-h-32 overflow-y-auto pr-2">
                                {volunteerPool.map((v, i) => (
                                    <li key={i}><strong>{v.volunteerName}</strong> - {v.skills} ({v.availability})</li>
                                ))}
                            </ul>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </ScrollArea>
          </div>
      </DialogContent>
    </Dialog>
  );
}
