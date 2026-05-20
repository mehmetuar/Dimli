import api from './api';

export interface BlockedUser {
    id: string;
    username: string;
    full_name: string;
    avatarUrl: string | null;
}

export const blockUser = (userId: string) =>
    api.post(`/users/block/${userId}`);

export const unblockUser = (userId: string) =>
    api.delete(`/users/block/${userId}`);

export const getBlockedUserIds = (): Promise<string[]> =>
    api.get('/users/blocks').then(r => (r.data.blockedUserIds ?? []) as string[]);

export const getBlockedUsers = (): Promise<BlockedUser[]> =>
    api.get('/users/blocks/details').then(r => (r.data ?? []) as BlockedUser[]);
