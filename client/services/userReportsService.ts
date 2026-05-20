import api from './api';

export const reportUser = (body: {
    reportedUserId: string;
    messageId?: string;
    channelId?: string;
    note?: string;
}) => api.post('/users/report', body);
