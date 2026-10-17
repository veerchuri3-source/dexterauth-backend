export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface ParamDef {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example: string;
}

export interface CodeSample {
  language: string;
  code: string;
}

export interface EndpointResponse {
  status: number;
  label: string;
  body: string;
}

export interface DocsNode {
  id: string;
  title: string;
  type: 'folder' | 'endpoint' | 'markdown';
}

export interface DocsFolder extends DocsNode {
  type: 'folder';
  children: (DocsFolder | DocsEndpoint | DocsMarkdown)[];
}

export interface DocsMarkdown extends DocsNode {
  type: 'markdown';
  content: string; // Could be HTML or markdown
}

export interface DocsEndpoint extends DocsNode {
  type: 'endpoint';
  method: HttpMethod;
  url: string;
  description: string;
  infoAlert?: string;
  queryParams?: ParamDef[];
  bodyParams?: ParamDef[];
  codeSamples?: CodeSample[];
  responses?: EndpointResponse[];
}

// Helper to find a node by path (e.g. ['api', 'getting-started', 'license'])
export const findDocsNode = (tree: (DocsFolder | DocsEndpoint | DocsMarkdown)[], path: string[]): DocsFolder | DocsEndpoint | DocsMarkdown | undefined => {
  if (path.length === 0) return undefined;
  const currentId = path[0];
  const node = tree.find(n => n.id === currentId);
  
  if (!node) return undefined;
  
  if (path.length === 1) return node;
  
  if (node.type === 'folder') {
    return findDocsNode(node.children, path.slice(1));
  }
  
  return undefined;
};

export interface FlatDocsNode {
  path: string;
  title: string;
}

export const getFlatDocsNodes = (tree: (DocsFolder | DocsEndpoint | DocsMarkdown)[], currentPath: string = ''): FlatDocsNode[] => {
  let flatList: FlatDocsNode[] = [];
  for (const node of tree) {
    const path = currentPath ? `${currentPath}/${node.id}` : node.id;
    if (node.type === 'folder') {
      flatList = flatList.concat(getFlatDocsNodes(node.children, path));
    } else {
      flatList.push({ path, title: node.title });
    }
  }
  return flatList;
};

const COMMON_RESPONSES: EndpointResponse[] = [
  { status: 200, label: "Success", body: '{\n    "status": "success",\n    "message": "Operation completed"\n}' },
  { status: 400, label: "Failure", body: '{\n    "status": "fail",\n    "message": "Invalid application details"\n}' }
];

export const docsTree: (DocsFolder | DocsEndpoint | DocsMarkdown)[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    type: 'folder',
    children: [
      { id: 'introduction', title: 'Introduction', type: 'markdown', content: `
# Authentication and Software Licensing
Secure, scalable, and game-changing authentication for your applications. Get started in minutes with our powerful hosted APIs and SDKs.

### What is Dexter Auth?
Dexter Auth is an advanced authentication platform built for native C++, C#, and ImGui applications requiring strict hardware binding.
Once integrated, Dexter Auth securely manages and stores the information of each user registered to use your software.

*Note: Dexter Auth strictly handles authentication and anti-tamper signature verification. You are still responsible for the obfuscation and binary packing of your overall application.*

### Why use Dexter Auth?
Dexter Auth provides identical or superior cryptographic security, instant deployment, and comprehensive reseller management infrastructure compared to legacy paid providers. Our mission is to reduce developer integration time and eliminate subscription overhead entirely, allowing you to focus on building your software.
      ` },
      { id: 'quick-start', title: 'Quick Start', type: 'markdown', content: `
# Quick Start
Follow these steps to integrate Dexter Auth into your software.

### 1. Create an Account
To begin using the Dexter Auth platform, you need a developer account.
1. Navigate to the **Register** page on our dashboard.
2. Create your account and verify your email.
3. Log in to access the central dashboard.

### 2. Create an Application
Applications are the backbone of the Dexter Auth service. Every piece of software you distribute must have an associated Application on the dashboard.
1. From the dashboard sidebar, select **Applications**.
2. Click **Create Application**.
3. Provide a name and description for your software.
4. Configure your preferred hardware binding (HWID) method and anti-tamper settings.

### 3. Obtain API Credentials
Once your application is created, you must retrieve its unique credentials to initialize the SDK in your software.
1. Click on your newly created Application to view its details.
2. Locate the **Application Settings** or **Credentials** panel.
3. Copy the \`API Key\` and \`Client Secret\`.

> [!CAUTION]
> **Keep your Client Secret safe!** Your Client Secret is used to cryptographically sign requests and verify the integrity of your software. Never expose it in plaintext or share it publicly. Ensure your final binary is heavily obfuscated.

### 4. Integrate the SDK
Download the appropriate SDK for your programming language (C++, C#, Python) from the dashboard and initialize it using your \`API Key\` and \`Client Secret\`. See the SDK documentation sections for detailed code examples.
      ` },
      { id: 'security-rate-limits', title: 'Security & Rate Limits', type: 'markdown', content: `
# Security & Rate Limits

Dexter Auth operates with strict rate limiting policies and anti-tamper mechanisms to ensure maximum stability and prevent brute-force or abuse attacks against your applications.

> [!WARNING]
> **Strict API Rate Limit Policy**
> To protect your software and our infrastructure, the API strictly enforces a maximum limit of **30 requests per 30 seconds** (30s / 30r) per IP address across all endpoints.

### Why 30 requests per 30 seconds?
This strict threshold is an enterprise-grade security feature that guarantees:
- **Brute Force Prevention:** Prevents attackers from rapidly guessing your users' passwords, licenses, or HWID combinations.
- **DDoS Mitigation:** Halts malicious traffic spikes instantly, ensuring your application's authentication remains online for legitimate users.
- **Credential Stuffing Defense:** Makes automated credential stuffing attacks mathematically unviable.

If a client (e.g., a malicious user running a bot) exceeds this limit, the API will return a \`429 Too Many Requests\` error and temporarily throttle their IP for the remainder of the 30-second window.

### Anti-Tamper Mechanisms
Dexter Auth employs a dual-mode anti-tamper system directly at the SDK level to prevent reverse engineering and unauthorized network replays of your software.

**Mode 1 — Secure (Recommended)**
In Secure Mode, your application's \`client_secret\` is embedded in the compiled binary. Binaries should be obfuscated using tools like PyArmor, VMProtect, or Nuitka.
Every login and registration request computes:
- **Hash:** SHA-256 checksum of your running executable.
- **Timestamp:** Current Unix time (5-minute expiry window).
- **Nonce:** A single-use 32-hex cryptographic random string (prevents replay attacks).
- **Signature:** HMAC-SHA256 signature of the combined string using your \`client_secret\`.

**Mode 2 — Off**
If you omit the \`client_secret\` in your SDK initialization, the backend operates in permissive mode. Network replay and hash tampering are not prevented. Use this strictly during local development before production release.
      ` },
      { id: 'premade-examples', title: 'Premade Examples - SDKs', type: 'markdown', content: `
# Official SDKs
We provide official, production-ready SDKs to integrate Dexter Auth seamlessly into your application.

### Available SDKs
- Python SDK: Includes anti-debugging (sys.gettrace), multi-OS HWID generation (Windows WMI, Linux /etc/machine-id, macOS IOPlatformSerialNumber), and HMAC signing.
- C++ / ImGui SDK: High-performance, memory-safe implementation for native applications and low-level software.
- C# / .NET SDK: Full integration for WPF, WinForms, and native Windows applications.

Explore the \`/Sdk\` directory in our repository or download them directly from your application's dashboard.
      ` },
      { id: 'qna', title: 'QnA', type: 'markdown', content: `
# Frequently Asked Questions

### Does a password reset log out an attacker?
Yes. When a user requests a password reset via the \`/forgot\` endpoint, the system automatically revokes all existing 24-hour opaque session tokens associated with that account.

### What happens if a user is banned?
Banning a user immediately revokes their active sessions and updates their database status to Banned. The client SDK continuously monitors session validity via a background thread and will terminate the application immediately if the session drops.

### Can attackers bypass the HWID lock by padding the hash?
No. Dexter Auth employs a strict pre-hashing mechanism (SHA-256) on the raw HWID string before utilizing bcrypt. This guarantees that long composite HWIDs are uniquely and securely validated.

### How does the system prevent automated bot registrations?
The registration API enforces a global rate limit. Additionally, frontend web registrations are protected by Cloudflare Turnstile CAPTCHA.
      ` }
    ]
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    type: 'folder',
    children: [
      { id: 'manage-applications', title: 'Manage Applications', type: 'markdown', content: `
# Manage Applications
To start using Dexter Auth, an Application must first be created.

1. Navigate to the Dashboard Home.
2. Click Create Application.
3. Provide a Name. The system automatically generates a unique \`App ID\` and a cryptographic \`Client Secret\`.

**Important:** The \`Client Secret\` must never be exposed in plaintext. It must be embedded securely inside the compiled binary when utilizing Mode 1 (Secure Mode).
      ` },
      { id: 'global-navigation', title: 'Global Tabs', type: 'folder', children: [
          { id: 'team', title: 'Team', type: 'markdown', content: `
# Team Management
The Team tab provides comprehensive Role-Based Access Control (RBAC) to facilitate collaboration. It is a root-level tab visible to application owners, and operates globally (outside the scope of any single application).

### Key Features
- **Invite Members:** Add Resellers or Managers to your team by specifying their username/email, application role, and duration limits.
- **App Access:** Assign specific application access to team members to restrict which projects they can see or manage.
- **Reseller Balance Constraints:** Allocate license generation limitations to resellers based on key duration (e.g., set specific limits on generating Lifetime keys vs. Daily keys).
- **Access Revocation:** Instantly revoke or modify team privileges, key level permissions, or reseller balances at any time.
          ` },
          { id: 'profile', title: 'Profile', type: 'markdown', content: `
# My Profile
The Profile tab allows all dashboard users (Admins, Managers, and Resellers) to manage their personal account settings and identity.

### Capabilities
- **Update Identity:** Modify your Display Name, Username, Bio, and Avatar / Banner URLs.
- **Change Credentials:** Update your registered Email and Password securely.
- **Badges:** View your earned platform badges and roles.
- **Delete Account:** Permanently delete your dashboard profile. Note that this action is irreversible and will delete all associated applications, users, and licenses.
          ` },
          { id: 'balances', title: 'My Balances', type: 'markdown', content: `
# License Balances
The Balances tab is a root-level view specifically for non-admin Resellers to monitor their remaining license key generation quotas.

### Key Metrics
- **Quotas by Duration:** Track remaining key balances allocated to you by the project owner across specific durations (1-day, 7-day, 30-day, 90-day, 180-day, 365-day, and Lifetime keys).
- **Restock Requests:** Quotas must be restocked by the project owner via the Team tab.
          ` },
      ]},
      { id: 'app', title: 'Application Tabs', type: 'folder', children: [
          { id: 'overview', title: 'Overview', type: 'markdown', content: `
# App Overview
The Overview tab serves as the default landing page once an application is selected, providing real-time telemetry and a high-level summary of your project's health and statistics.

### Key Metrics
- **Statistical Widgets:** View Total Users, Total Licenses, Used/Unused License splits, Active Sessions, Active API Tokens, and Subscriptions.
- **System Health:** Monitor real-time indicators for the Authentication API, Database Nodes, and License Verification systems.
- **Client Integration Snippets:** Instantly access pre-configured initialization code blocks in C++ or Python to integrate the SDK into your software.
          ` },
          { id: 'licenses', title: 'Licenses', type: 'markdown', content: `
# Managing Licenses
Licenses serve as the primary entry point for user registration. A valid license key is strictly required for users to register an account.

### Key Generation Parameters
- **License Mask:** A custom format string to dictate the structure of the key (e.g., \`DEXTER-XXXX-XXXX\`).
- **Amount:** Number of keys to generate.
- **License Expiry:** Validity length (Days, Weeks, Months, Lifetime).
- **Subscription Level:** The access tier assigned to the user upon registration.
- **Lowercase / Uppercase:** Toggles to restrict the generated key character casing.
- **License Note:** Add an internal note (e.g. "Discord Giveaway Keys").

### Bulk Actions
You can select multiple licenses or use the global dropdown to:
- Copy Selected or Export All to a file.
- Add Time to Unused licenses.
- Delete All Used or Delete All Unused licenses.

**Important:** Once a license is utilized for registration, it is permanently bound to that account and cannot be reused.
          ` },
          { id: 'users', title: 'Users', type: 'markdown', content: `
# User Management
The Users tab provides complete oversight over every account registered to the application.

### Key Features
- **View HWIDs:** Inspect the Hardware ID bound to a specific user.
- **Reset HWID:** Permits the user to bind their next login to a new machine.
- **Ban or Pause:** Instantly ban or pause a user. You must specify a ban reason and duration. A banned user's active session tokens are immediately wiped.
- **Edit User:** Adjust subscription tiers or manually modify expiration dates.

### Bulk Actions
- **Global Reset HWIDs:** Clear all hardware bindings across the entire application.
- **Add/Subtract Bulk Time:** Modify expiration dates for all active users simultaneously.
- **Import / Export:** Seamlessly export all users to a file, or import new users via CSV/JSON formats.
          ` },
          { id: 'tokens', title: 'Tokens', type: 'markdown', content: `
# API Tokens
If you need to programmatically interact with your application's backend from an external server (e.g., a Discord Bot or a custom integration), you can generate Standalone API Tokens.

Unlike User Session Tokens, which expire in 24 hours, Standalone API Tokens are permanent until manually deleted or revoked from this panel.

### Token Actions
- **Delete:** Permanently remove an individual token.
- **Bulk Delete:** Select and remove multiple tokens simultaneously.
- **Ban / Unban:** Temporarily suspend or reinstate a standalone API token.
          ` },
          { id: 'subscriptions', title: 'Subscriptions', type: 'markdown', content: `
# Subscription Tiers
By default, all applications operate with a \`Default\` subscription tier.

Custom tiers (e.g., \`VIP\`, \`Basic\`, \`Admin\`) can be created to restrict specific features within the client application based on the user's assigned tier.

### Managing Tiers
- **Create:** Dynamically generate new subscription tiers for your application.
- **Update:** Modify the name or assignment level of an existing tier.
- **Delete:** Permanently remove a subscription tier from the system.

When validating a user's login, the API returns their \`subscription_level\`. The client application can utilize this payload to dynamically enable or disable features.
          ` },
          { id: 'sessions', title: 'Sessions', type: 'markdown', content: `
# Session Management
Dexter Auth generates a 128-bit opaque session token upon login. This token eliminates the need to transmit the username and password on every request.

### Session Lifecycle
| Action | Outcome |
| :--- | :--- |
| **Duration** | Valid for exactly 24 hours |
| **Logout** | Session destroyed immediately |
| **Ban/Reset** | All active sessions wiped |

### Manual Termination
- **Kill Session:** Instantly terminate an individual user's active session.
- **Kill All Active Sessions:** A global kill-switch that instantly invalidates every active session across your entire application.

Session tokens are stored in memory and must not be logged or written to disk.
          ` },
          { id: 'team-chat', title: 'Team Chat', type: 'markdown', content: `
# Team Chat
The Team Chat tab offers an integrated live chat functionality.

This feature allows real-time communication and collaboration among all team members and resellers assigned to the specific application, directly inside the dashboard.
          ` },
          { id: 'settings', title: 'Settings', type: 'markdown', content: `
# App Configuration
Enforce global application rules and integrations from the configuration panel.

### Global Rules
- **App Status:** A boolean toggle (Enabled/Disabled) that strictly rejects all logins when disabled.
- **HWID Constraints:** Enforce hardware binding with toggles like \`HWID Lock\`, \`Force HWID\`, set a \`Minimum HWID Length\`, and define a \`HWID Reset Cooldown\`.
- **Network Security:** Toggle \`Block VPNs\` to restrict known proxy IPs, and \`Log IP Addresses\` to trace origins.
- **Validation Rules:** Set a \`Minimum Username Length\` and enforce \`Block Leaked Passwords\` using known breach databases.
- **Token Validation Strategy:** Configure how frequently user sessions are validated for security.
- **Login Cooldowns:** Enforce wait times between successive login attempts to prevent brute-forcing.
- **Anti-Debugger:** Enforce mandatory debugger checks in the client SDK.

### Integrations & Webhooks
- **Customer Panel Configurations:** Set up your \`Webloader Link\`, \`Auto-Update Link\`, \`Customer Panel Icon\`, and \`Theme Color\`.
- **Discord Webhook Integration:** Seamlessly forward application events to your Discord server.

### Hash Management
Dexter Auth utilizes a Trust-On-First-Use (TOFU) security model for application hashes.
The very first valid hash received by the server is automatically whitelisted. 
**Important:** Whenever you compile a new update or patch, you must manually use the "Reset All Hashes" button in this UI for the backend to properly recognize and auto-learn your new build's hash.
          ` },
      ]},
    ]
  },
  {
    id: 'api',
    title: 'API',
    type: 'folder',
    children: [
      { id: 'getting-started', title: 'Getting Started', type: 'folder', children: [
        {
          id: 'initialization',
          title: 'Initialization',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/init',
          description: 'Initialize the application before making any other requests. Required to fetch the app status, update links, and verify the client secret.',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' },
            { name: 'name', type: 'string', required: true, description: 'The name of the application', example: 'MyApp' },
            { name: 'version', type: 'string', required: true, description: 'App version', example: '1.0' },
            { name: 'secret', type: 'string', required: true, description: 'App secret', example: 'YOUR_SECRET' },
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/init \\\n  -H "Content-Type: application/json" \\\n  -d \'{\n    "app_id": "YOUR_APP_ID",\n    "name": "MyApp",\n    "version": "1.0",\n    "secret": "YOUR_SECRET"\n  }\'' }
          ],
          responses: COMMON_RESPONSES
        },
        {
          id: 'register',
          title: 'Register',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/register',
          description: 'Register a new user using a valid license key.',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' },
            { name: 'username', type: 'string', required: true, description: 'Username', example: 'newuser' },
            { name: 'email', type: 'string', required: true, description: 'Email address', example: 'test@test.com' },
            { name: 'password', type: 'string', required: true, description: 'Password', example: 'pass123' },
            { name: 'license_key', type: 'string', required: true, description: 'License key', example: 'XXXX-XXXX-XXXX' },
            { name: 'hwid', type: 'string', required: true, description: 'Hardware ID', example: 'HWID123' },
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/register -d \'{"app_id":"...", "username":"...", "password":"...", "license_key":"...", "hwid":"..."}\' -H "Content-Type: application/json"' }
          ],
          responses: COMMON_RESPONSES
        },
        {
          id: 'login',
          title: 'Login (user/pass)',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/login',
          description: 'Login an existing user with username and password. Verifies HWID if bound.',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' },
            { name: 'username', type: 'string', required: true, description: 'Username', example: 'johndoe' },
            { name: 'password', type: 'string', required: true, description: 'Password', example: 'pass123' },
            { name: 'hwid', type: 'string', required: false, description: 'Hardware ID of the user', example: 'HWID123' },
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/login -d \'{"app_id":"...", "username":"...", "password":"...", "hwid":"..."}\' -H "Content-Type: application/json"' }
          ],
          responses: COMMON_RESPONSES
        },
        {
          id: 'login-email',
          title: 'Login (email/pass)',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/web-login',
          description: 'Login using email and password instead of username. Does not check HWID (Web flow).',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' },
            { name: 'username', type: 'string', required: true, description: 'Email address', example: 'test@test.com' },
            { name: 'password', type: 'string', required: true, description: 'Password', example: 'pass123' },
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/web-login -d \'{"app_id":"...", "username":"test@test.com", "password":"..."}\' -H "Content-Type: application/json"' }
          ],
          responses: COMMON_RESPONSES
        },
      ]},
      
      { id: 'account', title: 'Account Management', type: 'folder', children: [
        {
          id: 'upgrade',
          title: 'Upgrade Account',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/upgrade',
          description: 'Upgrade an existing account using a new license key to extend time or upgrade tiers.',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' },
            { name: 'username', type: 'string', required: true, description: 'Username', example: 'user' },
            { name: 'license_key', type: 'string', required: true, description: 'License key', example: 'XXXX-XXXX-XXXX' },
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/upgrade -d \'{"app_id":"...", "username":"...", "license_key":"..."}\' -H "Content-Type: application/json"' }
          ],
          responses: COMMON_RESPONSES
        },
        {
          id: 'change-username',
          title: 'Change Username',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/change-username',
          description: 'Change the username of an existing account.',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' },
            { name: 'session_token', type: 'string', required: true, description: 'Active session token', example: 'TOKEN123' },
            { name: 'new_username', type: 'string', required: true, description: 'New username', example: 'new_user' },
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/change-username -d \'{"app_id":"...", "session_token":"...", "new_username":"..."}\' -H "Content-Type: application/json"' }
          ],
          responses: COMMON_RESPONSES
        },
        {
          id: 'forgot-password',
          title: 'Forgot Password',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/forgot',
          description: 'Reset a forgotten password. The request MUST be made from the hardware ID (HWID) currently bound to the account.',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' },
            { name: 'username', type: 'string', required: true, description: 'Target username', example: 'user' },
            { name: 'hwid', type: 'string', required: true, description: 'Hardware ID currently bound', example: 'HWID123' },
            { name: 'new_password', type: 'string', required: true, description: 'The new password', example: 'newpass' },
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/forgot -d \'{"app_id":"...", "username":"...", "hwid":"...", "new_password":"..."}\' -H "Content-Type: application/json"' }
          ],
          responses: COMMON_RESPONSES
        },
      ]},

      { id: 'session', title: 'Session & Auth', type: 'folder', children: [
        {
          id: 'verify-session',
          title: 'Verify Session',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/verify-session',
          description: 'Verify if a session token is still valid and active.',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' },
            { name: 'token', type: 'string', required: true, description: 'Session token to verify', example: 'TOKEN123' },
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/verify-session -d \'{"app_id":"...", "token":"..."}\' -H "Content-Type: application/json"' }
          ],
          responses: COMMON_RESPONSES
        },
        {
          id: 'verify-token',
          title: 'Verify Standalone Token',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/verify-token',
          description: 'Verify a standalone API token generated from the dashboard.',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' },
            { name: 'token', type: 'string', required: true, description: 'The API token', example: 'TOKEN123' },
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/verify-token -d \'{"app_id":"...", "token":"..."}\' -H "Content-Type: application/json"' }
          ],
          responses: COMMON_RESPONSES
        },
        {
          id: 'logout',
          title: 'Logout',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/logout',
          description: 'Logout the user and destroy the active session token.',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' },
            { name: 'session_token', type: 'string', required: true, description: 'Session token', example: 'TOKEN123' },
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/logout -d \'{"app_id":"...", "session_token":"..."}\' -H "Content-Type: application/json"' }
          ],
          responses: COMMON_RESPONSES
        },
      ]},
      
      { id: 'chat', title: 'Chat / Comms', type: 'folder', children: [
        {
          id: 'chat-retrieve',
          title: 'Retrieve Messages',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/chat/retrieve',
          description: 'Retrieve the latest messages from a specific global or application-bound chat channel.',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' },
            { name: 'session_token', type: 'string', required: true, description: 'Valid session token', example: 'TOKEN123' },
            { name: 'channel', type: 'string', required: true, description: 'Channel name', example: 'general' }
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/chat/retrieve -d \'{"app_id":"...", "session_token":"...", "channel":"general"}\' -H "Content-Type: application/json"' }
          ],
          responses: COMMON_RESPONSES
        },
        {
          id: 'chat-send',
          title: 'Send Message',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/chat/send',
          description: 'Send a new message to a chat channel.',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' },
            { name: 'session_token', type: 'string', required: true, description: 'Valid session token', example: 'TOKEN123' },
            { name: 'channel', type: 'string', required: true, description: 'Channel name', example: 'general' },
            { name: 'message', type: 'string', required: true, description: 'The message content', example: 'Hello world' }
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/chat/send -d \'{"app_id":"...", "session_token":"...", "channel":"general", "message":"..."}\' -H "Content-Type: application/json"' }
          ],
          responses: COMMON_RESPONSES
        }
      ]},

      { id: 'variables', title: 'Variables', type: 'folder', children: [
        {
          id: 'global-vars',
          title: 'Get Global App Variables',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/vars/global',
          description: 'Fetch secure global variables defined in your dashboard (e.g., offsets, update links, config).',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' },
            { name: 'session_token', type: 'string', required: true, description: 'Valid session token', example: 'TOKEN123' }
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/vars/global -d \'{"app_id":"...", "session_token":"..."}\' -H "Content-Type: application/json"' }
          ],
          responses: COMMON_RESPONSES
        },
        {
          id: 'user-vars-get',
          title: 'Get User Variables',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/vars/user/get',
          description: 'Retrieve custom variable states stored specifically for this user (e.g., saved configs).',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' },
            { name: 'session_token', type: 'string', required: true, description: 'Valid session token', example: 'TOKEN123' }
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/vars/user/get -d \'{"app_id":"...", "session_token":"..."}\' -H "Content-Type: application/json"' }
          ],
          responses: COMMON_RESPONSES
        },
        {
          id: 'user-vars-set',
          title: 'Set User Variables',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/vars/user/set',
          description: 'Set custom variable states specifically for this user.',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' },
            { name: 'session_token', type: 'string', required: true, description: 'Valid session token', example: 'TOKEN123' },
            { name: 'variables', type: 'object', required: true, description: 'JSON dictionary of variables to save', example: '{"theme":"dark"}' }
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/vars/user/set -d \'{"app_id":"...", "session_token":"...", "variables":{"theme":"dark"}}\' -H "Content-Type: application/json"' }
          ],
          responses: COMMON_RESPONSES
        }
      ]},

      { id: 'utilities', title: 'Utilities', type: 'folder', children: [
        {
          id: 'util-blacklist',
          title: 'Check Blacklist',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/util/check-blacklist',
          description: 'Check if a specific HWID or IP address is globally blacklisted by the developer.',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' },
            { name: 'hwid', type: 'string', required: true, description: 'Hardware ID to check', example: 'HWID123' }
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/util/check-blacklist -d \'{"app_id":"...", "hwid":"..."}\' -H "Content-Type: application/json"' }
          ],
          responses: COMMON_RESPONSES
        },
        {
          id: 'util-online',
          title: 'Online Users',
          type: 'endpoint',
          method: 'POST',
          url: 'https://dexterauth.onrender.com/api/v2/client/util/online-users',
          description: 'Retrieve the total number of currently online users (users with active sessions).',
          bodyParams: [
            { name: 'app_id', type: 'string', required: true, description: 'Your owner ID', example: 'YOUR_APP_ID' }
          ],
          codeSamples: [
            { language: 'shell', code: 'curl -X POST https://dexterauth.onrender.com/api/v2/client/util/online-users -d \'{"app_id":"..."}\' -H "Content-Type: application/json"' }
          ],
          responses: COMMON_RESPONSES
        }
      ]},
{
        id: "other-endpoints",
        title: "Full API Reference",
        type: "folder",
        children: [{"id":"post-enable","title":"POST enable","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v2/client/2fa/enable","description":"Enables two-factor authentication for the user (requires `secret` and `code`).",responses: COMMON_RESPONSES},{"id":"post-disable","title":"POST disable","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v2/client/2fa/disable","description":"Disables two-factor authentication for the user.",responses: COMMON_RESPONSES},{"id":"post-stats","title":"POST stats","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v2/client/util/stats","description":"Retrieves application statistics.",responses: COMMON_RESPONSES},{"id":"post-log","title":"POST log","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v2/client/util/log","description":"Sends a client-side log string to the backend audit table.",responses: COMMON_RESPONSES},{"id":"post-webhook","title":"POST webhook","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v2/client/util/webhook","description":"Triggers a configured Discord webhook on behalf of the client.",responses: COMMON_RESPONSES},{"id":"post-ban","title":"POST ban","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v2/client/util/ban","description":"Self-ban endpoint (triggered by client-side anti-tamper or memory injection detection).",responses: COMMON_RESPONSES},{"id":"post-login","title":"POST login","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/login","description":"Authenticates a Developer or Manager (returns JWT).",responses: COMMON_RESPONSES},{"id":"post-init","title":"POST init","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/register/init","description":"Step 1: Submits email/username/password and sends a verification OTP to email.",responses: COMMON_RESPONSES},{"id":"post-verify","title":"POST verify","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/register/verify","description":"Step 2: Verifies the OTP and activates the Developer account.",responses: COMMON_RESPONSES},{"id":"post-forgot","title":"POST forgot","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/password/forgot","description":"Requests a password reset OTP.",responses: COMMON_RESPONSES},{"id":"post-reset","title":"POST reset","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/password/reset","description":"Verifies the OTP and resets the password.",responses: COMMON_RESPONSES},{"id":"post-logout","title":"POST logout","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/logout","description":"Revokes the JWT session.",responses: COMMON_RESPONSES},{"id":"get-me","title":"GET me","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/dev/me","description":"Retrieves the logged-in dashboard user's profile and active permissions.",responses: COMMON_RESPONSES},{"id":"put-me","title":"PUT me","type":"endpoint","method":"PUT","url":"https://dexterauth.onrender.com/api/v1/dev/me","description":"Updates the dashboard user's profile (email, username, etc).",responses: COMMON_RESPONSES},{"id":"delete-profile","title":"DELETE profile","type":"endpoint","method":"DELETE","url":"https://dexterauth.onrender.com/api/v1/dev/profile","description":"Deletes the dashboard user's account entirely.",responses: COMMON_RESPONSES},{"id":"get-health","title":"GET health","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/dev/health","description":"Returns system health status.",responses: COMMON_RESPONSES},{"id":"get-public","title":"GET public","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/dev/platform/public","description":"Retrieves public platform configuration (e.g., Discord link, registration paused status).",responses: COMMON_RESPONSES},{"id":"get-overview","title":"GET overview","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/dev/overview","description":"Retrieves global dashboard statistics and charts.",responses: COMMON_RESPONSES},{"id":"get-notifications","title":"GET notifications","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/dev/notifications","description":"Retrieves team notifications and invitations.",responses: COMMON_RESPONSES},{"id":"get-team","title":"GET team","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/dev/team","description":"Retrieve all team members (Managers and Resellers).",responses: COMMON_RESPONSES},{"id":"post-team","title":"POST team","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/team","description":"Create a new team member directly.",responses: COMMON_RESPONSES},{"id":"put-team-id","title":"PUT :id","type":"endpoint","method":"PUT","url":"https://dexterauth.onrender.com/api/v1/dev/team/:id","description":"Update a team member's role or permissions.",responses: COMMON_RESPONSES},{"id":"delete-team-id","title":"DELETE :id","type":"endpoint","method":"DELETE","url":"https://dexterauth.onrender.com/api/v1/dev/team/:id","description":"Delete a team member.",responses: COMMON_RESPONSES},{"id":"post-invite","title":"POST invite","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/team/invite","description":"Invite an existing dashboard user to the team.",responses: COMMON_RESPONSES},{"id":"post-respond","title":"POST respond","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/team/invite/respond","description":"Accept or reject a team invitation.",responses: COMMON_RESPONSES},{"id":"post-leave","title":"POST leave","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/team/leave","description":"Leave a team.",responses: COMMON_RESPONSES},{"id":"get-apps","title":"GET apps","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/dev/apps","description":"Retrieve all applications owned/accessible by the user.",responses: COMMON_RESPONSES},{"id":"post-apps","title":"POST apps","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/apps","description":"Create a new application.",responses: COMMON_RESPONSES},{"id":"get-apps-id","title":"GET :id","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:id","description":"Retrieve specific application details.",responses: COMMON_RESPONSES},{"id":"put-apps-id","title":"PUT :id","type":"endpoint","method":"PUT","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:id","description":"Update application settings (status, hwid lock, etc).",responses: COMMON_RESPONSES},{"id":"delete-apps-id","title":"DELETE :id","type":"endpoint","method":"DELETE","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:id","description":"Delete an application completely.",responses: COMMON_RESPONSES},{"id":"get-chat","title":"GET chat","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:id/chat","description":"Retrieve all chat messages sent in the app.",responses: COMMON_RESPONSES},{"id":"post-chat","title":"POST chat","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:id/chat","description":"Send an admin chat message.",responses: COMMON_RESPONSES},{"id":"get-hashes","title":"GET hashes","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:id/hashes","description":"Retrieve Anti-Tamper whitelisted hashes.",responses: COMMON_RESPONSES},{"id":"post-hashes","title":"POST hashes","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:id/hashes","description":"Add a new whitelisted hash.",responses: COMMON_RESPONSES},{"id":"delete-hashes-hashId","title":"DELETE :hashId","type":"endpoint","method":"DELETE","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:id/hashes/:hashId","description":"Delete a specific hash.",responses: COMMON_RESPONSES},{"id":"delete-hashes","title":"DELETE hashes","type":"endpoint","method":"DELETE","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:id/hashes","description":"Reset all hashes for the app.",responses: COMMON_RESPONSES},{"id":"get-licenses","title":"GET licenses","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/dev/licenses","description":"Retrieve all licenses (requires `?appId=`).",responses: COMMON_RESPONSES},{"id":"post-generate","title":"POST generate","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/licenses/generate","description":"Generate a batch of license keys.",responses: COMMON_RESPONSES},{"id":"put-licenses-id","title":"PUT :id","type":"endpoint","method":"PUT","url":"https://dexterauth.onrender.com/api/v1/dev/licenses/:id","description":"Update a license's status (ban/pause).",responses: COMMON_RESPONSES},{"id":"delete-licenses-id","title":"DELETE :id","type":"endpoint","method":"DELETE","url":"https://dexterauth.onrender.com/api/v1/dev/licenses/:id","description":"Delete a license key entirely.",responses: COMMON_RESPONSES},{"id":"post-add-time","title":"POST add-time","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:appId/licenses/add-time","description":"Add bonus time to unused licenses.",responses: COMMON_RESPONSES},{"id":"delete-unused","title":"DELETE unused","type":"endpoint","method":"DELETE","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:appId/licenses/unused","description":"Delete all unused licenses.",responses: COMMON_RESPONSES},{"id":"delete-used","title":"DELETE used","type":"endpoint","method":"DELETE","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:appId/licenses/used","description":"Delete all used licenses.",responses: COMMON_RESPONSES},{"id":"get-users","title":"GET users","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/dev/users","description":"Retrieve all end-users (requires `?appId=`).",responses: COMMON_RESPONSES},{"id":"post-users","title":"POST users","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/users","description":"Manually create an end-user account.",responses: COMMON_RESPONSES},{"id":"put-users-id","title":"PUT :id","type":"endpoint","method":"PUT","url":"https://dexterauth.onrender.com/api/v1/dev/users/:id","description":"Update user status/details.",responses: COMMON_RESPONSES},{"id":"delete-users-id","title":"DELETE :id","type":"endpoint","method":"DELETE","url":"https://dexterauth.onrender.com/api/v1/dev/users/:id","description":"Delete an end-user.",responses: COMMON_RESPONSES},{"id":"post-reset-hwid","title":"POST reset-hwid","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/users/:userId/reset-hwid","description":"Reset HWID for a specific user.",responses: COMMON_RESPONSES},{"id":"post-reset-hwids","title":"POST reset-hwids","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:appId/users/reset-hwids","description":"Reset HWIDs for all users in the app.",responses: COMMON_RESPONSES},{"id":"post-bulk-time","title":"POST bulk-time","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:appId/users/bulk-time","description":"Add time to all users.",responses: COMMON_RESPONSES},{"id":"post-subtract-time","title":"POST subtract-time","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:appId/users/subtract-time","description":"Subtract time from all users.",responses: COMMON_RESPONSES},{"id":"post-import","title":"POST import","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:appId/users/import","description":"Import users from CSV/JSON.",responses: COMMON_RESPONSES},{"id":"delete-all","title":"DELETE all","type":"endpoint","method":"DELETE","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:appId/users/all","description":"Delete all users.",responses: COMMON_RESPONSES},{"id":"delete-expired","title":"DELETE expired","type":"endpoint","method":"DELETE","url":"https://dexterauth.onrender.com/api/v1/dev/apps/:appId/users/expired","description":"Delete all expired users.",responses: COMMON_RESPONSES},{"id":"get-subscriptions","title":"GET subscriptions","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/dev/subscriptions","description":"Retrieve subscription tiers.",responses: COMMON_RESPONSES},{"id":"post-subscriptions","title":"POST subscriptions","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/subscriptions","description":"Create a new subscription tier.",responses: COMMON_RESPONSES},{"id":"put-subscriptions-id","title":"PUT :id","type":"endpoint","method":"PUT","url":"https://dexterauth.onrender.com/api/v1/dev/subscriptions/:id","description":"Update a subscription tier.",responses: COMMON_RESPONSES},{"id":"delete-subscriptions-id","title":"DELETE :id","type":"endpoint","method":"DELETE","url":"https://dexterauth.onrender.com/api/v1/dev/subscriptions/:id","description":"Delete a subscription tier.",responses: COMMON_RESPONSES},{"id":"get-tokens","title":"GET tokens","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/dev/tokens","description":"Retrieve standalone access tokens.",responses: COMMON_RESPONSES},{"id":"post-tokens","title":"POST tokens","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/dev/tokens","description":"Generate standalone access tokens.",responses: COMMON_RESPONSES},{"id":"put-tokens-id","title":"PUT :id","type":"endpoint","method":"PUT","url":"https://dexterauth.onrender.com/api/v1/dev/tokens/:id","description":"Update token status.",responses: COMMON_RESPONSES},{"id":"delete-tokens-id","title":"DELETE :id","type":"endpoint","method":"DELETE","url":"https://dexterauth.onrender.com/api/v1/dev/tokens/:id","description":"Delete token.",responses: COMMON_RESPONSES},{"id":"get-sessions","title":"GET sessions","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/dev/sessions","description":"Retrieve active client sessions.",responses: COMMON_RESPONSES},{"id":"delete-sessions-id","title":"DELETE :id","type":"endpoint","method":"DELETE","url":"https://dexterauth.onrender.com/api/v1/dev/sessions/:id","description":"Kill a session forcefully.",responses: COMMON_RESPONSES},{"id":"get-lookup-app","title":"GET lookup-app","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/customer/lookup-app","description":"Fetches public app name via App ID for the login page.",responses: COMMON_RESPONSES},{"id":"post-login","title":"POST login","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/customer/login","description":"Authenticate via username/password.",responses: COMMON_RESPONSES},{"id":"post-login-license","title":"POST login-license","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/customer/login-license","description":"Authenticate strictly via license key (for license-only apps).",responses: COMMON_RESPONSES},{"id":"post-register","title":"POST register","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/customer/register","description":"Register via license key + username + password.",responses: COMMON_RESPONSES},{"id":"post-upgrade","title":"POST upgrade","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/customer/upgrade","description":"Redeem a license key to extend time on an existing account.",responses: COMMON_RESPONSES},{"id":"post-logout","title":"POST logout","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/customer/logout","description":"Kill the customer's web session.",responses: COMMON_RESPONSES},{"id":"get-profile","title":"GET profile","type":"endpoint","method":"GET","url":"https://dexterauth.onrender.com/api/v1/customer/profile","description":"View account details, active subs, HWID lock status, and cooldown info.",responses: COMMON_RESPONSES},{"id":"post-update-credentials","title":"POST update-credentials","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/customer/update-credentials","description":"Update username and password.",responses: COMMON_RESPONSES},{"id":"post-reset-hwid","title":"POST reset-hwid","type":"endpoint","method":"POST","url":"https://dexterauth.onrender.com/api/v1/customer/reset-hwid","description":"Self-service Hardware ID reset (enforces cooldown duration).",responses: COMMON_RESPONSES}]
      }
    ]
  }
];
