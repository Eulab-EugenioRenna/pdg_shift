import Image from "next/image";
import { SmartRosterDialog } from "@/components/ai/smart-roster-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wand2 } from "lucide-react";

export function AiPromoSection() {
  return (
    <section id="ai-promo" className="container py-24 sm:py-32">
      <div className="grid lg:grid-cols-[1fr,1fr] gap-8 place-items-center">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold font-headline">
            Componi i Turni
            <br />
            <span className="inline bg-gradient-to-r from-[#D39400] to-[#9400D3] text-transparent bg-clip-text">
              Intelligentemente
            </span>
          </h2>

          <p className="mt-4 mb-8 text-muted-foreground text-lg">
            Il nostro assistente basato sull'IA ti aiuta a riempire i posti vuoti nei turni di servizio, suggerendo i volontari più adatti in base alla loro disponibilità, competenze e preferenze.
          </p>

          <Card>
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <Wand2 className="w-8 h-8 text-primary" />
              <CardTitle>Come funziona</CardTitle>
            </CardHeader>
            <CardContent>
              Fornisci i dettagli del servizio e la nostra IA analizzerà il tuo gruppo di volontari per trovare la corrispondenza perfetta per ogni ruolo, garantendo una distribuzione equa e una copertura ottimale. Provalo tu stesso!
            </CardContent>
          </Card>
          
          <div className="mt-8">
             <SmartRosterDialog />
          </div>
        </div>

        <Image
          src="/600x600.jpg"
          alt="Dimostrazione dello strumento IA"
          width={600}
          height={600}
          className="rounded-lg shadow-lg"
        />
      </div>
    </section>
  );
}
