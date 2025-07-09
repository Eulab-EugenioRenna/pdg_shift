'use server';

/**
 * @fileOverview An AI tool that suggests volunteers to fill empty slots in the service roster.
 *
 * - suggestVolunteers - A function that handles the volunteer suggestion process.
 * - SuggestVolunteersInput - The input type for the suggestVolunteers function.
 * - SuggestVolunteersOutput - The return type for the suggestVolunteers function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestVolunteersInputSchema = z.object({
  serviceName: z.string().describe('Il nome del servizio che richiede volontari.'),
  date: z.string().describe('La data del servizio.'),
  openSlots: z.number().describe('Il numero di posti disponibili nella lista del servizio.'),
  volunteerAvailability: z.array(
    z.object({
      volunteerName: z.string().describe('Il nome del volontario.'),
      availability: z.string().describe('La disponibilità del volontario (es. disponibile, non disponibile).'),
      skills: z.string().describe('Le competenze del volontario (es. cantante, musicista, supporto tecnico).'),
      preferences: z.string().describe('Le preferenze del volontario (es. preferisce i servizi mattutini, lavora bene con i bambini).'),
    })
  ).describe('Un array con disponibilità, competenze e preferenze dei volontari.'),
});

export type SuggestVolunteersInput = z.infer<typeof SuggestVolunteersInputSchema>;

const SuggestVolunteersOutputSchema = z.object({
  suggestedVolunteers: z.array(
    z.object({
      volunteerName: z.string().describe('Il nome del volontario suggerito.'),
      reason: z.string().describe('La motivazione per cui questo volontario viene suggerito.'),
    })
  ).describe('Un array di volontari suggeriti e le motivazioni per il suggerimento.'),
});

export type SuggestVolunteersOutput = z.infer<typeof SuggestVolunteersOutputSchema>;

export async function suggestVolunteers(input: SuggestVolunteersInput): Promise<SuggestVolunteersOutput> {
  return suggestVolunteersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestVolunteersPrompt',
  input: {schema: SuggestVolunteersInputSchema},
  output: {schema: SuggestVolunteersOutputSchema},
  prompt: `Sei un assistente IA che aiuta i responsabili dei servizi a riempire i posti vacanti nelle liste dei turni.

Ti verranno forniti il nome del servizio, la data, il numero di posti disponibili e un elenco di volontari con la loro disponibilità, competenze e preferenze.

Il tuo compito è suggerire volontari per riempire i posti disponibili in base alla loro disponibilità, competenze e preferenze.

Nome del Servizio: {{{serviceName}}}
Data: {{{date}}}
Posti Disponibili: {{{openSlots}}}

Volontari:
{{#each volunteerAvailability}}
- Nome: {{{volunteerName}}}, Disponibilità: {{{availability}}}, Competenze: {{{skills}}}, Preferenze: {{{preferences}}}
{{/each}}

Suggerisci volontari che siano disponibili, che abbiano le competenze necessarie e le cui preferenze siano in linea con le esigenze del servizio. Fornisci una motivazione per ogni suggerimento.

Formatta la tua risposta come un array JSON di volontari suggeriti con i loro nomi e le motivazioni.
`, safetySettings: [
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_ONLY_HIGH',
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_NONE',
    },
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_LOW_AND_ABOVE',
    },
  ],
});

const suggestVolunteersFlow = ai.defineFlow(
  {
    name: 'suggestVolunteersFlow',
    inputSchema: SuggestVolunteersInputSchema,
    outputSchema: SuggestVolunteersOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
