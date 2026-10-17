import { SlashCommandBuilder, ChatInputCommandInteraction, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { ApiService } from '../services/api';
import { db } from '../utils/db';
import { EMOJIS } from '../utils/emojis';
import { infoPanel, okPanel, errPanel, f, code, fmtDateTime } from '../utils/embeds';

export const sessionCommand = {
  data: new SlashCommandBuilder()
    .setName('session')
    .setDescription('View and manage active user sessions for your application.')
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all active sessions for the current application.')
    )
    .addSubcommand(sub =>
      sub.setName('kill')
        .setDescription('Terminate a specific session by its ID.')
        .addStringOption(o => o.setName('session_id').setDescription('Session ID to terminate (from /session list)').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('killall')
        .setDescription('Terminate ALL active sessions for this application. (Admin only)')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const discordId = interaction.user.id;
    const secret = db.getUserSecret(discordId) || undefined;
    const api = new ApiService({ discordId, secret });

    const profileRes = await api.getDiscordProfile().catch(() => null);
    const selectedAppId = profileRes?.profile?.selected_app_id;
    const appName = profileRes?.profile?.selected_app_name || selectedAppId;

    if (!selectedAppId) {
      const apps = await api.getApps().catch(() => []);
      const msg = (!apps || apps.length === 0)
        ? `${EMOJIS.ERROR} You have no applications. Create one on the web dashboard first.`
        : `${EMOJIS.ERROR} No application selected. Use \`/app switch\` to set your active application.`;
      return interaction.reply({ content: msg, ephemeral: true });
    }

    try {
      // ─── LIST ──────────────────────────────────────────────────────────────
      if (subcommand === 'list') {
        await interaction.deferReply({ ephemeral: true });

        const sessions = await api.getSessions(selectedAppId);

        if (!sessions || sessions.length === 0) {
          return interaction.editReply({ content: `${EMOJIS.INFO} No active sessions found for **${appName}**.` });
        }

        return interaction.editReply({
          embeds: [
            infoPanel(
              EMOJIS.ACTIVE,
              `Active Sessions — ${appName} (${sessions.length})`,
              sessions.slice(0, 10).map((s: any, i: number) =>
                `**#${i + 1}** ${code(s.username || s.user?.username || 'Unknown')} · \`${s.ip_address || s.ip || '—'}\` · ${s.hwid ? code(String(s.hwid).slice(0, 12) + '…') : 'N/A'}\nStarted ${fmtDateTime(s.created_at)} · ID ${code(s.id)}`
              ).join('\n\n'),
              undefined,
              sessions.length > 10 ? `Showing 10 of ${sessions.length}` : `Total: ${sessions.length} session(s)`
            ),
          ],
        });
      }

      // ─── KILL ──────────────────────────────────────────────────────────────
      if (subcommand === 'kill') {
        await interaction.deferReply({ ephemeral: true });

        const sessionId = interaction.options.getString('session_id', true).trim();

        await api.deleteSession(sessionId);

        return interaction.editReply({
          embeds: [
            okPanel(
              EMOJIS.SESSIONS,
              'Session Terminated',
              'The user has been logged out.',
              [f('🆔 Session', code(sessionId), false), f(`${EMOJIS.TAG} App`, code(appName)), f('Killed', '1')],
              `App: ${appName}`
            ),
          ],
        });
      }

      // ─── KILLALL ───────────────────────────────────────────────────────────
      if (subcommand === 'killall') {
        await interaction.deferReply({ ephemeral: true });

        const sessions = await api.getSessions(selectedAppId);

        if (!sessions || sessions.length === 0) {
          return interaction.editReply({ content: `${EMOJIS.INFO} No active sessions to kill for **${appName}**.` });
        }

        // Kill all sessions in parallel
        const results = await Promise.allSettled(
          sessions.map((s: any) => api.deleteSession(s.id))
        );

        const killed = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        return interaction.editReply({
          embeds: [
            errPanel(
              EMOJIS.SESSIONS,
              'All Sessions Terminated',
              'All users have been logged out from this application.',
              [f(`${EMOJIS.TAG} App`, code(appName)), f(`${EMOJIS.SUCCESS} Killed`, `${killed}`), f(failed > 0 ? `${EMOJIS.ERROR} Failed` : `${EMOJIS.STATS} Total`, failed > 0 ? `${failed}` : `${sessions.length}`)],
              `App: ${appName}`
            ),
          ],
        });
      }

    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred.';
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: `${EMOJIS.ERROR} **Error:** ${msg}` });
      }
      return interaction.reply({ content: `${EMOJIS.ERROR} **Error:** ${msg}`, ephemeral: true });
    }
  }
};
