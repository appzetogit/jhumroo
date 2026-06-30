import AdminAlert from '../models/AdminAlert.model.js';

export const createAdminAlert = async ({ type, title, message, link }) => {
  try {
    await AdminAlert.create({ type, title, message, link });
  } catch (err) {
    console.error('[createAdminAlert] Failed to log admin alert:', err);
  }
};
