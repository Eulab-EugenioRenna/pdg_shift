import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="container grid lg:grid-cols-2 place-items-center py-20 md:py-32 gap-10">
      <div className="text-center lg:text-start space-y-6">
        <main className="text-5xl md:text-6xl font-bold font-headline">
          <h1>Organizza, pianifica,</h1>
          <h1 className="inline">
            <span className="inline bg-gradient-to-r from-[#D39400] to-[#9400D3] text-transparent bg-clip-text">
              e servi
            </span>{" "}
            con grazia
          </h1>
        </main>

        <p className="text-xl text-muted-foreground md:w-10/12 mx-auto lg:mx-0">
          Semplifica la gestione dei volontari della tua chiesa. Coordina senza sforzo servizi, eventi e turni con la nostra piattaforma intuitiva.
        </p>

        <div className="space-y-4 md:space-y-0 md:space-x-4">
          <Button className="w-full md:w-1/3 text-lg" asChild>
            <Link href="/register">Inizia Ora</Link>
          </Button>
        </div>
      </div>

      <div className="z-10">
        <Image
          src="/700x500.jpg"
          alt="Dimostrazione dell'app"
          width={700}
          height={500}
          className="rounded-lg shadow-lg"
        />
      </div>

      <div className="shadow"></div>
    </section>
  );
}
