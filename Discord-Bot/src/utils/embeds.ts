import { EmbedBuilder } from 'discord.js';
import { EMOJIS } from './emojis';

// ─── DexterAuth premium panel theme ─────────────────────────────
// One visual language for every bot reply: short titles, inline fields,
// single footer + timestamp. NOTE: Discord embeds cannot load custom
// fonts — hierarchy comes from bold / code spans / code blocks instead.

export const COLORS = {
  success: '#22c55e',
  error: '#ef4444',
  info: '#5865F2',
  warn: '#f59e0b',
} as const;

export interface PanelField {
  name: string;
  value: string;
  inline?: boolean;
}

export function panel(o: {
  emoji?: string;
  title: string;
  color?: string;
  description?: string;
  fields?: PanelField[];
  footer?: string;
}) {
  const e = new EmbedBuilder()
    .setTitle(`${o.emoji ? o.emoji + ' ' : ''}${o.title}`)
    .setColor((o.color || COLORS.info) as `#${string}`)
    .setTimestamp();
  if (o.description) e.setDescription(o.description);
  if (o.fields && o.fields.length) {
    e.addFields(
      o.fields.map((f) => ({
        name: f.name,
        value: f.value === undefined || f.value === null || f.value === '' ? '—' : f.value,
        inline: f.inline ?? true,
      }))
    );
  }
  if (o.footer) e.setFooter({ text: o.footer });
  return e;
}

export const okPanel = (
  emoji: string,
  title: string,
  description?: string,
  fields?: PanelField[],
  footer?: string
) => panel({ emoji, title, color: COLORS.success, description, fields, footer });

export const infoPanel = (
  emoji: string,
  title: string,
  description?: string,
  fields?: PanelField[],
  footer?: string
) => panel({ emoji, title, color: COLORS.info, description, fields, footer });

export const warnPanel = (
  emoji: string,
  title: string,
  description?: string,
  fields?: PanelField[],
  footer?: string
) => panel({ emoji, title, color: COLORS.warn, description, fields, footer });

export const errPanel = (
  emoji: string,
  title: string,
  description?: string,
  fields?: PanelField[],
  footer?: string
) => panel({ emoji, title, color: COLORS.error, description, fields, footer });

// Plain error/info lines (for DMs and validation messages)
export const errText = (text: string) => `${EMOJIS.ERROR} **Error:** ${text}`;
export const infoText = (text: string) => `${EMOJIS.INFO} ${text}`;

// ─── Small formatting helpers ───────────────────────────────────
export const f = (name: string, value: any, inline = true): PanelField => ({
  name,
  value: value === undefined || value === null || value === '' ? '—' : String(value),
  inline,
});

export const code = (s: any) => `\`${s}\``;

export const trunc = (s: string, n: number) =>
  !s ? '' : s.length > n ? s.slice(0, n) + '…' : s;

export const shortId = (s: any, n = 8) => (!s ? '—' : `\`${String(s).slice(0, n)}\``);

export const fmtDate = (d: any) =>
  !d ? 'Never' : new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const fmtDateTime = (d: any) =>
  !d
    ? 'Unknown'
    : new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
