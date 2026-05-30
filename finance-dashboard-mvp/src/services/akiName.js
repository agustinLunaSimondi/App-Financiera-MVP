import client from './client';

export const submitAkiName = async (name) => {
    const response = await client.post('/aki-name', { name });
    return response.data;
};

export const getRecentAkiNames = async () => {
    const response = await client.get('/aki-name/recent');
    return response.data.names;
};
