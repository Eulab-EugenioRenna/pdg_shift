'use server';

/**
 * @fileOverview An AI tool that suggests volunteers to fill specific positions in a service roster.
 *
 * - suggestTeam - A function that handles the volunteer suggestion process for specific roles.
 * - SuggestTeamInput - The input type for the suggestTeam function.
 * - SuggestTeamOutput - The return type for the suggestTeam function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTeamInputSchema = z.object({
  serviceName: z.string().describe('Il nome del servizio che richiede volontari.'),
  date: z.string().describe('La data del servizio.'),
  positions: z.array(z.string()).describe('Un elenco delle posizioni/ruoli specifici da ricoprire nel team.'),
  volunteerAvailability: z.array(
    z.object({
      volunteerName: z.string().describe('Il nome del volontario.'),
      availability: z.string().describe('La disponibilità del volontario (es. disponibile, non disponibile).'),
      skills: z.string().describe('Le competenze del volontario (es. cantante, musicista, supporto tecnico).'),
      preferences: z.string().describe('Le preferenze del volontario (es. preferisce i servizi mattutini, lavora bene con i bambini).'),
    })
  ).describe('Un array con disponibilità, competenze e preferenze dei volontari.'),
});

export type SuggestTeamInput = z.infer<typeof SuggestTeamInputSchema>;

const SuggestTeamOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      position: z.string().describe('La posizione/ruolo per cui viene suggerito il volontario.'),
      volunteerName: z.string().describe('Il nome del volontario suggerito.'),
      reason: z.string().describe('La motivazione per cui questo volontario viene suggerito per questa specifica posizione.'),
    })
  ).describe('Un array di suggerimenti di volontari per posizioni specifiche e le motivazioni per ogni suggerimento.'),
});

export type SuggestTeamOutput = z.infer<typeof SuggestTeamOutputSchema>;

export async function suggestTeam(input: SuggestTeamInput): Promise<SuggestTeamOutput> {
  return suggestTeamFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTeamPrompt',
  input: {schema: SuggestTeamInputSchema},
  output: {schema: SuggestTeamOutputSchema},
  prompt: `Sei un assistente IA esperto nell'organizzazione di team di volontari per servizi ecclesiastici.

Il tuo compito è riempire le posizioni aperte per un servizio specifico, basandoti sulle competenze e preferenze dei volontari.

Ecco i dettagli del servizio:
- Nome del Servizio: {{{serviceName}}}
- Data: {{{date}}}
- Posizioni da ricoprire: {{#each positions}}- {{{this}}}{{/each}}

Ecco l'elenco dei volontari disponibili. Analizza attentamente le loro competenze per trovare la persona più adatta a ciascun ruolo. Assicurati di non assegnare lo stesso volontario a più di una posizione per questo servizio.

Volontari:
{{#each volunteerAvailability}}
- Nome: {{{volunteerName}}}, Disponibilità: {{{availability}}}, Competenze: {{{skills}}}, Preferenze: {{{preferences}}}
{{/each}}

Suggerisci un solo volontario per ogni posizione. Assegna le persone ai ruoli in cui le loro competenze sono più pertinenti. Fornisci una breve ma chiara motivazione per ogni suggerimento, spiegando perché quel volontario è una buona scelta per quella specifica posizione.

Formatta la tua risposta come un array JSON di suggerimenti.
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

const suggestTeamFlow = ai.defineFlow(
  {
    name: 'suggestTeamFlow',
    inputSchema: SuggestTeamInputSchema,
    outputSchema: SuggestTeamOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
