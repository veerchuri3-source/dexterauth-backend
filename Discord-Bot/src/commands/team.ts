import { SlashCommandBuilder, ChatInputCommandInteraction, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { ApiService } from '../services/api';
import { db } from '../utils/db';
import { EMOJIS } from '../utils/emojis';
import { infoPanel, errText, f } from '../utils/embeds';

export const teamCommand = {
  data: new SlashCommandBuilder()
    .setName('team')
    .setDescription('View your team members and their roles.')
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('Display all team members with their roles and permissions.')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
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
      await interaction.deferReply({ ephemeral: true });

      const team = await api.getTeamMembers(selectedAppId);

      // team is an array from backend, or null/empty
      const members: any[] = Array.isArray(team) ? team : [];

      if (members.length === 0) {
        return interaction.editReply({
          content: `${EMOJIS.INFO} No team members registered for **${appName}**.\nYou can invite team members from the web dashboard.`
        });
      }

      const roleIcon = (role: string) => {
        const r = (role || '').toLowerCase();
        if (r === 'admin' || r === 'master_admin') return EMOJIS.CROWN;
        if (r === 'manager') return EMOJIS.SHIELD;
        if (r === 'reseller') return EMOJIS.STORE;
        return EMOJIS.USER;
      };

      const formatBalance = (m: any) => {
        const parts = [];
        if (m.balance_day) parts.push(`${m.balance_day}×Day`);
        if (m.balance_week) parts.push(`${m.balance_week}×Week`);
        if (m.balance_month) parts.push(`${m.balance_month}×Month`);
        if (m.balance_year) parts.push(`${m.balance_year}×Year`);
        if (m.balance_lifetime) parts.push(`${m.balance_lifetime}×Lifetime`);
        return parts.length > 0 ? parts.join(' · ') : 'No balance';
      };

      return interaction.editReply({
        embeds: [
          infoPanel(
            EMOJIS.TEAM,
            `Team — ${appName} (${members.length})`,
            undefined,
            members.slice(0, 10).map((m: any) => {
              const roleLabel = (m.role || 'Member').charAt(0).toUpperCase() + (m.role || 'Member').slice(1);
              const extra = [
                m.email ? `${EMOJIS.EMAIL} ${m.email}` : null,
                m.role?.toLowerCase() === 'reseller' ? `${EMOJIS.BALANCE} ${formatBalance(m)}${m.is_unlimited_reseller ? ` ${EMOJIS.UNLIMITED}` : ''}` : null,
                m.is_owner ? 'App Owner' : null,
              ].filter(Boolean).join(' · ');
              return f(`${roleIcon(m.role)} ${m.username || m.display_name || m.email || m.id} — ${roleLabel}`, extra || '—', false);
            }),
            'View-only via Discord Bot'
          ),
        ],
      });

    } catch (err: any) {
      const msg = err.message || 'An unexpected error occurred.';
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: `${EMOJIS.ERROR} **Error:** ${msg}` });
      }
      return interaction.reply({ content: `${EMOJIS.ERROR} **Error:** ${msg}`, ephemeral: true });
    }
  }
};
