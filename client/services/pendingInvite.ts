import { Preferences } from '@capacitor/preferences';

const KEY = 'pending_team_invite';

export interface PendingInvite {
    shortId: string;
    ref?: string;
}

export async function savePendingInvite(invite: PendingInvite): Promise<void> {
    await Preferences.set({ key: KEY, value: JSON.stringify(invite) });
}

export async function getPendingInvite(): Promise<PendingInvite | null> {
    const { value } = await Preferences.get({ key: KEY });
    if (!value) return null;
    try {
        return JSON.parse(value) as PendingInvite;
    } catch {
        return null;
    }
}

export async function clearPendingInvite(): Promise<void> {
    await Preferences.remove({ key: KEY });
}
