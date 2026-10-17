// Generated 128x128 Discord emoji assets. Upload PNGs or the *_animated.gif variants to Discord and set the returned custom emoji strings here.
export const EMOJI_ASSET_FILES = {
  SUCCESS: 'assets/SUCCESS.png',
  ERROR: 'assets/ERROR.png',
  INFO: 'assets/INFO.png',
  WARNING: 'assets/WARNING.png',
  LOADING: 'assets/LOADING.png',
  ACTIVE: 'assets/ACTIVE.png',
  INACTIVE: 'assets/INACTIVE.png',
  CROWN: 'assets/CROWN.png',
  SHIELD: 'assets/SHIELD.png',
  BOT: 'assets/BOT.png',
  APP: 'assets/APP.png',
  LICENSE: 'assets/LICENSE.png',
  USER: 'assets/USER.png',
  TEAM: 'assets/TEAM.png',
  SETTINGS: 'assets/SETTINGS.png',
  TRASH: 'assets/TRASH.png',
  TAG: 'assets/TAG.png',
  RESELLER: 'assets/RESELLER.png',
  STORE: 'assets/STORE.png',
  SESSIONS: 'assets/SESSIONS.png',
  PLAN: 'assets/PLAN.png',
  LOCK: 'assets/LOCK.png',
  STATS: 'assets/STATS.png',
  IP: 'assets/IP.png',
  TIME: 'assets/TIME.png',
  UNLIMITED: 'assets/UNLIMITED.png',
  EMAIL: 'assets/EMAIL.png',
  BALANCE: 'assets/BALANCE.png',
  BULLET: 'assets/BULLET.png',
  ARROW: 'assets/ARROW.png',
  LINK: 'assets/LINK.png',
} as const;

export const ANIMATED_EMOJI_NAMES = new Set(['ACTIVE', 'ARROW', 'BULLET', 'INACTIVE', 'LOADING', 'RESELLER', 'SETTINGS', 'STORE', 'TIME', 'TRASH']);

export type EmojiName = keyof typeof EMOJI_ASSET_FILES;
