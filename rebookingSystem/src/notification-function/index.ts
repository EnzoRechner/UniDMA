import * as admin from 'firebase-admin';

admin.initializeApp();

export { sendNotification } from './sendNotification';
export { sendStaffNotification } from './sendStaffNotification';
