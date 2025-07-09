
"use server";

import { suggestVolunteers, SuggestVolunteersInput } from "@/ai/flows/smart-roster-filling";
import { pb } from "@/lib/pocketbase";
import type { ClientResponseError } from "pocketbase";

function getErrorMessage(error: any): string {
    if (error instanceof Error && !(error instanceof ClientResponseError)) {
        return error.message;
    }
    
    if (error && typeof error === 'object' && error.data?.data) {
        const errorData = error.data.data;
        const firstErrorKey = Object.keys(errorData)[0];
        if (firstErrorKey && errorData[firstErrorKey].message) {
            return errorData[firstErrorKey].message;
        }
    }
    
    return "An unexpected response was received from the server.";
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
     try {
        const email = formData.get('email') as string;
        if (!email) throw new Error('Email is required');
        
        const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Date.now().toString().slice(-4);
        formData.append('username', username);
        formData.append('emailVisibility', 'true');
        
        let avatarFile = formData.get('avatar') as File | null;
        
        if (!avatarFile || avatarFile.size === 0) {
            const avatarResponse = await fetch('https://placehold.co/200x200.png');
            const avatarBlob = await avatarResponse.blob();
            formData.set('avatar', avatarBlob, `${username}_avatar.png`);
        }

        const record = await pb.collection('pdg_users').create(formData);
        
        const finalRecord = await pb.collection('pdg_users').getOne(record.id, { expand: 'church' });
        return JSON.parse(JSON.stringify(finalRecord));

    } catch (error: any) {
        console.error("Error adding user:", error);
        throw new Error(getErrorMessage(error));
    }
}

export async function updateUserByAdmin(id: string, formData: FormData) {
    try {
        await pb.collection('pdg_users').update(id, formData);
        const finalRecord = await pb.collection('pdg_users').getOne(id, { expand: 'church' });
        return JSON.parse(JSON.stringify(finalRecord));
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

// User Profile Actions
export async function updateUserProfile(id: string, formData: FormData) {
    try {
        const record = await pb.collection('pdg_users').update(id, formData);
        return JSON.parse(JSON.stringify(record));
    } catch (error: any) {
        console.error("Error updating user profile:", error);
        throw new Error(getErrorMessage(error));
    }
}

// Event Management Actions
export async function getEvents(churchId: string) {
    try {
        const records = await pb.collection('pdg_events').getFullList({
            filter: `church = "${churchId}"`,
            sort: '-start_date',
        });
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching events:", error);
        throw new Error("Failed to fetch events.");
    }
}

export async function createEvent(formData: FormData) {
    const churchId = formData.get('church') as string;
    const startDate = formData.get('start_date') as string;
    const endDate = formData.get('end_date') as string;
    const templateId = formData.get('templateId') as string | null;

    if (!churchId || !startDate || !endDate) {
        throw new Error("Church, start date, and end date are required.");
    }

    try {
        // Check for overlapping events
        const overlappingEvents = await pb.collection('pdg_events').getFullList({
            filter: `church = "${churchId}" && ((start_date < "${endDate}" && end_date > "${startDate}"))`,
        });

        if (overlappingEvents.length > 0) {
            throw new Error("An event already exists in this time range for the selected church.");
        }

        // Remove templateId from formData before creating the event, as it's not a field in pdg_events
        if (templateId) {
            formData.delete('templateId');
        }

        const record = await pb.collection('pdg_events').create(formData);

        // If a template was used, create services from it
        if (templateId) {
            const eventTemplate = await pb.collection('pdg_event_templates').getOne(templateId, {
                expand: 'service_templates'
            });

            if (eventTemplate.expand?.service_templates) {
                for (const serviceTemplate of eventTemplate.expand.service_templates) {
                    await pb.collection('pdg_services').create({
                        name: serviceTemplate.name,
                        description: serviceTemplate.description,
                        event: record.id,
                        church: churchId,
                        // leader field is not set by default
                    });
                }
            }
        }

        return JSON.parse(JSON.stringify(record));
    } catch (error: any) {
        console.error("Error creating event:", error);
        throw new Error(getErrorMessage(error));
    }
}


// Service Management Actions
export async function getServicesForEvent(eventId: string) {
    try {
        const records = await pb.collection('pdg_services').getFullList({
            filter: `event = "${eventId}"`,
            sort: 'name',
            expand: 'leader'
        });
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching services for event:", error);
        throw new Error("Failed to fetch services.");
    }
}

// Service Template Management
export async function getServiceTemplates() {
    try {
        const records = await pb.collection('pdg_service_templates').getFullList({ sort: 'name' });
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching service templates:", error);
        throw new Error("Failed to fetch service templates.");
    }
}

export async function addServiceTemplate(formData: FormData) {
    try {
        const record = await pb.collection('pdg_service_templates').create(formData);
        return JSON.parse(JSON.stringify(record));
    } catch (error: any) {
        throw new Error(getErrorMessage(error));
    }
}

export async function updateServiceTemplate(id: string, formData: FormData) {
    try {
        const record = await pb.collection('pdg_service_templates').update(id, formData);
        return JSON.parse(JSON.stringify(record));
    } catch (error: any) {
        throw new Error(getErrorMessage(error));
    }
}

export async function deleteServiceTemplate(id: string) {
    try {
        await pb.collection('pdg_service_templates').delete(id);
        return { success: true };
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}


// Event Template Management
export async function getEventTemplates() {
    try {
        const records = await pb.collection('pdg_event_templates').getFullList({ sort: 'name', expand: 'service_templates' });
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching event templates:", error);
        throw new Error("Failed to fetch event templates.");
    }
}

export async function addEventTemplate(formData: FormData) {
    try {
        const record = await pb.collection('pdg_event_templates').create(formData);
        const finalRecord = await pb.collection('pdg_event_templates').getOne(record.id, { expand: 'service_templates' });
        return JSON.parse(JSON.stringify(finalRecord));
    } catch (error: any) {
        throw new Error(getErrorMessage(error));
    }
}

export async function updateEventTemplate(id: string, formData: FormData) {
    try {
        await pb.collection('pdg_event_templates').update(id, formData);
        const finalRecord = await pb.collection('pdg_event_templates').getOne(id, { expand: 'service_templates' });
        return JSON.parse(JSON.stringify(finalRecord));
    } catch (error: any) {
        throw new Error(getErrorMessage(error));
    }
}

export async function deleteEventTemplate(id: string) {
    try {
        await pb.collection('pdg_event_templates').delete(id);
        return { success: true };
    } catch (error) {
        throw new Error(getErrorMessage(error));
    }
}
