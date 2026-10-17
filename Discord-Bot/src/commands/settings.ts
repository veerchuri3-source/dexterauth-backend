import { SlashCommandBuilder, ChatInputCommandInteraction, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { ApiService } from '../services/api';
import { db } from '../utils/db';
import { EMOJIS } from '../utils/emojis';
import { infoPanel, okPanel, errPanel, f, code } from '../utils/embeds';

export const settingsCommand = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('View and manage application settings, version, webhooks, and integrity hashes.')
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View current application settings, version, and webhook.')
    )
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Toggle application security settings.')
        .addStringOption(o =>
          o.setName('status').setDescription('Enable or disable the application').setRequired(false)
            .addChoices({ name: 'Active (Enabled)', value: 'active' }, { name: 'Disabled', value: 'disabled' })
        )
        .addStringOption(o =>
          o.setName('hash_check').setDescription('Require valid integrity hash on login').setRequired(false)
            .addChoices({ name: 'Enable', value: 'yes' }, { name: 'Disable', value: 'no' })
        )
        .addStringOption(o =>
          o.setName('force_hwid').setDescription('Require Hardware ID lock').setRequired(false)
            .addChoices({ name: 'Enable', value: 'yes' }, { name: 'Disable', value: 'no' })
        )
        .addStringOption(o =>
          o.setName('block_leaked_passwords').setDescription('Block commonly leaked passwords').setRequired(false)
            .addChoices({ name: 'Enable', value: 'yes' }, { name: 'Disable', value: 'no' })
        )
        .addIntegerOption(o =>
          o.setName('min_username_length').setDescription('Minimum username character length (1–32)').setMinValue(1).setMaxValue(32).setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('webhook')
        .setDescription('Set, test, or remove application Discord Webhook logging URL.')
        .addStringOption(o =>
          o.setName('action').setDescription('Webhook action').setRequired(true)
            .addChoices(
              { name: 'Set Webhook URL', value: 'set' },
              { name: 'Test Current Webhook', value: 'test' },
              { name: 'Remove Webhook URL', value: 'remove' }
            )
        )
        .addStringOption(o => o.setName('url').setDescription('Discord Webhook URL (required for set action)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('version')
        .setDescription('Update the required application version string.')
        .addStringOption(o => o.setName('new_version').setDescription('New version string, e.g. 1.0.1').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('hash-add')
        .setDescription('Add an integrity hash for file verification.')
        .addStringOption(o => o.setName('hash').setDescription('SHA256 or MD5 hash value').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('hash-list')
        .setDescription('List all registered integrity hashes.')
    )
    .addSubcommand(sub =>
      sub.setName('hash-delete')
        .setDescription('Remove a specific hash by its ID.')
        .addStringOption(o => o.setName('hash_id').setDescription('Hash ID to remove (from /settings hash-list)').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('hash-reset')
        .setDescription('Remove ALL integrity hashes for this application. (Admin only)')
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

    const yn = (v: any) => v ? `${EMOJIS.SUCCESS} On` : `${EMOJIS.ERROR} Off`;

    try {
      // ─── VIEW ──────────────────────────────────────────────────────────────
      if (subcommand === 'view') {
        await interaction.deferReply({ ephemeral: true });

        const app = await api.getAppById(selectedAppId);
        const hashes = await api.getHashes(selectedAppId).catch(() => []);

        return interaction.editReply({
          embeds: [
            infoPanel(
              EMOJIS.SETTINGS,
              `Settings — ${app?.name || appName}`,
              `Status: ${app?.status ? `${EMOJIS.ACTIVE} Active` : `${EMOJIS.INACTIVE} Disabled`} · Version ${code(app?.version || 'unset')}`,
              [
                f(`${EMOJIS.LOCK} Force HWID`, yn(app?.force_hwid)),
                f('🔍 Hash Check', yn(app?.hash_check)),
                f('🚫 Leaked PWDs', yn(app?.block_leaked_passwords)),
                f(`${EMOJIS.USER} Min Username`, `${app?.min_username_length || 1} chars`),
                f(`${EMOJIS.SHIELD} Hashes`, `${hashes.length} registered`),
                f('🔔 Webhook', app?.discord_webhook ? code(String(app.discord_webhook).slice(0, 40) + '…') : 'Not configured', false),
              ],
              `App ID: ${selectedAppId}`
            ),
          ],
        });
      }

      // ─── WEBHOOK ───────────────────────────────────────────────────────────
      if (subcommand === 'webhook') {
        await interaction.deferReply({ ephemeral: true });

        const action = interaction.options.getString('action', true);
        const urlInput = interaction.options.getString('url')?.trim();

        if (action === 'set') {
          if (!urlInput || !urlInput.startsWith('http')) {
            return interaction.editReply({
              content: `${EMOJIS.ERROR} Please provide a valid Discord Webhook URL starting with \`https://discord.com/api/webhooks/...\`.`
            });
          }

          await api.updateAppSettings(selectedAppId, { discord_webhook: urlInput });

          return interaction.editReply({
            embeds: [
              okPanel(
                '🔔',
                'Discord Webhook Configured',
                `Logs for **${appName}** now post to your channel (generations, deletions, bans, resets, updates).`,
                [f('URL', code(urlInput.slice(0, 50) + '…'), false)],
                'Use /settings webhook action:Test to send a test message.'
              ),
            ],
          });
        }

        if (action === 'test') {
          const result: any = await api.testWebhook(selectedAppId, urlInput || undefined);
          const delivered = result?.data?.delivered ?? result?.delivered;
          if (delivered) {
            return interaction.editReply({
              content: `${EMOJIS.SUCCESS} **Webhook test message sent!** Check your Discord channel to verify delivery.`
            });
          }
          return interaction.editReply({
            content: `${EMOJIS.INFO} Webhook test simulated — no webhook URL is configured for **${appName}** (nothing was delivered). Use \`/settings webhook action:Set\` first.`
          });
        }

        if (action === 'remove') {
          await api.updateAppSettings(selectedAppId, { discord_webhook: null });
          return interaction.editReply({
            content: `${EMOJIS.SUCCESS} Discord Webhook URL removed for **${appName}**.`
          });
        }
      }

      // ─── SET ───────────────────────────────────────────────────────────────
      if (subcommand === 'set') {
        await interaction.deferReply({ ephemeral: true });

        const payload: any = {};
        const statusOpt = interaction.options.getString('status');
        const hashCheckOpt = interaction.options.getString('hash_check');
        const forceHwidOpt = interaction.options.getString('force_hwid');
        const blockLeakedOpt = interaction.options.getString('block_leaked_passwords');
        const minUsernameOpt = interaction.options.getInteger('min_username_length');

        if (statusOpt) payload.status = statusOpt === 'active' ? 1 : 0;
        if (hashCheckOpt) payload.hash_check = hashCheckOpt === 'yes' ? 1 : 0;
        if (forceHwidOpt) payload.force_hwid = forceHwidOpt === 'yes' ? 1 : 0;
        if (blockLeakedOpt) payload.block_leaked_passwords = blockLeakedOpt === 'yes' ? 1 : 0;
        if (minUsernameOpt !== null && minUsernameOpt !== undefined) payload.min_username_length = minUsernameOpt;

        if (Object.keys(payload).length === 0) {
          return interaction.editReply({ content: `${EMOJIS.INFO} No settings were specified. Nothing changed.` });
        }

        await api.updateAppSettings(selectedAppId, payload);

        const labels: Record<string, string> = {
          status: `${EMOJIS.STATS} Status`, hash_check: '🔍 Hash Check',
          force_hwid: `${EMOJIS.LOCK} Force HWID`, block_leaked_passwords: '🚫 Leaked Passwords',
          min_username_length: '📏 Min Username',
        };
        const changed = Object.entries(payload).map(([k, v]) => {
          let display = String(v);
          if (k === 'status') display = v === 1 ? 'Active' : 'Disabled';
          else if (k === 'min_username_length') display = `${v} chars`;
          else display = v === 1 ? 'Enabled' : 'Disabled';
          return `${labels[k] || k}: **${display}**`;
        }).join('\n');

        return interaction.editReply({
          embeds: [okPanel(EMOJIS.SETTINGS, `Settings Updated — ${appName}`, changed, undefined, `App: ${appName}`)],
        });
      }

      // ─── VERSION ───────────────────────────────────────────────────────────
      if (subcommand === 'version') {
        await interaction.deferReply({ ephemeral: true });

        const newVersion = interaction.options.getString('new_version', true).trim();

        if (!/^\d+(\.\d+)*$/.test(newVersion)) {
          return interaction.editReply({
            content: `${EMOJIS.ERROR} Invalid version format \`${newVersion}\`.\nMust be numbers separated by dots, e.g. \`1.0.0\` or \`2.1\`.`
          });
        }

        await api.updateAppSettings(selectedAppId, { version: newVersion });

        return interaction.editReply({
          embeds: [
            okPanel(
              '🔢',
              'Version Updated',
              'Users must update on next login.',
              [f(`${EMOJIS.TAG} App`, code(appName)), f('🆕 Version', code(newVersion))],
              `App: ${appName}`
            ),
          ],
        });
      }

      // ─── HASH-ADD ──────────────────────────────────────────────────────────
      if (subcommand === 'hash-add') {
        await interaction.deferReply({ ephemeral: true });

        const hashValue = interaction.options.getString('hash', true).trim();
        const result = await api.addHash(selectedAppId, hashValue);

        return interaction.editReply({
          embeds: [
            okPanel(
              EMOJIS.SUCCESS,
              'Integrity Hash Added',
              undefined,
              [f('🔐 Hash', code(hashValue), false), f(`${EMOJIS.TAG} App`, code(appName)), f('🆔 ID', code(result?.id || 'N/A'))],
              'Use /settings hash-list to see all registered hashes.'
            ),
          ],
        });
      }

      // ─── HASH-LIST ─────────────────────────────────────────────────────────
      if (subcommand === 'hash-list') {
        await interaction.deferReply({ ephemeral: true });

        const hashes = await api.getHashes(selectedAppId);

        if (!hashes || hashes.length === 0) {
          return interaction.editReply({ content: `${EMOJIS.INFO} No integrity hashes registered for **${appName}**.` });
        }

        return interaction.editReply({
          embeds: [
            infoPanel(
              EMOJIS.SHIELD,
              `Integrity Hashes — ${appName} (${hashes.length})`,
              hashes.map((h: any, i: number) => `**${i + 1}.** ${code(h.hash_value || h.hash)}\nID ${code(h.id)}`).join('\n\n'),
              undefined,
              'Use an ID with /settings hash-delete'
            ),
          ],
        });
      }

      // ─── HASH-DELETE ───────────────────────────────────────────────────────
      if (subcommand === 'hash-delete') {
        await interaction.deferReply({ ephemeral: true });

        const hashId = interaction.options.getString('hash_id', true).trim();
        await api.deleteHash(selectedAppId, hashId);

        return interaction.editReply({
          embeds: [
            errPanel(
              EMOJIS.TRASH,
              'Hash Removed',
              undefined,
              [f('🆔 ID', code(hashId)), f(`${EMOJIS.TAG} App`, code(appName))],
              `App: ${appName}`
            ),
          ],
        });
      }

      // ─── HASH-RESET ────────────────────────────────────────────────────────
      if (subcommand === 'hash-reset') {
        await interaction.deferReply({ ephemeral: true });

        const hashes = await api.getHashes(selectedAppId);
        const count = hashes?.length || 0;

        await api.resetHashes(selectedAppId);

        return interaction.editReply({
          embeds: [
            errPanel(
              EMOJIS.TRASH,
              'All Hashes Reset',
              'Hash checks disabled until new hashes are added.',
              [f(`${EMOJIS.TAG} App`, code(appName)), f('Removed', `${count}`)],
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
