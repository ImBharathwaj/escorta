export const CONNECT_CREDITS = 1;
export const MESSAGE_CREDITS = 1;

/** Sexter: 1 credit per 5-minute session; extend adds 5 mins for 1 credit. */
export const SEXTER_SESSION_CREDITS = 1;
export const SEXTER_SESSION_MINUTES = 5;

/** Consider user "online" if lastActiveAt is within this many ms. */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** Sexter: retain session chat for this many days after session end (by time or manually). Messages are hidden from user once session ends but not deleted until after retention. */
export const SEXTER_RETENTION_DAYS = 3;
