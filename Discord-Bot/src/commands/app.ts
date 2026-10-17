import {
  SlashCommandBuilder, ChatInputCommandInteraction,
  AutocompleteInteraction, ApplicationIntegrationType, InteractionContextType
} from 'discord.js';
import { db } from '../utils/db';
import { ApiService } from '../services/api';
import { EMOJIS } from '../utils/emojis';
import { infoPanel, okPanel, errPanel, f, code } from '../utils/embeds';

export const appCommand = {
  data: new SlashCommandBuilder()
    .setName('app')
    .setDescription('Manage and switch between your DexterAuth applications.')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a new application. (Requires App Management permission)')
        .addStringOption(o => o.setName('name').setDescription('Application name').setRequired(true))
        .addStringOption(o => o.setName('version').setDescription('Initial version string (e.g. 1.0.0) — defaults to 1.0.0').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('switch')
        .setDescription('Select the active application for all bot commands.')
        .addStringOption(option =>
          option.setName('application')
            .setDescription('Name of the application to switch to')
            .setAutocomplete(true)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all applications available to you.')
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('View statistics and overview of the currently active application.')
    )
    .addSubcommand(sub =>
      sub.setName('snapshot')
        .setDescription('Full real-time snapshot: stats, settings, your role, and permissions.')
    )
    .addSubcommand(sub =>
      sub.setName('pause')
        .setDescription('Pause (disable) the active application — users cannot login while paused.')
    )
    .addSubcommand(sub =>
      sub.setName('resume')
        .setDescription('Resume (enable) the active application — users can login again.')
    ),

  async autocomplete(interaction: AutocompleteInteraction) {
    const secret = db.getUserSecret(interaction.user.id) || undefined;
    let responded = false;
    try {
      const api = new ApiService({ discordId: interaction.user.id, secret });
      const apps = await api.getApps();
      const focusedValue = interaction.options.getFocused().toLowerCase();
      const filtered = apps
        .filter((app: any) => app.name.toLowerCase().includes(focusedValue))
        .slice(0, 25)
        .map((app: any) => ({ name: app.name, value: app.id }));
      responded = true;
      await interaction.respond(filtered);
    } catch (err) {
      if (!responded) {
        try {
          await interaction.respond([]);
        } catch {}
      }
    }
  },

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const discordId = interaction.user.id;
    const secret = db.getUserSecret(discordId) || undefined;
    const api = new ApiService({ discordId, secret });

    try {
      // ─── CREATE ────────────────────────────────────────────────────────────
      if (subcommand === 'create') {
        await interaction.deferReply({ ephemeral: true });

        const name = interaction.options.getString('name', true).trim();
        const version = interaction.options.getString('version')?.trim() || '1.0.0';

        if (!/^\d+(\.\d+)*$/.test(version)) {
          return interaction.editReply({
            content: `${EMOJIS.ERROR} Invalid version format \`${version}\`. Must be numbers separated by dots, e.g. \`1.0.0\` or \`2.1\`.`
          });
        }

        const app = await api.createApp(name, version);

        return interaction.editReply({
          embeds: [
            okPanel(
              EMOJIS.SUCCESS,
              'Application Created',
              `Use \`/app switch\` to activate it.`,
              [
                f(`${EMOJIS.APP} Name`, code(app?.name || name)),
                f('🔢 Version', code(app?.version || version)),
                f('🆔 ID', code(app?.id || 'check dashboard'), false),
                f(`${EMOJIS.LICENSE} API Key`, app?.api_key ? `||${code(app.api_key)}||` : 'Dashboard', false),
              ],
              'DexterAuth Bot'
            ),
          ],
        });
      }

      // ─── SWITCH ────────────────────────────────────────────────────────────
      if (subcommand === 'switch') {
        const appId = interaction.options.getString('application', true);
        await interaction.deferReply({ ephemeral: true });

        const res = await api.selectApp(appId);
        const appName = res.data?.selected_app_name || appId;

        // Fetch app details + stats + fresh profile (real-time permissions) in parallel
        const [details, stats, freshProfile] = await Promise.allSettled([
          api.getAppById(appId),
          api.getOverview(appId),
          api.getDiscordProfile()
        ]);

        const appData = details.status === 'fulfilled' ? details.value : null;
        const statsData = stats.status === 'fulfilled' ? stats.value : null;
        const botProfile = freshProfile.status === 'fulfilled' ? freshProfile.value?.profile : null;

        // membership comes from getAppById (user_apps row for this user+app)
        const membership = appData?.membership;
        const effectiveRole = membership?.role || 'admin';

        return interaction.editReply({
          embeds: [
            okPanel(
              EMOJIS.SUCCESS,
              `Switched to: ${appName}${appData?.version ? ` v${appData.version}` : ''}`,
              `${appData?.status ? `${EMOJIS.ACTIVE} Active` : `${EMOJIS.INACTIVE} Disabled`} · ${formatRole(effectiveRole)}`,
              [
                f(`${EMOJIS.USER} Users`, `${statsData?.totalUsers ?? '—'}`),
                f(`${EMOJIS.LICENSE} Licenses`, `${statsData?.totalLicenses ?? '—'}`),
                f(`${EMOJIS.PLAN} Plans`, `${statsData?.totalSubscriptions ?? '—'}`),
                f(`${EMOJIS.ACTIVE} Sessions`, `${statsData?.activeSessions ?? '—'}`),
                ...buildRoleFields(effectiveRole, membership, botProfile),
              ],
              'All commands now execute under this application.'
            ),
          ],
        });
      }

      // ─── LIST ──────────────────────────────────────────────────────────────
      if (subcommand === 'list') {
        await interaction.deferReply({ ephemeral: true });

        const [apps, profileRes] = await Promise.all([
          api.getApps(),
          api.getDiscordProfile().catch(() => null)
        ]);
        const selectedAppId = profileRes?.profile?.selected_app_id;

        if (!apps || apps.length === 0) {
          return interaction.editReply({
            content: `${EMOJIS.ERROR} You have no applications. Create one with \`/app create\` or on the web dashboard.`
          });
        }

        return interaction.editReply({
          embeds: [
            infoPanel(
              EMOJIS.APP,
              `Your Applications (${apps.length})`,
              apps.map((app: any) => {
                const isSelected = app.id === selectedAppId;
                const statusDot = app.status ? EMOJIS.ACTIVE : EMOJIS.INACTIVE;
                const role = app.membership?.role || 'admin';
                return `${isSelected ? `${EMOJIS.ARROW} ` : ''}${statusDot} **${app.name}**${app.version ? ` \`v${app.version}\`` : ''} — ${formatRole(role)}\nID ${code(app.id)}`;
              }).join('\n\n'),
              undefined,
              `${EMOJIS.ARROW} = selected · Use /app switch to change`
            ),
          ],
        });
      }

      // ─── STATUS ────────────────────────────────────────────────────────────
      if (subcommand === 'status') {
        await interaction.deferReply({ ephemeral: true });

        const profileRes = await api.getDiscordProfile();
        const selectedAppId = profileRes?.profile?.selected_app_id;

        if (!selectedAppId) {
          const apps = await api.getApps().catch(() => []);
          if (!apps || apps.length === 0) {
            return interaction.editReply({ content: `${EMOJIS.ERROR} You have no applications. Create one with \`/app create\`.` });
          }
          return interaction.editReply({ content: `${EMOJIS.ERROR} No application selected. Use \`/app switch\` to set your active application.` });
        }

        const [apps, stats] = await Promise.all([
          api.getApps(),
          api.getOverview(selectedAppId)
        ]);

        const activeApp = apps.find((app: any) => app.id === selectedAppId);
        const appName = activeApp?.name || 'Unknown Application';

        return interaction.editReply({
          embeds: [
            infoPanel(
              EMOJIS.STATS,
              `Application Stats: ${appName}`,
              `Live overview · ${code(selectedAppId)}`,
              [
                f('Status', activeApp?.status ? `${EMOJIS.ACTIVE} Active` : `${EMOJIS.INACTIVE} Disabled`),
                f('Version', code(activeApp?.version ? `v${activeApp.version}` : 'N/A')),
                f('Licenses', `${stats?.totalLicenses ?? 0} (${stats?.unusedLicenses ?? 0} unused)`),
                f('Users', `${stats?.totalUsers ?? 0}`),
                f('Sessions', `${stats?.activeSessions ?? 0}`),
                f('Tokens', `${stats?.totalTokens ?? 0}`),
                f('Plans', `${stats?.totalSubscriptions ?? 0}`),
                f('Blacklisted', `${stats?.blacklistedHwids ?? stats?.blacklisted ?? 0}`),
              ],
              'DexterAuth Bot · Live data'
            ),
          ],
        });
      }

      // ─── SNAPSHOT ──────────────────────────────────────────────────────────
      if (subcommand === 'snapshot') {
        await interaction.deferReply({ ephemeral: true });

        const profileRes = await api.getDiscordProfile();
        const selectedAppId = profileRes?.profile?.selected_app_id;
        const botProfile = profileRes?.profile;

        if (!selectedAppId) {
          return interaction.editReply({ content: `${EMOJIS.ERROR} No application selected. Use \`/app switch\` first.` });
        }

        // Fetch all data in parallel — no caching, all real-time
        const [appDetails, stats, hashesResult] = await Promise.allSettled([
          api.getAppById(selectedAppId),
          api.getOverview(selectedAppId),
          api.getHashes(selectedAppId).catch(() => [] as any[])
        ]);

        const app = appDetails.status === 'fulfilled' ? appDetails.value : null;
        const statsData = stats.status === 'fulfilled' ? stats.value : null;
        const hashes = hashesResult.status === 'fulfilled' ? (hashesResult.value || []) : [];
        const membership = app?.membership;
        const effectiveRole = membership?.role || 'admin';

        const yn = (v: any) => v ? `${EMOJIS.SUCCESS}` : `${EMOJIS.ERROR}`;

        // Bot-level permissions (real-time from DB via getDiscordProfile)
        const botPerms = botProfile ? [
          botProfile.bot_can_view_overview ? `${EMOJIS.STATS} Overview` : null,
          botProfile.bot_can_manage_apps ? `${EMOJIS.APP} Apps` : null,
          botProfile.bot_can_manage_licenses ? `${EMOJIS.LICENSE} Licenses` : null,
          botProfile.bot_can_manage_users ? `${EMOJIS.USER} Users` : null,
          botProfile.bot_can_manage_subscriptions ? `${EMOJIS.PLAN} Subs` : null,
          botProfile.bot_can_manage_sessions ? `${EMOJIS.SESSIONS} Sessions` : null,
          botProfile.bot_can_manage_settings ? `${EMOJIS.SETTINGS} Settings` : null,
          botProfile.bot_can_view_team ? `${EMOJIS.TEAM} Team` : null
        ].filter(Boolean).join(' · ') || 'None' : '—';

        return interaction.editReply({
          embeds: [
            infoPanel(
              '📸',
              `Snapshot — ${app?.name || selectedAppId}`,
              `${app?.status ? `${EMOJIS.ACTIVE} Active` : `${EMOJIS.INACTIVE} Disabled`} · v${app?.version || '?'} · ${formatRole(effectiveRole)}`,
              [
                f('Users', `${statsData?.totalUsers ?? 0}`),
                f('Licenses', `${statsData?.totalLicenses ?? 0} (${statsData?.unusedLicenses ?? 0} unused)`),
                f('Sessions', `${statsData?.activeSessions ?? 0}`),
                f('Plans', `${statsData?.totalSubscriptions ?? 0}`),
                f('Tokens', `${statsData?.totalTokens ?? 0}`),
                f('Hashes', `${hashes.length}`),
                f('Force HWID', yn(app?.force_hwid)),
                f('Hash Check', yn(app?.hash_check)),
                f('Leaked PWDs', yn(app?.block_leaked_passwords)),
                f('Min Username', `${app?.min_username_length || 1}`),
                f(`${EMOJIS.BOT} Bot Perms`, botPerms, false),
                ...buildRoleFields(effectiveRole, membership, botProfile),
              ],
              `App ID: ${selectedAppId} · All data live, no cache`
            ),
          ],
        });
      }

      // ─── PAUSE ─────────────────────────────────────────────────────────────
      if (subcommand === 'pause') {
        await interaction.deferReply({ ephemeral: true });

        const profileRes = await api.getDiscordProfile();
        const selectedAppId = profileRes?.profile?.selected_app_id;
        const appName = profileRes?.profile?.selected_app_name || selectedAppId;

        if (!selectedAppId) {
          return interaction.editReply({ content: `${EMOJIS.ERROR} No application selected. Use \`/app switch\` first.` });
        }

        // GET current state first
        const appData = await api.getAppById(selectedAppId);
        if (appData?.status === false || appData?.status === 0) {
          return interaction.editReply({ content: `${EMOJIS.INFO} **${appName}** is already paused (disabled).` });
        }

        await api.updateAppSettings(selectedAppId, { status: 0 });

        return interaction.editReply({
          embeds: [
            errPanel(
              EMOJIS.INACTIVE,
              'Application Paused',
              'All user logins are now blocked. Use `/app resume` to re-enable.',
              [f(`${EMOJIS.APP} App`, code(appName)), f('Status', `${EMOJIS.INACTIVE} Disabled`)],
              `App: ${appName}`
            ),
          ],
        });
      }

      // ─── RESUME ────────────────────────────────────────────────────────────
      if (subcommand === 'resume') {
        await interaction.deferReply({ ephemeral: true });

        const profileRes = await api.getDiscordProfile();
        const selectedAppId = profileRes?.profile?.selected_app_id;
        const appName = profileRes?.profile?.selected_app_name || selectedAppId;

        if (!selectedAppId) {
          return interaction.editReply({ content: `${EMOJIS.ERROR} No application selected. Use \`/app switch\` first.` });
        }

        const appData = await api.getAppById(selectedAppId);
        if (appData?.status === true || appData?.status === 1) {
          return interaction.editReply({ content: `${EMOJIS.INFO} **${appName}** is already active (running).` });
        }

        await api.updateAppSettings(selectedAppId, { status: 1 });

        return interaction.editReply({
          embeds: [
            okPanel(
              EMOJIS.ACTIVE,
              'Application Resumed',
              'User logins are now enabled.',
              [f(`${EMOJIS.APP} App`, code(appName)), f('Status', `${EMOJIS.ACTIVE} Active`)],
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRole(role: string): string {
  const map: Record<string, string> = {
    admin: `${EMOJIS.CROWN} Admin (Owner)`,
    master_admin: `${EMOJIS.CROWN} Master Admin`,
    manager: `${EMOJIS.SHIELD} Manager`,
    reseller: `${EMOJIS.STORE} Reseller`
  };
  return map[role?.toLowerCase()] || role;
}

/**
 * Returns embed fields tailored to the user's effective role in the current app.
 * These are fetched fresh from DB on every switch/snapshot — no caching.
 */
function buildRoleFields(role: string, membership: any, botProfile: any): { name: string; value: string; inline: boolean }[] {
  const fields: { name: string; value: string; inline: boolean }[] = [];

  if (!membership) return fields;

  const r = (role || '').toLowerCase();

  if (r === 'reseller') {
    const isUnlimited = !!membership.is_unlimited_reseller;
    if (isUnlimited) {
      fields.push({ name: `${EMOJIS.UNLIMITED} Type`, value: 'Unlimited — no balance limits', inline: false });
    } else {
      // Show balance for each duration tier
      const balanceLines = [
        membership.balance_day ? `Daily: **${membership.balance_day}**` : null,
        membership.balance_week ? `Weekly: **${membership.balance_week}**` : null,
        membership.balance_month ? `Monthly: **${membership.balance_month}**` : null,
        membership.balance_three_month ? `3-Mo: **${membership.balance_three_month}**` : null,
        membership.balance_six_month ? `6-Mo: **${membership.balance_six_month}**` : null,
        membership.balance_year ? `Annual: **${membership.balance_year}**` : null,
        membership.balance_lifetime ? `Lifetime: **${membership.balance_lifetime}**` : null,
      ].filter(Boolean);

      const balanceText = balanceLines.length > 0 ? balanceLines.join(' · ') : 'No balance — contact admin';
      fields.push({ name: `${EMOJIS.BALANCE} License Balance`, value: balanceText, inline: false });

      // What resellers can do
      fields.push({
        name: '🔐 Permissions',
        value: `${EMOJIS.SUCCESS} View/generate licenses · view/edit own users\n${EMOJIS.ERROR} No manual user creation · no settings`,
        inline: false
      });
    }

    // Show allowed license levels if set
    if (membership.allowed_license_levels) {
      fields.push({ name: '🎯 Levels', value: `Level ${membership.allowed_license_levels}`, inline: true });
    }
  }

  if (r === 'manager') {
    // For managers, bot-level permissions are what controls access here since
    // requirePermission checks the permissions table fresh on every API call
    const perms = [
      botProfile?.bot_can_manage_licenses ? `${EMOJIS.SUCCESS} Licenses` : `${EMOJIS.ERROR} Licenses`,
      botProfile?.bot_can_manage_users ? `${EMOJIS.SUCCESS} Users` : `${EMOJIS.ERROR} Users`,
      botProfile?.bot_can_manage_subscriptions ? `${EMOJIS.SUCCESS} Subs` : `${EMOJIS.ERROR} Subs`,
      botProfile?.bot_can_manage_sessions ? `${EMOJIS.SUCCESS} Sessions` : `${EMOJIS.ERROR} Sessions`,
      botProfile?.bot_can_manage_settings ? `${EMOJIS.SUCCESS} Settings` : `${EMOJIS.ERROR} Settings`,
      botProfile?.bot_can_view_team ? `${EMOJIS.SUCCESS} Team` : `${EMOJIS.ERROR} Team`,
    ].join(' · ');

    fields.push({
      name: '🔐 Manager Permissions (Live)',
      value: perms || 'No specific permissions set',
      inline: false
    });
  }

  return fields;
}
