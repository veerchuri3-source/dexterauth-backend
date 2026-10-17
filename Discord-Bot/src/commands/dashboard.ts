import { SlashCommandBuilder, ChatInputCommandInteraction, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { db } from '../utils/db';
import { ApiService } from '../services/api';
import { EMOJIS } from '../utils/emojis';
import { infoPanel, errText, f, code } from '../utils/embeds';

export const dashboardCommand = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Fetch and show ALL data for the active app (overview, users, licenses, sessions, team).')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const secret = db.getUserSecret(interaction.user.id) || undefined;
    const api = new ApiService({ discordId: interaction.user.id, secret });
    try {
      const profile = await api.getDiscordProfile().catch(() => null);
      const appId = (profile as any)?.profile?.selected_app_id;
      if (!appId) return interaction.editReply({ content: `${EMOJIS.ERROR} No app selected. Use \`/app switch\` first.` });

      const [apps, overview, users, licenses, sessions, subs, team, hashes] = await Promise.allSettled([
        api.getApps(),
        api.getOverview(appId),
        api.getUsers(appId),
        api.getLicenses(appId),
        api.getSessions(appId),
        api.getSubscriptions(appId),
        api.getTeamMembers(appId),
        api.getHashes(appId),
      ]);

      const get = (r: any) => r.status === 'fulfilled' ? r.value : null;
      const appsData = get(apps) as any[];
      const ov = get(overview) as any;
      const usersData = get(users) as any[];
      const licensesData = get(licenses) as any[];
      const sessionsData = get(sessions) as any[];
      const subsData = get(subs) as any[];
      const teamData = get(team) as any;
      const hashesRaw = get(hashes);
      const hashesData: any[] = Array.isArray(hashesRaw) ? hashesRaw : [];

      const activeApp = appsData?.find((a: any) => a.id === appId);
      const teamCount = Array.isArray(teamData) ? teamData.length : (teamData ? 1 : 0);

      return interaction.editReply({
        embeds: [
          infoPanel(
            EMOJIS.STATS,
            `Dashboard — ${activeApp?.name || appId}`,
            `Live data · \`https://dexterauth.onrender.com\` — all endpoints`,
            [
              f(`${EMOJIS.STATS} Overview`, `**${ov?.totalUsers ?? 0}** users · **${ov?.totalLicenses ?? 0}** licenses (${ov?.usedLicenses ?? 0} used) · **${ov?.activeSessions ?? 0}** sessions · **${ov?.totalTokens ?? 0}** tokens · **${ov?.totalSubscriptions ?? 0}** subs · **${ov?.bannedUsers ?? 0}** banned`, false),
              f(`${EMOJIS.USER} Users (${usersData?.length ?? 0})`, usersData?.slice(0, 5).map((u: any) => `${code(u.username)} — ${u.status} — ${u.subscription_level}`).join('\n') || 'No users', false),
              f(`${EMOJIS.LICENSE} Licenses (${licensesData?.length ?? 0})`, licensesData?.slice(0, 5).map((l: any) => `${code(String(l.key).slice(0, 12) + '…')} — ${l.status}`).join('\n') || 'No licenses', false),
              f(`${EMOJIS.SESSIONS} Sessions (${sessionsData?.length ?? 0})`, sessionsData?.slice(0, 5).map((s: any) => `${code(String(s.user_id).slice(0, 8))} — ${s.ip || 'N/A'}`).join('\n') || 'No sessions', false),
              f(`${EMOJIS.PLAN} Subscriptions (${subsData?.length ?? 0})`, subsData?.map((s: any) => `${s.name} (lvl ${s.level})`).join(', ') || 'Default only', false),
              f(`${EMOJIS.TEAM} Team (${teamCount})`, typeof teamData === 'string' ? teamData : JSON.stringify(teamData)?.slice(0, 300) || 'No team', false),
              f(`${EMOJIS.SHIELD} Hashes (${hashesData.length})`, hashesData.slice(0, 3).map((h: any) => code(String(h.hash_value).slice(0, 30))).join('\n') || 'None', false),
            ],
            `App: ${appId} · Use /app snapshot for details`
          ),
        ],
      });
    } catch (e: any) {
      return interaction.editReply({ content: errText(e.message) });
    }
  }
};
