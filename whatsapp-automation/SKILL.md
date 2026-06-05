---
name: whatsapp-automation
description: Automate WhatsApp messaging, responses, and group management. Supports sending text, media, reactions, and managing multi-agent discussions.
---

# WhatsApp Automation

Everything you can do in WhatsApp, your AI agent can do too. This skill provides the capabilities for direct WhatsApp integration and automation.

## Prerequisites
- WhatsApp account linked via QR code (using an integration like Baileys or an official API bridge).
- Authorized session for the agent.

## Core Capabilities

### 1. Messaging
- **Send Text:** Send direct messages to phone numbers or groups.
- **Media Support:** Send images, videos, documents, voice notes, and stickers.
- **Interactions:** Reply to specific messages, react with emojis, and edit or unsend messages.
- **Polls:** Create and manage interactive polls in chats.

### 2. Group Management
- **Moderation:** Add/remove participants and manage admin roles.
- **Information:** Update group names, icons, and descriptions.
- **Links:** Generate and manage group invite links.

### 3. Automated Responses
- **Trigger:** Incoming messages provide `message_id` and sender context.
- **Threaded Replies:** Use the `message_id` to ensure responses are correctly threaded.
- **Acknowledgments:** Use quick reactions (e.g., ⚡) to acknowledge receipt before full processing.

## Security & Safety
- **Authorized Users:** Only respond to specific whitelisted phone numbers.
- **Whitelisted Chats:** Only operate in authorized group JIDs or DMs.
- **Rate Limiting:** Avoid rapid-fire messaging to prevent anti-spam bans.
- **Gating:** Only speak when explicitly mentioned or replied to in groups.

## Usage Examples

### Messaging
- **Send:** `message action=send channel=whatsapp to="+123456789" message="Hello!"`
- **Reply:** `message action=reply channel=whatsapp to="+123456789" replyTo="MSG_ID" message="Got it!"`
- **React:** `message action=react channel=whatsapp to="+123456789" messageId="MSG_ID" emoji="👍"`

### Groups
- **Update Info:** `group action=setDescription jid="group_id@g.us" description="Updated team channel"`
