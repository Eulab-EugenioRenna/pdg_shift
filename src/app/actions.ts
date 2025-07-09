"use server";

import { suggestVolunteers, SuggestVolunteersInput } from "@/ai/flows/smart-roster-filling";
import { pb } from "@/lib/pocketbase";
import type { ClientResponseError } from "pocketbase";

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

export async function addChurch(formData: FormData) {
    try {
        const record = await pb.collection('pdg_church').create(formData);
        return JSON.parse(JSON.stringify(record));
    } catch (error) {
        console.error("Error adding church:", error);
        throw new Error("Failed to add church.");
    }
}

export async function updateChurch(id: string, formData: FormData) {
    try {
        const record = await pb.collection('pdg_church').update(id, formData);
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

// User Management Actions
export async function getUsers() {
    try {
        const records = await pb.collection('pdg_users').getFullList({ sort: 'name', expand: 'church' });
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching users:", error);
        throw new Error("Failed to fetch users.");
    }
}

export async function addUserByAdmin(formData: FormData) {
     try {
        const email = formData.get('email') as string;
        if (!email) throw new Error('Email is required');
        
        const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Date.now().toString().slice(-4);
        formData.append('username', username);
        formData.append('emailVisibility', 'true');

        if (!formData.has('avatar') || (formData.get('avatar') as File).size === 0) {
            const avatarResponse = await fetch('https://placehold.co/200x200.png');
            const avatarBlob = await avatarResponse.blob();
            formData.set('avatar', avatarBlob, `${username}_avatar.png`);
        }
        
        const record = await pb.collection('pdg_users').create(formData);
        return JSON.parse(JSON.stringify(record));
    } catch (error: any) {
        console.error("Error adding user:", error.data);
         let errorMessage = "Operazione fallita. Controlla i dati e riprova.";
         if (error.data?.data) {
            const errorData = error.data.data;
            const firstErrorKey = Object.keys(errorData)[0];
            if (firstErrorKey && errorData[firstErrorKey].message) {
                errorMessage = errorData[firstErrorKey].message;
            }
        }
        throw new Error(errorMessage);
    }
}

export async function updateUserByAdmin(id: string, formData: FormData) {
    try {
        const record = await pb.collection('pdg_users').update(id, formData);
        return JSON.parse(JSON.stringify(record));
    } catch (error: any) {
        console.error("Error updating user:", error);
        let errorMessage = "Operazione fallita. Controlla i dati e riprova.";
         if (error.data?.data) {
            const errorData = error.data.data;
            const firstErrorKey = Object.keys(errorData)[0];
            if (firstErrorKey && errorData[firstErrorKey].message) {
                errorMessage = errorData[firstErrorKey].message;
            }
        }
        throw new Error(errorMessage);
    }
}

export async function deleteUser(id: string) {
    try {
        await pb.collection('pdg_users').delete(id);
        return { success: true };
    } catch (error) {
        console.error("Error deleting user:", error);
        throw new Error("Failed to delete user.");
    }
}
