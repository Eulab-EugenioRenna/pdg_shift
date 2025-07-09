"use client";

import { useState } from "react";
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
import { Loader2, User, Users, Wand2 } from "lucide-react";

const volunteerPool = [
  {
    volunteerName: "Alice",
    availability: "available",
    skills: "Singer, greeting",
    preferences: "prefers morning services",
  },
  {
    volunteerName: "Bob",
    availability: "available",
    skills: "Musician (Guitar), tech support",
    preferences: "available for any service",
  },
  {
    volunteerName: "Charlie",
    availability: "not available",
    skills: "Childcare, security",
    preferences: "prefers evening services",
  },
  {
    volunteerName: "Diana",
    availability: "available",
    skills: "Tech support, sound board",
    preferences: "prefers to work with a team",
  },
   {
    volunteerName: "Ethan",
    availability: "available",
    skills: "Usher, setup/teardown",
    preferences: "doesn't mind staying late",
  },
];

export function SmartRosterDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] =
    useState<SuggestVolunteersOutput | null>(null);
  const { toast } = useToast();

  const handleSuggestion = async () => {
    setIsLoading(true);
    setSuggestions(null);
    try {
      const result = await getAiSuggestions({
        serviceName: "Sunday Morning Worship",
        date: new Date(new Date().setDate(new Date().getDate() + (7 - new Date().getDay()))).toLocaleDateString(),
        openSlots: 2,
        volunteerAvailability: volunteerPool,
      });
      setSuggestions(result);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get suggestions. Please try again.",
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
            Try the AI Assistant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Smart Roster Filling</DialogTitle>
          <DialogDescription>
            See how our AI can help you find the right people for your service.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
                <CardDescription>
                  Here are the details for the service needing volunteers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceName">Service Name</Label>
                  <Input id="serviceName" defaultValue="Sunday Morning Worship" readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" defaultValue={new Date(new Date().setDate(new Date().getDate() + (7 - new Date().getDay()))).toLocaleDateString()} readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openSlots">Open Slots</Label>
                  <Input id="openSlots" type="number" defaultValue="2" readOnly />
                </div>
              </CardContent>
            </Card>

             <Card className="mt-4">
              <CardHeader>
                 <CardTitle className="flex items-center gap-2"><Users /> Available Volunteers</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    {volunteerPool.map(v => (
                        <li key={v.volunteerName} className={`flex items-center gap-2 ${v.availability !== 'available' ? 'line-through' : ''}`}>
                            <User className="w-4 h-4"/> {v.volunteerName} - <span className="text-xs">{v.skills}</span>
                        </li>
                    ))}
                </ul>
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
                Suggest Volunteers
              </Button>
            </div>
            <Card className="min-h-[300px]">
              <CardHeader>
                <CardTitle>AI Suggestions</CardTitle>
                <CardDescription>
                  Our AI recommends the following volunteers to fill the open slots.
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
                      <p className="text-sm text-muted-foreground">No suggestions available.</p>
                    )}
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
