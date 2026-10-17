import { SlashCommandBuilder, ChatInputCommandInteraction, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { EMOJIS } from '../utils/emojis';
import { infoPanel } from '../utils/embeds';

export const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display the guide and list of all available slash commands for DexterAuth.')
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel),

  async execute(interaction: ChatInputCommandInteraction) {
    return interaction.reply({
      embeds: [
        infoPanel(
          EMOJIS.SHIELD,
          'DexterAuth Developer Command Guide',
          'Manage applications, licenses, users and settings — right from Discord.',
          [
            { name: `${EMOJIS.LOCK} 1 · Account`, value: '```\n/link [token]    - Link Discord to developer profile\n/unlink          - Unlink and delete your token\n```', inline: false },
            { name: `${EMOJIS.APP} 2 · Applications`, value: '```\n/app create      - New application\n/app switch      - Set active application\n/app list        - List your applications\n/app status      - Stats of active app\n/app snapshot    - Full settings snapshot\n/app pause       - Block user logins\n/app resume      - Allow user logins\n```', inline: false },
            { name: `${EMOJIS.LICENSE} 3 · Licenses`, value: '```\n/license generate - New license keys\n/license list    - Paginated key list\n/license ban     - Ban a key\n/license delete  - Delete a key\n```', inline: false },
            { name: `${EMOJIS.USER} 4 · Users`, value: '```\n/user create     - Manual user account\n/user view       - Details, stats, status\n/user update     - Password, level, status\n/user resethwid  - Reset HWID lock\n/user delete     - Delete permanently\n```', inline: false },
            { name: `${EMOJIS.SESSIONS} 5 · Sessions & Plans`, value: '```\n/session list    - Active login sessions\n/session kill    - Kill one session\n/session killall - Close all sessions\n/subscription list   - View plans\n/subscription create - New plan\n/subscription delete - Delete a plan\n```', inline: false },
            { name: `${EMOJIS.SETTINGS} 6 · Config & Team`, value: '```\n/settings view   - Security settings\n/settings update - Change settings\n/team view       - Developers & resellers\n```', inline: false },
            { name: `${EMOJIS.SHIELD} 7 · Legal`, value: '```\n/terms   - Terms of Service\n/privacy - Privacy Policy\n```', inline: false },
          ],
          'DexterAuth Bot Guide · All commands permission-enforced in real-time'
        ),
      ],
      ephemeral: true,
    });
  }
};
