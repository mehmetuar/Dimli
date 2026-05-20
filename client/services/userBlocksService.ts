import api from './api';

export const blockUser = (userId: string) =>
    api.post(`/users/block/${userId}`);

export const unblockUser = (userId: string) =>
    api.delete(`/users/block/${userId}`);

export const getBlockedUserIds = (): Promise<string[]> =>
    api.get('/users/blocks').then(r => (r.data.blockedUserIds ?? []) as string[]);
