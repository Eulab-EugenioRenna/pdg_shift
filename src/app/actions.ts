
"use server";

import { suggestTeam, SuggestTeamInput } from "@/ai/flows/smart-team-builder";
import { pb } from "@/lib/pocketbase";
import { ClientResponseError, type RecordModel } from "pocketbase";
import { format } from 'date-fns';


function getErrorMessage(error: any): string {
    if (error instanceof ClientResponseError) {
        if (error && typeof error === 'object' && 'data' in error && (error as any).data?.data) {
            const errorData = (error as any).data.data;
            const firstErrorKey = Object.keys(errorData)[0];
            if (firstErrorKey && errorData[firstErrorKey].message) {
                return errorData[firstErrorKey].message;
            }
        }
    }
    
    if (error instanceof Error) {
        return error.message;
    }

    return "An unexpected response was received from the server.";
}

export interface DashboardEvent extends RecordModel {
    expand: {
        services: (RecordModel & {
            expand?: {
                leader?: RecordModel;
                team?: RecordModel[];
            }
        })[]
    }
}

export async function getDashboardData(userRole: string, userChurchIds: string[], startDateISO: string, endDateISO: string): Promise<{
    events: DashboardEvent[];
    stats: {
        upcomingEvents: number;
        openPositions: number;
    }
}> {
    try {
        let churchFilter: string;
        if (userRole === 'admin') {
            const allChurches = await getChurches();
            const allChurchIds = allChurches.map(c => c.id);
            if(allChurchIds.length === 0) return { events: [], stats: { upcomingEvents: 0, openPositions: 0 } };
            churchFilter = `(${allChurchIds.map(id => `church="${id}"`).join(' || ')})`;
        } else {
            if (!userChurchIds || userChurchIds.length === 0) {
                return { events: [], stats: { upcomingEvents: 0, openPositions: 0 } };
            }
            churchFilter = `(${userChurchIds.map(id => `church="${id}"`).join(' || ')})`;
        }
        
        const sDate = new Date(startDateISO);
        const eDate = new Date(endDateISO);

        const filter = `(${churchFilter}) && is_recurring = false && start_date >= "${sDate.toISOString().split('T')[0]} 00:00:00" && start_date <= "${eDate.toISOString().split('T')[0]} 23:59:59"`;
        
        const eventInstances = await pb.collection('pdg_events').getFullList({
            filter: filter,
            sort: 'start_date',
        });
        
        const eventIds = eventInstances.map(e => e.id);

        if (eventIds.length === 0) {
            return { events: [], stats: { upcomingEvents: 0, openPositions: 0 } };
        }

        const eventIdFilter = `(${eventIds.map(id => `event="${id}"`).join(' || ')})`;
        const allServices = await pb.collection('pdg_services').getFullList({
            filter: eventIdFilter,
            expand: 'leader,team'
        });

        let openPositions = 0;
        allServices.forEach(s => {
            if (!s.expand?.leader) openPositions++;
        });

        const eventsWithServices = eventInstances.map(eventInstance => {
            const relatedServices = allServices.filter(s => s.event === eventInstance.id);
            return {
                ...eventInstance,
                expand: {
                    services: relatedServices
                }
            };
        });

        return {
            events: JSON.parse(JSON.stringify(eventsWithServices)),
            stats: {
                upcomingEvents: eventsWithServices.length,
                openPositions,
            }
        };

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        throw new Error("Failed to fetch dashboard data.");
    }
}


export async function getAiTeamSuggestions(data: SuggestTeamInput) {
    try {
        const result = await suggestTeam(data);
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

export async function getLeaders(churchId: string) {
    try {
        const records = await pb.collection('pdg_users').getFullList({
            filter: `(role = "leader" || role = "admin") && church ?~ "${churchId}"`,
            sort: 'name',
        });
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching leaders:", error);
        throw new Error("Failed to fetch leaders.");
    }
}

export async function addUserByAdmin(formData: FormData) {
     try {
        const email = formData.get('email') as string;
        if (!email) throw new Error('Email is required');
        
        const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Date.now().toString().slice(-4);
        formData.append('username', username);
        formData.append('emailVisibility', 'true');
        
        const avatarFile = formData.get('avatar') as File | null;
        if (!avatarFile || avatarFile.size === 0) {
            formData.delete('avatar');
             const avatarResponse = await fetch('https://placehold.co/200x200.png');
            const avatarBlob = await avatarResponse.blob();
            formData.append('avatar', avatarBlob, `${username}_avatar.png`);
        }

        const record = await pb.collection('pdg_users').create(formData, { expand: 'church' });
        return JSON.parse(JSON.stringify(record));

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
    const isRecurring = formData.get('is_recurring') === 'true';

    if (!churchId || !startDate || !endDate) {
        throw new Error("Church, start date, and end date are required.");
    }

    try {
        // For non-recurring events, check for overlaps on the specific date.
        // For recurring events, this check is complex. We'll only check the first instance.
        const overlappingEvents = await pb.collection('pdg_events').getFullList({
            filter: `is_recurring = false && church = "${churchId}" && ((start_date < "${endDate}" && end_date > "${startDate}"))`,
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
                        positions: serviceTemplate.positions || [],
                        team_assignments: {},
                        leader: serviceTemplate.leader || null,
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

export async function updateEvent(id: string, formData: FormData) {
    const startDate = formData.get('start_date') as string;
    const endDate = formData.get('end_date') as string;
    const churchId = formData.get('church') as string;
    const isRecurring = formData.get('is_recurring') === 'true';

    if (!isRecurring) {
        formData.append('recurring_day', ''); // Clear recurring day if it's no longer recurring
    }

    if (!startDate || !endDate || !churchId) {
        throw new Error("Church, start date, and end date are required.");
    }
    
    try {
        // Check for overlapping events, excluding the current one
        const overlappingEvents = await pb.collection('pdg_events').getFullList({
            filter: `id != "${id}" && is_recurring = false && church = "${churchId}" && ((start_date < "${endDate}" && end_date > "${startDate}"))`,
        });

        if (overlappingEvents.length > 0) {
            throw new Error("An event already exists in this time range for the selected church.");
        }
        
        const record = await pb.collection('pdg_events').update(id, formData);
        return JSON.parse(JSON.stringify(record));
    } catch (error: any) {
        console.error("Error updating event:", error);
        throw new Error(getErrorMessage(error));
    }
}

export async function deleteEvent(id: string) {
    try {
        const services = await pb.collection('pdg_services').getFullList({ filter: `event = "${id}"` });
        for (const service of services) {
            await pb.collection('pdg_services').delete(service.id);
        }

        await pb.collection('pdg_events').delete(id);
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting event:", error);
        throw new Error(getErrorMessage(error));
    }
}

export async function createEventOverride(originalEventId: string, occurrenceDateISO: string) {
    try {
        const templateEvent = await pb.collection('pdg_events').getOne(originalEventId);

        const occurrenceDate = new Date(occurrenceDateISO);
        const templateStartDate = new Date(templateEvent.start_date);
        const templateEndDate = new Date(templateEvent.end_date);
        const duration = templateEndDate.getTime() - templateStartDate.getTime();

        const newStartDate = new Date(occurrenceDate);
        newStartDate.setHours(templateStartDate.getHours(), templateStartDate.getMinutes(), templateStartDate.getSeconds());

        const newEndDate = new Date(newStartDate.getTime() + duration);

        const newEventData = {
            church: templateEvent.church,
            name: `[Variazione] ${templateEvent.name}`,
            description: templateEvent.description,
            start_date: newStartDate.toISOString(),
            end_date: newEndDate.toISOString(),
            is_recurring: false,
            recurring_day: null,
        };

        const newEventRecord = await pb.collection('pdg_events').create(newEventData);

        const templateServices = await pb.collection('pdg_services').getFullList({
            filter: `event = "${originalEventId}"`,
        });

        for (const service of templateServices) {
            const newServiceData = {
                church: service.church,
                event: newEventRecord.id,
                name: service.name,
                description: service.description,
                leader: service.leader,
                team: service.team || [],
                positions: service.positions || [],
                team_assignments: service.team_assignments || {},
            };
            await pb.collection('pdg_services').create(newServiceData);
        }
        
        const finalRecord = await pb.collection('pdg_events').getOne(newEventRecord.id);
        return JSON.parse(JSON.stringify(finalRecord));

    } catch (error: any) {
        console.error("Error creating event override:", error);
        throw new Error(getErrorMessage(error));
    }
}


// Service Management Actions
export async function getServicesForEvent(eventId: string) {
    try {
        const records = await pb.collection('pdg_services').getFullList({
            filter: `event = "${eventId}"`,
            sort: 'name',
            expand: 'leader,team'
        });
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching services for event:", error);
        throw new Error("Failed to fetch services.");
    }
}

export async function createService(serviceData: any) {
    try {
        const record = await pb.collection('pdg_services').create(serviceData);
        const finalRecord = await pb.collection('pdg_services').getOne(record.id, { expand: 'leader' });
        return JSON.parse(JSON.stringify(finalRecord));
    } catch (error: any) {
        console.error("Error creating service:", error);
        throw new Error(getErrorMessage(error));
    }
}

export async function updateService(id: string, serviceData: any) {
    try {
        const record = await pb.collection('pdg_services').update(id, serviceData);
        const finalRecord = await pb.collection('pdg_services').getOne(record.id, { expand: 'leader,team' });
        return JSON.parse(JSON.stringify(finalRecord));
    } catch (error: any) {
        console.error("Error updating service:", error);
        throw new Error(getErrorMessage(error));
    }
}

export async function deleteService(id: string) {
    try {
        await pb.collection('pdg_services').delete(id);
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting service:", error);
        throw new Error(getErrorMessage(error));
    }
}

// Service Template Management
export async function getServiceTemplates(churchId?: string) {
    try {
        const filter = churchId ? `church = "${churchId}"` : '';
        const records = await pb.collection('pdg_service_templates').getFullList({ 
            sort: 'name',
            expand: 'church,leader',
            filter
        });
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching service templates:", error);
        throw new Error("Failed to fetch service templates.");
    }
}

export async function addServiceTemplate(data: any) {
    try {
        const record = await pb.collection('pdg_service_templates').create(data);
        return JSON.parse(JSON.stringify(record));
    } catch (error: any) {
        throw new Error(getErrorMessage(error));
    }
}

export async function updateServiceTemplate(id: string, data: any) {
    try {
        const record = await pb.collection('pdg_service_templates').update(id, data);
        return JSON.parse(JSON.stringify(record));
    } catch (error: any) {
        throw new Error(getErrorMessage(error));
    }
}

export async function deleteServiceTemplate(id: string) {
    try {
        await pb.collection('pdg_service_templates').delete(id);
        return { success: true };
    } catch (error: any) {
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
    } catch (error: { message: any; }) {
        throw new Error(getErrorMessage(error));
    }
}

// User Availability Actions
export async function getUnavailabilityForUser(userId: string): Promise<RecordModel[]> {
    try {
        const records = await pb.collection('pdg_unavailability').getFullList({
            filter: `user = "${userId}"`,
            sort: '-start_date',
        });
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching unavailability:", error);
        throw new Error("Failed to fetch unavailability.");
    }
}

export async function getAllUnavailabilities(userIds: string[], forDate: string): Promise<Record<string, boolean>> {
    if (userIds.length === 0) {
        return {};
    }
    const userFilter = `(${userIds.map(id => `user = "${id}"`).join(' || ')})`;
    const dateFilter = `start_date <= "${forDate}" && end_date >= "${forDate}"`;
    try {
        const records = await pb.collection('pdg_unavailability').getFullList({
            filter: `${userFilter} && ${dateFilter}`,
        });
        
        const unavailabilityMap: Record<string, boolean> = {};
        userIds.forEach(id => unavailabilityMap[id] = false); // Assume all are available
        records.forEach(record => {
            unavailabilityMap[record.user] = true; // Mark as unavailable
        });
        
        return unavailabilityMap;

    } catch (error) {
        console.error("Error fetching all unavailabilities:", error);
        return {};
    }
}

export async function addUnavailability(data: any): Promise<RecordModel> {
    try {
        const record = await pb.collection('pdg_unavailability').create(data);
        return JSON.parse(JSON.stringify(record));
    } catch (error: any) {
        throw new Error(getErrorMessage(error));
    }
}

export async function updateUnavailability(id: string, data: any): Promise<RecordModel> {
    try {
        const record = await pb.collection('pdg_unavailability').update(id, data);
        return JSON.parse(JSON.stringify(record));
    } catch (error: any) {
        throw new Error(getErrorMessage(error));
    }
}

export async function deleteUnavailability(id: string) {
    try {
        await pb.collection('pdg_unavailability').delete(id);
        return { success: true };
    } catch (error: any) {
        throw new Error(getErrorMessage(error));
    }
}
