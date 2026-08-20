# 🤖 AI AGENT COLLABORATION & SYNCHRONIZATION RULES

You are an AI coding assistant working on the **Telegram Bots Ecosystem & Sherlock Admin** project.
Multiple developers and AI agents collaborate on this codebase.

## 🚨 MANDATORY PROTOCOLS:

### 1. Pre-flight Check (BEFORE ANY TASK):
- ALWAYS read `docs/LAST_UPDATES.md` before starting to plan or write code.
- Understand what the other developer / AI recently implemented, what models exist, and what database schemas are active.
- Read `docs/ARCHITECTURE.md` and `admin-panel/prisma/schema.prisma` if relevant to your task.

### 2. Implementation Conventions:
- Theme & Style: Follow the dark graphite + amber Sherlock Admin V2 design system (`#0b1326`, `#dae2fd`, `#f59e0b`, `#ffb4ac`, `Playfair Display`, `Inter`, `JetBrains Mono`).
- Multi-bot support: All bot prompts, group lores, and Gemini API keys are dynamically retrieved from the backend (`/api/bot-runtime/config` and `/api/bot-runtime/dialogue`).
- Never commit `.env` or plain-text secrets to Git.

### 3. Post-flight Logging (AFTER COMPLETING ANY TASK):
- ALWAYS update `docs/LAST_UPDATES.md` with a new entry at the very top describing:
  - Timestamp & Author
  - Branch name
  - Summary of changes
  - List of modified/created files
  - Important notes for the other teammate
