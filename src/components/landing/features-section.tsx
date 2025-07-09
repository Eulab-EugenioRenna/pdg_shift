import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, CalendarDays, MousePointerClick, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: <ShieldCheck className="w-8 h-8 text-primary" />,
    title: "Accesso Basato sui Ruoli",
    description:
      "Login sicuro per amministratori, leader e volontari con permessi personalizzati. Gestisci più sedi della chiesa senza interruzioni.",
  },
  {
    icon: <CalendarDays className="w-8 h-8 text-primary" />,
    title: "Pianificazione di Servizi ed Eventi",
    description:
      "Pianificazione automatica e manuale per garantire una distribuzione equa dei volontari. Crea eventi ricorrenti o singoli con facilità.",
  },
  {
    icon: <MousePointerClick className="w-8 h-8 text-primary" />,
    title: "Assegnazione Interattiva",
    description:
      "Interfaccia intuitiva per assegnare manualmente i volontari, offrendo flessibilità nella gestione del team.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="container py-24 sm:py-32 space-y-8">
      <h2 className="text-3xl lg:text-4xl font-headline font-bold md:text-center">
        Tutto Ciò di Cui Hai Bisogno{" "}
        <span className="inline bg-gradient-to-r from-[#D39400] to-[#9400D3] text-transparent bg-clip-text">
          In Un Unico Posto
        </span>
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map(({ icon, title, description }) => (
          <Card key={title}>
            <CardHeader className="flex items-center gap-4">
              {icon}
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
