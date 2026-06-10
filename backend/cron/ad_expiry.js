import Ad from '../models/Ad.model.js';

/**
 * Expires ads whose endDate has passed.
 * Runs on a schedule (every hour) to set isActive=false on ads past their end date.
 */
export const expireAds = async () => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const result = await Ad.updateMany(
      {
        endDate: { $lt: now, $ne: null }, // end date is set and in the past
        isActive: true                    // currently still active
      },
      {
        $set: { isActive: false }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`⏰ [CRON] Ad Expiry: Deactivated ${result.modifiedCount} expired ad(s).`);
    }
  } catch (error) {
    console.error('❌ [CRON] Ad Expiry job failed:', error);
  }
};
