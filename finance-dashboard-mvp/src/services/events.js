import client from './client';

/**
 * Events Service — gastos compartidos en grupo.
 * Las mutaciones devuelven el EventOut completo (incluye balances y liquidación),
 * así el caller actualiza su estado local con la respuesta.
 */

export const getEvents = async () => {
    const res = await client.get('/events');
    return res.data;
};

export const getEvent = async (eventId) => {
    const res = await client.get(`/events/${eventId}`);
    return res.data;
};

export const createEvent = async (payload) => {
    const res = await client.post('/events', payload);
    return res.data;
};

export const updateEvent = async (eventId, updates) => {
    const res = await client.put(`/events/${eventId}`, updates);
    return res.data;
};

export const deleteEvent = async (eventId) => {
    await client.delete(`/events/${eventId}`);
    return true;
};

export const closeEvent = async (eventId) => {
    const res = await client.post(`/events/${eventId}/close`);
    return res.data;
};

export const addEventMember = async (eventId, member) => {
    const res = await client.post(`/events/${eventId}/members`, member);
    return res.data;
};

export const removeEventMember = async (eventId, memberId) => {
    const res = await client.delete(`/events/${eventId}/members/${memberId}`);
    return res.data;
};

export const addEventExpense = async (eventId, expense) => {
    const res = await client.post(`/events/${eventId}/expenses`, expense);
    return res.data;
};

export const deleteEventExpense = async (eventId, expenseId) => {
    const res = await client.delete(`/events/${eventId}/expenses/${expenseId}`);
    return res.data;
};

export const uploadEventReceipt = async (eventId, expenseId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await client.post(
        `/events/${eventId}/expenses/${expenseId}/receipt`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return res.data;
};

export const markSplitPaid = async (eventId, expenseId, splitId) => {
    const res = await client.put(`/events/${eventId}/expenses/${expenseId}/splits/${splitId}/pay`);
    return res.data;
};
