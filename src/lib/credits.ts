export const CONNECT_CREDITS = 1;
export const MESSAGE_CREDITS = 1;

/** Sexter: 1 credit per 5-minute session; extend adds 5 mins for 1 credit. */
export const SEXTER_SESSION_CREDITS = 1;
export const SEXTER_SESSION_MINUTES = 5;

/** Consider user "online" if lastActiveAt is within this many ms. */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** Sexter: retain session chat for this many days after session end (by time or manually). Messages are hidden from user once session ends but not deleted until after retention. */
export const SEXTER_RETENTION_DAYS = 3;

/** Live: 1 credit to join; first 2 minutes included, then extend with credits. */
export const LIVE_JOIN_CREDITS = 1;
export const LIVE_WATCH_INITIAL_MINUTES = 2;
export const LIVE_EXTEND_CREDITS = 1;
export const LIVE_EXTEND_MINUTES = 2;

/** 1-1 video call: 1 credit per 2 minutes. */
export const VIDEO_CALL_CREDITS_PER_BLOCK = 1;
export const VIDEO_CALL_BLOCK_MINUTES = 2;

/** Video call request expires if companion doesn't accept/decline within this many minutes. */
export const VIDEO_CALL_REQUEST_EXPIRY_MINUTES = 3;

/** Tips: min/max credits per tip (private chat, sexter, live, video call). */
export const TIP_MIN_CREDITS = 1;
export const TIP_MAX_CREDITS = 100;
