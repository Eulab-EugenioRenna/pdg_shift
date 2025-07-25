
"use server";

import { suggestTeam, SuggestTeamInput } from "@/ai/flows/smart-team-builder";
import { pb } from "@/lib/pocketbase";
import { ClientResponseError, type RecordModel } from "pocketbase";
import { format, startOfMonth, endOfMonth, addDays, isSameDay, addMonths, eachWeekOfInterval, previousSunday, isBefore } from 'date-fns';
import { it } from 'date-fns/locale';
import { sendNotification } from "@/lib/notifications";


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

export interface UnavailabilityRecord extends RecordModel {
    user: string;
    start_date: string;
    end_date: string;
}

// Helper function to generate recurring event instances for the dashboard
const generateDashboardRecurringInstances = (
    event: RecordModel,
    rangeStart: Date,
    rangeEnd: Date
): (RecordModel & { isRecurringInstance: boolean })[] => {
    if (!event.is_recurring || event.recurring_day === null || event.recurring_day === undefined) {
        return [];
    }

    const instances = [];
    const recurrenceStartDate = new Date(event.start_date);
    recurrenceStartDate.setHours(0, 0, 0, 0);

    let currentDate = new Date(rangeStart > recurrenceStartDate ? rangeStart : recurrenceStartDate);
    
    const recurringDay = parseInt(event.recurring_day, 10);
    
    // Adjust currentDate to the first occurrence of recurringDay on or after rangeStart
    const dayOfWeek = currentDate.getDay();
    const daysToAdd = (recurringDay - dayOfWeek + 7) % 7;
    currentDate.setDate(currentDate.getDate() + daysToAdd);

    const originalStartTime = new Date(event.start_date);
    const originalEndTime = new Date(event.end_date);
    const duration = originalEndTime.getTime() - originalStartTime.getTime();

    while (currentDate <= rangeEnd) {
        if (currentDate >= recurrenceStartDate) {
            const newStartDate = new Date(currentDate);
            newStartDate.setHours(originalStartTime.getHours(), originalStartTime.getMinutes(), originalStartTime.getSeconds());
            
            const newEndDate = new Date(newStartDate.getTime() + duration);

            instances.push({
                ...event,
                id: event.id, // The ID of the template event
                start_date: newStartDate.toISOString(),
                end_date: newEndDate.toISOString(),
                isRecurringInstance: true,
            });
        }
        currentDate.setDate(currentDate.getDate() + 7);
    }

    return instances;
};


export async function getDashboardData(userId: string, userRole: string, userChurchIds: string[]): Promise<{
    events: DashboardEvent[];
    unavailabilities: UnavailabilityRecord[];
    initialStats: {
        upcomingEvents: number;
        unreadNotifications: number;
    }
}> {
    try {
        const recurrenceMonthsSetting = await getSetting('recurring_event_months_visibility');
        const recurrenceMonths = recurrenceMonthsSetting ? parseInt(recurrenceMonthsSetting.value, 10) : 3;

        const now = new Date();
        const sDate = startOfMonth(now);
        const eDate = addMonths(sDate, recurrenceMonths);

        let churchFilter: string | null = null;
        let eventIdsForVolunteer: string[] = [];

        if (userRole === 'volontario') {
             const servicesAsLeader = await pb.collection('pdg_services').getFullList({
                filter: `leader = "${userId}"`,
                fields: 'id, event',
                cache: 'no-store',
            });
            const servicesAsTeamMember = await pb.collection('pdg_services').getFullList({
                filter: `team ?~ "${userId}"`,
                fields: 'id, event',
                cache: 'no-store',
            });

            const allUserServices = [...servicesAsLeader, ...servicesAsTeamMember];
            eventIdsForVolunteer = [...new Set(allUserServices.map(s => s.event))];

            if (eventIdsForVolunteer.length === 0 && (!userChurchIds || userChurchIds.length === 0)) {
                 const unreadNotifications = await pb.collection('pdg_notifications').getFullList({ filter: `user = "${userId}" && read = false`, fields: 'id', cache: 'no-store' });
                 return { events: [], unavailabilities: [], initialStats: { upcomingEvents: 0, unreadNotifications: unreadNotifications.length } };
            }
             if (!userChurchIds || userChurchIds.length === 0) {
                 const unreadNotifications = await pb.collection('pdg_notifications').getFullList({ filter: `user = "${userId}" && read = false`, fields: 'id', cache: 'no-store' });
                 return { events: [], unavailabilities: [], initialStats: { upcomingEvents: 0, unreadNotifications: unreadNotifications.length } };
            }
            churchFilter = `(${userChurchIds.map(id => `church="${id}"`).join(' || ')})`;
        } else {
            if (userRole === 'superuser') {
                const allChurches = await getChurches(undefined, 'superuser');
                const allChurchIds = allChurches.map(c => c.id);
                if(allChurchIds.length === 0) {
                     const unreadNotifications = await pb.collection('pdg_notifications').getFullList({ filter: `user = "${userId}" && read = false`, fields: 'id', cache: 'no-store' });
                    return { events: [], unavailabilities: [], initialStats: { upcomingEvents: 0, unreadNotifications: unreadNotifications.length } };
                }
                churchFilter = `(${allChurchIds.map(id => `church="${id}"`).join(' || ')})`;
            } else { // Coordinatore or Leader
                if (!userChurchIds || userChurchIds.length === 0) {
                    const unreadNotifications = await pb.collection('pdg_notifications').getFullList({ filter: `user = "${userId}" && read = false`, fields: 'id', cache: 'no-store' });
                    return { events: [], unavailabilities: [], initialStats: { upcomingEvents: 0, unreadNotifications: unreadNotifications.length } };
                }
                churchFilter = `(${userChurchIds.map(id => `church="${id}"`).join(' || ')})`;
            }
        }
        
        const dateFilter = `start_date >= "${sDate.toISOString().split('T')[0]} 00:00:00" && start_date <= "${eDate.toISOString().split('T')[0]} 23:59:59"`;
        const singleAndVariationFilter = `is_recurring = false && ${churchFilter} && ${dateFilter}`;
        const singleAndVariationEvents = await pb.collection('pdg_events').getFullList({ filter: singleAndVariationFilter, cache: 'no-store' });

        const recurringTemplateFilter = `is_recurring = true && ${churchFilter}`;
        const recurringTemplates = await pb.collection('pdg_events').getFullList({ filter: recurringTemplateFilter, cache: 'no-store' });

        const overrideDateChurchKeys = new Set(
            singleAndVariationEvents
                .filter(e => e.name.startsWith('[Variazione]') || e.name.startsWith('[Annullato]'))
                .map(e => `${format(new Date(e.start_date), 'yyyy-MM-dd')}-${e.church}`)
        );

        const recurringInstances = recurringTemplates
            .flatMap(event => generateDashboardRecurringInstances(event, sDate, eDate))
            .filter(instance => {
                const dateKey = `${format(new Date(instance.start_date), 'yyyy-MM-dd')}-${instance.church}`;
                return !overrideDateChurchKeys.has(dateKey);
            });
        
        let allEventInstances = [...singleAndVariationEvents, ...recurringInstances];

        if (userRole === 'volontario') {
            allEventInstances = allEventInstances.filter(e => eventIdsForVolunteer.includes(e.id));
        }
        
        const eventIds = [...new Set(allEventInstances.map(e => e.id))];

        let allServicesForEvents: RecordModel[] = [];
        if (eventIds.length > 0) {
            const eventIdFilter = `(${eventIds.map(id => `event="${id}"`).join(' || ')})`;
            allServicesForEvents = await pb.collection('pdg_services').getFullList({
                filter: eventIdFilter,
                expand: 'leader,team',
                cache: 'no-store',
            });
        }
        
        let eventsWithServices = allEventInstances.map(eventInstance => {
            const relatedServices = allServicesForEvents.filter(s => s.event === eventInstance.id);
            return {
                ...eventInstance,
                expand: {
                    services: relatedServices
                }
            };
        });

        if (userRole === 'volontario') {
            eventsWithServices = eventsWithServices.filter(e => {
                return e.expand.services.length > 0 || e.name.startsWith('[Annullato]');
            });
        }

        const involvedUserIds = new Set<string>();
        allServicesForEvents.forEach(service => {
            if (service.leader) involvedUserIds.add(service.leader);
            if (service.team) service.team.forEach((t:string) => involvedUserIds.add(t));
        });

        let allUnavailabilities: UnavailabilityRecord[] = [];
        if (involvedUserIds.size > 0) {
            const userFilter = `(${Array.from(involvedUserIds).map(id => `user="${id}"`).join(' || ')})`;
            const unavailabilityRangeFilter = `start_date <= "${eDate.toISOString()}" && end_date >= "${sDate.toISOString()}"`;
            allUnavailabilities = await pb.collection('pdg_unavailability').getFullList({
                filter: `${userFilter} && ${unavailabilityRangeFilter}`,
                cache: 'no-store',
            });
        }
        
        const sortedEvents = eventsWithServices.sort((a,b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
        
        const unreadNotifications = await pb.collection('pdg_notifications').getFullList({
            filter: `user = "${userId}" && read = false`,
            fields: 'id',
            cache: 'no-store',
        });
        
        // Calculate stats for the current month only for initial load
        const statsStartDate = new Date();
        const statsEndDate = endOfMonth(statsStartDate);
        const activeEventsForInitialStats = allEventInstances.filter(e => {
            if (e.name.startsWith('[Annullato]')) return false;
            const eventDate = new Date(e.start_date);
            return eventDate >= statsStartDate && eventDate <= statsEndDate;
        });

        return {
            events: JSON.parse(JSON.stringify(sortedEvents)),
            unavailabilities: JSON.parse(JSON.stringify(allUnavailabilities)),
            initialStats: {
                upcomingEvents: activeEventsForInitialStats.length,
                unreadNotifications: unreadNotifications.length,
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

export async function getChurches(userId?: string, userRole?: string) {
    try {
        if (userRole === 'superuser') {
            const records = await pb.collection('pdg_church').getFullList({ sort: 'name' });
            return JSON.parse(JSON.stringify(records));
        }
        
        if (userId && (userRole === 'coordinatore' || userRole === 'leader' || userRole === 'volontario')) {
             const user = await pb.collection('pdg_users').getOne(userId, { expand: 'church' });
             const churches = user.expand?.church || [];
             return JSON.parse(JSON.stringify(churches.sort((a: any, b: any) => a.name.localeCompare(b.name))));
        }

        const records = await pb.collection('pdg_church').getFullList({ sort: 'name' });
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching churches:", error);
        throw new Error("Failed to fetch churches.");
    }
}

export async function addChurch(formData: FormData, coordinatorId?: string) {
    try {
        const record = await pb.collection('pdg_church').create(formData);
        
        if (coordinatorId) {
             await pb.collection('pdg_users').update(coordinatorId, {
                'church+': record.id,
            });
        }
        
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
export async function getUsers(userId?: string, userRole?: string, churchId?: string) {
    try {
        let filterParts: string[] = [];

        if (userRole === 'coordinatore' && userId) {
            const coordinator = await pb.collection('pdg_users').getOne(userId);
            const churchIds = coordinator.church || [];
            if (churchIds.length > 0) {
                const churchIdFilter = `(${churchIds.map(id => `church ?~ "${id}"`).join(' || ')})`;
                // Also include the coordinator themselves if they are not part of the filtered churches for some reason
                filterParts.push(`(${churchIdFilter} || id = "${userId}")`);
            } else {
                 filterParts.push(`id = "${userId}"`);
            }
        }

        if (churchId && userRole !== 'coordinatore') {
            filterParts.push(`church ?~ "${churchId}"`);
        }

        const options: { sort: string; expand: string; filter?: string; cache: 'no-store' } = {
            sort: 'name',
            expand: 'church,service_preferences',
            cache: 'no-store'
        };

        if (filterParts.length > 0) {
            options.filter = filterParts.join(' && ');
        }
        
        const records = await pb.collection('pdg_users').getFullList(options);
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching users:", error);
        throw new Error("Failed to fetch users.");
    }
}


export async function getLeaders(churchId?: string) {
    try {
        const filter = churchId ? `(role = "leader" || role = "coordinatore" || role = "superuser") && church ?~ "${churchId}"` : `role = "leader" || role = "coordinatore" || role = "superuser"`;
        const records = await pb.collection('pdg_users').getFullList({
            filter: filter,
            sort: 'name',
        });
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching leaders:", error);
        throw new Error("Failed to fetch leaders.");
    }
}

export async function addUserByAdmin(formData: FormData, adminUser: any) {
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
        
        await sendNotification({
            type: 'user_created',
            title: `Nuovo utente creato: ${record.name}`,
            body: `L'amministratore ${adminUser.name} ha creato un nuovo utente.`,
            data: { newUser: record, admin: adminUser },
            userIds: [record.id] // Notify the new user
        });

        return JSON.parse(JSON.stringify(record));

    } catch (error: any) {
        console.error("Error adding user:", error);
        throw new Error(getErrorMessage(error));
    }
}

export async function updateUserByAdmin(id: string, formData: FormData, adminUser: any) {
    try {
        const oldRecord = await pb.collection('pdg_users').getOne(id);
        await pb.collection('pdg_users').update(id, formData);
        const finalRecord = await pb.collection('pdg_users').getOne(id, { expand: 'church' });
        
         await sendNotification({
            type: 'user_updated',
            title: `Profilo aggiornato: ${finalRecord.name}`,
            body: `Il tuo profilo è stato aggiornato da un amministratore.`,
            data: { oldUser: oldRecord, updatedUser: finalRecord, admin: adminUser },
            userIds: [finalRecord.id]
        });
        
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
export async function getEvents(filter: string) {
    try {
        const records = await pb.collection('pdg_events').getFullList({
            filter: filter,
            sort: '-start_date',
        });
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching events:", error);
        throw new Error("Failed to fetch events.");
    }
}

export async function createEvent(formData: FormData, user: any) {
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
        
         await sendNotification({
            type: 'event_created',
            title: `Nuovo evento: ${record.name}`,
            body: `L'utente ${user.name} ha creato un nuovo evento.`,
            data: { event: record, user },
            // Potresti notificare tutti gli utenti di quella chiesa, ad esempio
        });

        return JSON.parse(JSON.stringify(record));
    } catch (error: any) {
        console.error("Error creating event:", error);
        throw new Error(getErrorMessage(error));
    }
}

export async function updateEvent(id: string, formData: FormData, user: any) {
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
        
        await sendNotification({
            type: 'event_updated',
            title: `Evento aggiornato: ${record.name}`,
            body: `L'utente ${user.name} ha aggiornato l'evento.`,
            data: { event: record, user },
        });

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

export async function deleteRecurringEventAndPreserveHistory(templateEventId: string, user: any) {
    try {
        const templateEvent = await pb.collection('pdg_events').getOne(templateEventId);
        
        const today = new Date();
        const recurrenceStartDate = new Date(templateEvent.start_date);

        // 1. Get all past occurrences that should have happened
        const pastInstances = generateDashboardRecurringInstances(templateEvent, recurrenceStartDate, today);
        
        // 2. Get existing variations/cancellations for this church
        const existingOverrides = await pb.collection('pdg_events').getFullList({
            filter: `church = "${templateEvent.church}" && is_recurring = false && (name ~ "${templateEvent.name}" || description ~ "${templateEvent.name}")`,
            fields: 'start_date',
        });
        const overrideDates = new Set(existingOverrides.map(e => format(new Date(e.start_date), 'yyyy-MM-dd')));

        // 3. For each past instance, if no override exists, create a snapshot event
        for (const instance of pastInstances) {
            const instanceDateStr = format(new Date(instance.start_date), 'yyyy-MM-dd');

            if (!overrideDates.has(instanceDateStr)) {
                // No override exists, create a snapshot
                const snapshotEvent = await createEventOverride(templateEventId, instance.start_date);
                
                await sendNotification({
                    type: 'event_created_from_recurring',
                    title: `Evento salvato: ${snapshotEvent.name}`,
                    body: `L'evento ricorrente è stato terminato e questo evento passato è stato salvato come singolo.`,
                    data: { event: snapshotEvent, user },
                });
            }
        }

        // 4. Finally, delete the recurring event template
        await deleteEvent(templateEventId);

        await sendNotification({
            type: 'event_series_deleted',
            title: `Serie di eventi terminata: ${templateEvent.name}`,
            body: `La serie di eventi ricorrenti è stata terminata da ${user.name}. Gli eventi passati sono stati conservati.`,
            data: { event: templateEvent, user },
        });

        return { success: true, message: 'Serie ricorrente terminata, storico preservato.' };

    } catch (error: any) {
        console.error("Error deleting recurring event series:", error);
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

export async function createCancellationEvent(originalEventId: string, occurrenceDateISO: string, user: any) {
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
            name: `[Annullato] ${templateEvent.name}`,
            description: `Evento annullato per questa data da ${user.name}.`,
            start_date: newStartDate.toISOString(),
            end_date: newEndDate.toISOString(),
            is_recurring: false,
            recurring_day: null,
        };
        
        const newEventRecord = await pb.collection('pdg_events').create(newEventData);
        
        return JSON.parse(JSON.stringify(newEventRecord));

    } catch (error: any) {
        console.error("Error creating cancellation event:", error);
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

const generateServiceSummaryBody = (service: RecordModel, event: RecordModel): string => {
    const assignedRoles: string[] = [];
    const unassignedRoles: string[] = [];

    const leaderName = service.expand?.leader?.name || 'Non assegnato';
    assignedRoles.push(`Leader: ${leaderName}`);

    const teamMembersMap = new Map(service.expand?.team?.map((m: RecordModel) => [m.id, m.name]) || []);

    if (service.positions && service.positions.length > 0) {
        service.positions.forEach((position: string) => {
            const assignedUserId = service.team_assignments?.[position];
            if (assignedUserId && teamMembersMap.has(assignedUserId)) {
                assignedRoles.push(`${position}: ${teamMembersMap.get(assignedUserId)}`);
            } else {
                unassignedRoles.push(position);
            }
        });
    }

    let body = `Riepilogo per il servizio "${service.name}" dell'evento "${event.name}" del ${format(new Date(event.start_date), 'dd/MM/yyyy', { locale: it })}.\n\n`;
    body += 'Persone in turno:\n';
    body += assignedRoles.map(r => `- ${r}`).join('\n');
    
    if (unassignedRoles.length > 0) {
        body += '\n\nPosizioni scoperte:\n';
        body += unassignedRoles.map(r => `- ${r}`).join('\n');
    }

    return body;
};

export async function createService(serviceData: any, user: any) {
    try {
        const record = await pb.collection('pdg_services').create(serviceData);
        
        // Fetch the full record with expansions
        const finalRecord = await pb.collection('pdg_services').getOne(record.id, { expand: 'leader,team' });
        
        const userIdsToNotify = [
            ...(finalRecord.leader ? [finalRecord.leader] : []),
            ...(finalRecord.team || [])
        ].filter((id, index, self) => self.indexOf(id) === index);

        if (userIdsToNotify.length > 0) {
            // Fetch event details to include in notification
            const eventRecord = await pb.collection('pdg_events').getOne(finalRecord.event);
            
            const notificationBody = generateServiceSummaryBody(finalRecord, eventRecord);

            // Enrich the data for the notification
            const notificationData = {
                event: eventRecord,
                service: finalRecord,
                user: user, // The user who made the change
            };

            await sendNotification({
                type: 'service_created',
                title: `Nuovo servizio: ${finalRecord.name}`,
                body: notificationBody,
                data: notificationData,
                userIds: userIdsToNotify
            });
        }
        
        return JSON.parse(JSON.stringify(finalRecord));
    } catch (error: any) {
        console.error("Error creating service:", error);
        throw new Error(getErrorMessage(error));
    }
}

export async function updateService(id: string, serviceData: any, user: any) {
    try {
        const oldRecord = await pb.collection('pdg_services').getOne(id);
        const record = await pb.collection('pdg_services').update(id, serviceData);
        
        // Fetch the full record with expansions
        const finalRecord = await pb.collection('pdg_services').getOne(record.id, { expand: 'leader,team' });

        const oldTeamSet = new Set([...(oldRecord.team || []), oldRecord.leader].filter(Boolean));
        const newTeamSet = new Set([...(finalRecord.team || []), finalRecord.leader].filter(Boolean));
        
        const addedUsers = [...newTeamSet].filter(x => !oldTeamSet.has(x));
        const allInvolvedUsers = [...newTeamSet];

        if (allInvolvedUsers.length > 0) {
            // Fetch event details to include in notification
            const eventRecord = await pb.collection('pdg_events').getOne(finalRecord.event);

            const notificationBody = generateServiceSummaryBody(finalRecord, eventRecord);
            
            // Enrich the data for the notification
            const notificationData = {
                event: eventRecord,
                service: finalRecord,
                user: user, // The user who made the change
            };

            await sendNotification({
                type: 'service_updated',
                title: `Team aggiornato per: ${finalRecord.name}`,
                body: notificationBody,
                data: notificationData,
                userIds: allInvolvedUsers
            });
        }

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
export async function getServiceTemplates(userId?: string, userRole?: string, churchId?: string) {
    try {
        let filter = '';
        if (userRole === 'coordinatore' && userId) {
            const user = await pb.collection('pdg_users').getOne(userId);
            const churchIds = user.church || [];
            if (churchIds.length > 0) {
                filter = `(${churchIds.map(id => `church ?~ "${id}"`).join(' || ')})`;
            } else {
                return []; // Return empty if coordinator has no churches
            }
        } else if (churchId) {
             filter = `church ?~ "${churchId}"`;
        } else if (userRole === 'superuser') {
            // No filter for superuser, gets all
        }

        const options: { sort: string; expand: string; filter?: string } = {
            sort: 'name',
            expand: 'church,leader',
        };

        if (filter) {
            options.filter = filter;
        }

        const records = await pb.collection('pdg_service_templates').getFullList(options);
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching service templates:", error);
        throw new Error("Failed to fetch service templates.");
    }
}

export async function addServiceTemplate(data: FormData) {
    try {
        const record = await pb.collection('pdg_service_templates').create(data);
        return JSON.parse(JSON.stringify(record));
    } catch (error: any) {
        throw new Error(getErrorMessage(error));
    }
}

export async function updateServiceTemplate(id: string, data: FormData) {
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
export async function getEventTemplates(userId?: string, userRole?: string, churchId?: string) {
    try {
        let filter = '';
        if (userRole === 'coordinatore' && userId) {
            const user = await pb.collection('pdg_users').getOne(userId);
            const churchIds = user.church || [];
            if (churchIds.length > 0) {
                filter = `(${churchIds.map(id => `churches ?~ "${id}"`).join(' || ')})`;
            } else {
                return []; // Return empty if coordinator has no churches
            }
        } else if (churchId) {
             filter = `churches ?~ "${churchId}"`;
        } else if (userRole === 'superuser') {
             // No filter for superuser, gets all
        }
        
        const options: { sort: string; expand: string; filter?: string } = {
            sort: 'name',
            expand: 'service_templates,churches',
        };

        if (filter) {
            options.filter = filter;
        }
        
        const allTemplates = await pb.collection('pdg_event_templates').getFullList(options);
        return JSON.parse(JSON.stringify(allTemplates));
    } catch (error) {
        console.error("Error fetching event templates:", error);
        throw new Error("Failed to fetch event templates.");
    }
}

export async function addEventTemplate(formData: FormData) {
    try {
        const record = await pb.collection('pdg_event_templates').create(formData);
        const finalRecord = await pb.collection('pdg_event_templates').getOne(record.id, { expand: 'service_templates,churches' });
        return JSON.parse(JSON.stringify(finalRecord));
    } catch (error: any) {
        throw new Error(getErrorMessage(error));
    }
}

export async function updateEventTemplate(id: string, formData: FormData) {
    try {
        await pb.collection('pdg_event_templates').update(id, formData);
        const finalRecord = await pb.collection('pdg_event_templates').getOne(id, { expand: 'service_templates,churches' });
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

// Notification Actions
export async function getNotifications(userId: string) {
    const records = await pb.collection('pdg_notifications').getFullList({
        filter: `user = "${userId}"`,
        sort: '-created',
    });
    return JSON.parse(JSON.stringify(records));
}

export async function markNotificationAsRead(id: string) {
    return await pb.collection('pdg_notifications').update(id, { read: true });
}

export async function markAllNotificationsAsRead(userId: string) {
    const records = await pb.collection('pdg_notifications').getFullList({
        filter: `user = "${userId}" && read = false`,
    });
    const promises = records.map(r => pb.collection('pdg_notifications').update(r.id, { read: true }));
    return Promise.all(promises);
}

export async function deleteNotification(id: string) {
    return await pb.collection('pdg_notifications').delete(id);
}

// Settings actions
export async function getSetting(key: string) {
    try {
        const record = await pb.collection('pdg_settings').getFirstListItem(`key = "${key}"`);
        return record;
    } catch (error) {
        if (error instanceof ClientResponseError && error.status === 404) {
            return null; // Not found is a valid case
        }
        throw error;
    }
}

export async function updateSetting(key: string, value: string) {
    try {
        const existing = await getSetting(key);
        if (existing) {
            return await pb.collection('pdg_settings').update(existing.id, { value });
        } else {
            return await pb.collection('pdg_settings').create({ key, value });
        }
    } catch (error: any) {
         throw new Error(getErrorMessage(error));
    }
}

// Social Link Actions
export async function getSocialLinks(churchIds: string[], type?: string) {
    try {
        if (!churchIds || churchIds.length === 0) {
            return [];
        }

        let filterParts = [];
        
        // Filter by user's churches
        const churchFilter = `(${churchIds.map(id => `church ?~ "${id}"`).join(' || ')})`;
        filterParts.push(churchFilter);
        
        // Filter by type if provided
        if (type) {
            filterParts.push(`type = "${type}"`);
        }

        const filter = filterParts.join(' && ');
        
        const records = await pb.collection('pdg_social_links').getFullList({
            filter: filter,
            sort: 'name',
        });
        return JSON.parse(JSON.stringify(records));
    } catch (error) {
        console.error("Error fetching social links:", error);
        throw new Error("Failed to fetch social links.");
    }
}

export async function addSocialLink(formData: FormData) {
    try {
        const record = await pb.collection('pdg_social_links').create(formData);
        return JSON.parse(JSON.stringify(record));
    } catch (error) {
        console.error("Error adding social link:", error);
        throw new Error(getErrorMessage(error));
    }
}

export async function updateSocialLink(id: string, formData: FormData) {
    try {
        const record = await pb.collection('pdg_social_links').update(id, formData);
        return JSON.parse(JSON.stringify(record));
    } catch (error) {
        console.error("Error updating social link:", error);
        throw new Error(getErrorMessage(error));
    }
}

export async function deleteSocialLink(id: string) {
    try {
        await pb.collection('pdg_social_links').delete(id);
        return { success: true };
    } catch (error) {
        console.error("Error deleting social link:", error);
        throw new Error(getErrorMessage(error));
    }
}

export async function getServiceTemplatesForUserPreferences(userId: string) {
    try {
        const user = await pb.collection('pdg_users').getOne(userId, {
            expand: 'service_preferences'
        });
        return user.expand?.service_preferences?.map((st: any) => st.id) || [];
    } catch (error) {
        console.error("Error fetching service templates for user:", error);
        return [];
    }
}


    