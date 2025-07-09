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
    title: "Role-Based Access",
    description:
      "Secure login for Admins, Leaders, and Volunteers with tailored permissions. Manage multiple church locations seamlessly.",
  },
  {
    icon: <CalendarDays className="w-8 h-8 text-primary" />,
    title: "Service & Event Scheduling",
    description:
      "Automated and manual scheduling to ensure fair volunteer distribution. Create recurring or single events with ease.",
  },
  {
    icon: <MousePointerClick className="w-8 h-8 text-primary" />,
    title: "Interactive Assignment",
    description:
      "Intuitive drag-and-drop interface to manually assign volunteers, providing flexibility in team management.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="container py-24 sm:py-32 space-y-8">
      <h2 className="text-3xl lg:text-4xl font-headline font-bold md:text-center">
        Everything You Need{" "}
        <span className="inline bg-gradient-to-r from-[#D39400] to-[#9400D3] text-transparent bg-clip-text">
          In One Place
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
