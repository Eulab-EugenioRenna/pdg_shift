"use server";

import { suggestVolunteers, SuggestVolunteersInput } from "@/ai/flows/smart-roster-filling";
import { pb } from "@/lib/pocketbase";
import type { ClientResponseError } from "pocketbase";

function getErrorMessage(error: any): string {
    if (error instanceof Error) {
        const clientError = error as ClientResponseError;
        if (clientError.data?.data) {
            const errorData = clientError.data.data;
            const firstErrorKey = Object.keys(errorData)[0];
            if (firstErrorKey && errorData[firstErrorKey].message) {
                return errorData[firstErrorKey].message;
            }
        }
        return clientError.message;
    }
    return "An unknown error occurred.";
}


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
        throw new Error(getErrorMessage(error));
    }
}

export async function updateChurch(id: string, formData: FormData) {
    try {
        const record = await pb.collection('pdg_church').update(id, formData);
        return JSON.parse(JSON.stringify(record));
    } catch (error) {
        console.error("Error updating church:", error);
        throw new Error(getErrorMessage(error));
    }
}

export async function deleteChurch(id: string) {
    try {
        await pb.collection('pdg_church').delete(id);
        return { success: true };
    } catch (error) {
        console.error("Error deleting church:", error);
        throw new Error(getErrorMessage(error));
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
    let createdRecordId = '';
     try {
        const email = formData.get('email') as string;
        if (!email) throw new Error('Email is required');
        
        const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Date.now().toString().slice(-4);
        
        const textData: {[key:string]: any} = {
            username,
            email,
            emailVisibility: true,
            name: formData.get('name'),
            role: formData.get('role'),
            password: formData.get('password'),
            passwordConfirm: formData.get('passwordConfirm'),
            church: formData.get('church') ? [formData.get('church')] : [],
        };

        const record = await pb.collection('pdg_users').create(textData);
        createdRecordId = record.id;
        
        let avatarFile = formData.get('avatar') as File | null;
        
        if (!avatarFile || avatarFile.size === 0) {
            const avatarResponse = await fetch('https://placehold.co/200x200.png');
            const avatarBlob = await avatarResponse.blob();
            avatarFile = new File([avatarBlob], `${username}_avatar.png`, {type: 'image/png'});
        }

        if (avatarFile) {
            const avatarFormData = new FormData();
            avatarFormData.append('avatar', avatarFile);
            await pb.collection('pdg_users').update(record.id, avatarFormData);
        }

        const finalRecord = await pb.collection('pdg_users').getOne(record.id);
        return JSON.parse(JSON.stringify(finalRecord));

    } catch (error: any) {
        if (createdRecordId) {
            // cleanup created record if avatar upload fails
            await pb.collection('pdg_users').delete(createdRecordId);
        }
        console.error("Error adding user:", error);
        throw new Error(getErrorMessage(error));
    }
}

export async function updateUserByAdmin(id: string, formData: FormData) {
    try {
        const textData: {[key:string]: any} = {
            name: formData.get('name'),
            role: formData.get('role'),
            church: formData.get('church') ? [formData.get('church')] : [],
        };

        await pb.collection('pdg_users').update(id, textData);

        const avatarFile = formData.get('avatar') as File | null;

        if (avatarFile && avatarFile.size > 0) {
            const avatarFormData = new FormData();
            avatarFormData.append('avatar', avatarFile);
            await pb.collection('pdg_users').update(id, avatarFormData);
        }
        
        const record = await pb.collection('pdg_users').getOne(id);
        return JSON.parse(JSON.stringify(record));
    } catch (error: any) {
        console.error("Error updating user:", error);
        throw new Error(getErrorMessage(error));
    }
}

export async function deleteUser(id: string) {
    try {
        await pb.collection('pdg_users').delete(id);
        return { success: true };
    } catch (error) {
        console.error("Error deleting user:", error);
        throw new Error(getErrorMessage(error));
    }
}
