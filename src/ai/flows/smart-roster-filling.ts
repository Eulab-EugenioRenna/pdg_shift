// src/ai/flows/smart-roster-filling.ts
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
  serviceName: z.string().describe('The name of the service requiring volunteers.'),
  date: z.string().describe('The date of the service.'),
  openSlots: z.number().describe('The number of open slots in the service roster.'),
  volunteerAvailability: z.array(
    z.object({
      volunteerName: z.string().describe('The name of the volunteer.'),
      availability: z.string().describe('The availability of the volunteer (e.g., available, not available).'),
      skills: z.string().describe('The skills of the volunteer (e.g., singer, musician, tech support).'),
      preferences: z.string().describe('The preferences of the volunteer (e.g., prefers morning services, works well with children).'),
    })
  ).describe('An array of volunteer availability, skills, and preferences.'),
});

export type SuggestVolunteersInput = z.infer<typeof SuggestVolunteersInputSchema>;

const SuggestVolunteersOutputSchema = z.object({
  suggestedVolunteers: z.array(
    z.object({
      volunteerName: z.string().describe('The name of the suggested volunteer.'),
      reason: z.string().describe('The reason for suggesting this volunteer.'),
    })
  ).describe('An array of suggested volunteers and their reasons for being suggested.'),
});

export type SuggestVolunteersOutput = z.infer<typeof SuggestVolunteersOutputSchema>;

export async function suggestVolunteers(input: SuggestVolunteersInput): Promise<SuggestVolunteersOutput> {
  return suggestVolunteersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestVolunteersPrompt',
  input: {schema: SuggestVolunteersInputSchema},
  output: {schema: SuggestVolunteersOutputSchema},
  prompt: `You are an AI assistant helping service leaders fill open slots in their service rosters.

You will be provided with the service name, date, number of open slots, and a list of volunteers with their availability, skills, and preferences.

Your task is to suggest volunteers to fill the open slots based on their availability, skills, and preferences.

Service Name: {{{serviceName}}}
Date: {{{date}}}
Open Slots: {{{openSlots}}}

Volunteers:
{{#each volunteerAvailability}}
- Name: {{{volunteerName}}}, Availability: {{{availability}}}, Skills: {{{skills}}}, Preferences: {{{preferences}}}
{{/each}}

Suggest volunteers who are available, have the necessary skills, and whose preferences align with the service needs. Provide a reason for each suggestion.

Format your response as a JSON array of suggested volunteers with their names and reasons.
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
