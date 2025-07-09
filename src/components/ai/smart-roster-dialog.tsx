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
import { getAiSuggestions } from "@/app/actions";
import type { SuggestVolunteersOutput } from "@/ai/flows/smart-roster-filling";
import { Loader2, Users, Wand2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const initialVolunteerPool = [
  {
    volunteerName: "Alice",
    availability: "disponibile",
    skills: "Cantante, accoglienza",
    preferences: "preferisce i servizi mattutini",
  },
  {
    volunteerName: "Bob",
    availability: "disponibile",
    skills: "Musicista (chitarra), supporto tecnico",
    preferences: "disponibile per qualsiasi servizio",
  },
  {
    volunteerName: "Charlie",
    availability: "non disponibile",
    skills: "Assistenza all'infanzia, sicurezza",
    preferences: "preferisce i servizi serali",
  },
  {
    volunteerName: "Diana",
    availability: "disponibile",
    skills: "Supporto tecnico, mixer audio",
    preferences: "preferisce lavorare in team",
  },
  {
    volunteerName: "Ethan",
    availability: "disponibile",
    skills: "Usciere, allestimento/smontaggio",
    preferences: "non gli dispiace rimanere fino a tardi",
  },
];

export function SmartRosterDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestVolunteersOutput | null>(null);
  
  const [serviceName, setServiceName] = useState("Culto Domenicale Mattutino");
  const [date, setDate] = useState(new Date(new Date().setDate(new Date().getDate() + (7 - new Date().getDay()))).toLocaleDateString());
  const [openSlots, setOpenSlots] = useState(2);
  const [volunteerPoolText, setVolunteerPoolText] = useState(JSON.stringify(initialVolunteerPool, null, 2));

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setServiceName("Culto Domenicale Mattutino");
      setDate(new Date(new Date().setDate(new Date().getDate() + (7 - new Date().getDay()))).toLocaleDateString());
      setOpenSlots(2);
      setVolunteerPoolText(JSON.stringify(initialVolunteerPool, null, 2));
      setSuggestions(null);
      setIsLoading(false);
    }
  }, [open]);

  const handleSuggestion = async () => {
    setIsLoading(true);
    setSuggestions(null);
    let parsedVolunteerPool;

    try {
        parsedVolunteerPool = JSON.parse(volunteerPoolText);
    } catch (e) {
        toast({
            variant: "destructive",
            title: "Errore nel formato dei dati",
            description: "I dati dei volontari non sono in un formato JSON valido.",
        });
        setIsLoading(false);
        return;
    }

    try {
      const result = await getAiSuggestions({
        serviceName,
        date,
        openSlots,
        volunteerAvailability: parsedVolunteerPool,
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
        <Button size="lg">
            <Wand2 className="mr-2 h-5 w-5" />
            Prova l'Assistente IA
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Composizione Intelligente dei Turni</DialogTitle>
          <DialogDescription>
            Modifica i parametri qui sotto per scoprire come la nostra IA può aiutarti a trovare le persone giuste per il tuo servizio.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Dettagli del Servizio</CardTitle>
                <CardDescription>
                  Modifica i parametri del servizio per cui hai bisogno di volontari.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceName">Nome del Servizio</Label>
                  <Input id="serviceName" value={serviceName} onChange={(e) => setServiceName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input id="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openSlots">Posti disponibili</Label>
                  <Input id="openSlots" type="number" value={openSlots} onChange={(e) => setOpenSlots(Number(e.target.value))} />
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                 <CardTitle className="flex items-center gap-2"><Users /> Elenco Volontari (formato JSON)</CardTitle>
                 <CardDescription>Aggiungi o modifica i volontari, mantenendo il formato JSON.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                    value={volunteerPoolText}
                    onChange={(e) => setVolunteerPoolText(e.target.value)}
                    rows={12}
                    className="font-mono text-xs"
                />
              </CardContent>
            </Card>
          </div>
          <div>
            <div className="flex justify-start mb-4">
              <Button onClick={handleSuggestion} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Suggerisci Volontari
              </Button>
            </div>
            <Card className="min-h-[300px]">
              <CardHeader>
                <CardTitle>Suggerimenti dall'IA</CardTitle>
                <CardDescription>
                  La nostra IA raccomanda i seguenti volontari per riempire i posti disponibili.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading && (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                {suggestions && (
                  <div className="space-y-4">
                    {suggestions.suggestedVolunteers.length > 0 ? (
                      suggestions.suggestedVolunteers.map((s, i) => (
                        <div key={i} className="p-4 rounded-lg bg-accent/50">
                          <h4 className="font-semibold text-accent-foreground">{s.volunteerName}</h4>
                          <p className="text-sm text-muted-foreground">{s.reason}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Nessun suggerimento disponibile.</p>
                    )}
                  </div>
                )}
                 {!isLoading && !suggestions && (
                    <div className="flex items-center justify-center text-center h-40 text-muted-foreground">
                        <p>Clicca su "Suggerisci Volontari" per vedere la magia dell'IA!</p>
                    </div>
                 )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
