import PocketBase from 'pocketbase';

export const pb = new PocketBase('https://pocketbase.eulab.cloud');
pb

// This is a helper to easily check auth status.
// It's reactive, so it will update automatically.
export const isUserValid = pb.authStore.isValid;
