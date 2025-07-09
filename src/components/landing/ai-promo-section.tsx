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
            Fill Your Roster
            <br />
            <span className="inline bg-gradient-to-r from-[#D39400] to-[#9400D3] text-transparent bg-clip-text">
              Intelligently
            </span>
          </h2>

          <p className="mt-4 mb-8 text-muted-foreground text-lg">
            Our AI-powered assistant helps you fill empty slots in your service
            rosters by suggesting the best-suited volunteers based on their
            availability, skills, and preferences.
          </p>

          <Card>
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <Wand2 className="w-8 h-8 text-primary" />
              <CardTitle>How it works</CardTitle>
            </CardHeader>
            <CardContent>
              Simply provide the service details and our AI will analyze your
              volunteer pool to find the perfect match for each role, ensuring fair
              distribution and optimal coverage. Try it yourself!
            </CardContent>
          </Card>
          
          <div className="mt-8">
             <SmartRosterDialog />
          </div>
        </div>

        <Image
          src="https://placehold.co/600x600.png"
          alt="AI Tool demonstration"
          width={600}
          height={600}
          className="rounded-lg shadow-lg"
          data-ai-hint="artificial intelligence brain"
        />
      </div>
    </section>
  );
}
