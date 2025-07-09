"use server";

import { suggestVolunteers, SuggestVolunteersInput } from "@/ai/flows/smart-roster-filling";
import { pb } from "@/lib/pocketbase";

export async function getAiSuggestions(data: SuggestVolunteersInput) {
    try {
        const result = await suggestVolunteers(data);
        return result;
    } catch (error) {
        console.error("Error getting AI suggestions:", error);
        throw new Error("Failed to get suggestions from AI.");
    }
}

export async function getChurches() {
    try {
        const records = await pb.collection('pdg_church').getFullList({ sort: 'name' });
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching churches:", error);
        throw new Error("Failed to fetch churches.");
    }
}

export async function addChurch(name: string) {
    try {
        const record = await pb.collection('pdg_church').create({ name });
        return JSON.parse(JSON.stringify(record));
    } catch (error) {
        console.error("Error adding church:", error);
        throw new Error("Failed to add church.");
    }
}

export async function updateChurch(id: string, name: string) {
    try {
        const record = await pb.collection('pdg_church').update(id, { name });
        return JSON.parse(JSON.stringify(record));
    } catch (error) {
        console.error("Error updating church:", error);
        throw new Error("Failed to update church.");
    }
}

export async function deleteChurch(id: string) {
    try {
        await pb.collection('pdg_church').delete(id);
        return { success: true };
    } catch (error) {
        console.error("Error deleting church:", error);
        throw new Error("Failed to delete church.");
    }
}