# Guided Tour — Sam Sets Up a Support Swarm

This is a narrative walkthrough of Open-Hivemind, one sitting from first launch to a working multi-bot deployment. It follows **Sam**, who runs a busy open-source community on Discord, and goes deeper than the [User Guide Quick Tour](USER_GUIDE.md#quick-tour--your-first-session): the *why* behind each step, the decisions Sam makes along the way, and the pages where each decision lives.

Sam's goal: **a support swarm** — two bots with different personalities sharing one channel. One answers technical questions patiently; the other keeps the mood light and welcomes newcomers. Both need guardrails, memory, and a way for Sam to see what they're doing.

> Screenshots are the same auto-captured journey set used by the Quick Tour (`npm run test:journey:guide`, demo-mode data). Steps without a screenshot yet are listed under [Screenshots wanted](#screenshots-wanted).

## Contents

1. [First launch and onboarding](#1-first-launch-and-onboarding)
2. [Connecting the providers](#2-connecting-the-providers)
3. [Two bots, two personas](#3-two-bots-two-personas)
4. [Guardrails before going live](#4-guardrails-before-going-live)
5. [Test drive](#5-test-drive)
6. [Going live in a real channel](#6-going-live-in-a-real-channel)
7. [Watching the swarm work](#7-watching-the-swarm-work)
8. [Giving the bots memory](#8-giving-the-bots-memory)
9. [Extending with an MCP tool (with approval)](#9-extending-with-an-mcp-tool-with-approval)
10. [Backing it all up](#10-backing-it-all-up)
11. [Screenshots wanted](#screenshots-wanted)

---

## 1. First launch and onboarding

Sam starts the server (`npm run dev`) and opens `http://localhost:3028`. Running on a trusted home network, Sam uses the localhost admin bypass (`ALLOW_LOCALHOST_ADMIN=true`) to land straight on the admin dashboard — in production this would be a password login instead.

With nothing configured yet, the app is in **Demo Mode**: every page is seeded with simulated bots and conversations so Sam can click around and see what a running deployment looks like before committing to anything. The onboarding wizard offers the fastest path out — it asks for exactly the three things a live bot needs: a message platform, an LLM provider, and a name.

![Admin dashboard on first sign-in](screenshots/journey-01-onboarding.png)

Sam skips the wizard's bot step for now — the plan is two bots, not one, so Sam will set up providers first and create the bots deliberately on the Bots page.

## 2. Connecting the providers

### The message platform

Under **Configuration → Message Platforms**, Sam adds a Discord connection with the bot token from the Discord Developer Portal. The connection is validated immediately and shows up in the provider list. One important property for the swarm plan: a single platform connection can back **several** bot personas, though Sam will actually register a second Discord application later so each bot has its own avatar and name in the member list.

(Slack, Mattermost, and Telegram work the same way — Telegram receives messages via long-polling, so it needs no public webhook URL.)

![Message Providers page after adding Discord](screenshots/journey-02-discord-add.png)

### The LLM provider

Under **Configuration → LLM Providers**, Sam adds an OpenAI profile with an API key and picks a default model. Profiles are reusable connection templates: both bots will share this one, but nothing stops Sam from later giving the fun bot a cheaper model and the support bot a stronger one — that's a per-bot choice at creation time. Any OpenAI-compatible endpoint (local Ollama, vLLM) works through the same provider type via the base-URL field.

![LLM Providers page after adding OpenAI](screenshots/journey-03-openai-add.png)

## 3. Two bots, two personas

Before creating the bots, Sam visits **Personas** and prepares two personalities:

- **Patient Mentor** — system prompt focused on step-by-step troubleshooting, asking clarifying questions, never condescending.
- **Community Greeter** — short, upbeat replies, welcomes new members, deflects technical questions to its sibling.

Personas are reusable presets (system prompt + traits) that live independently of any bot: edit the prompt once and every assigned bot updates immediately. Built-in personas are read-only but cloneable, which is how Sam starts the Mentor.

![Persona library](screenshots/journey-07-personas.png)

Now to **Bots → Create Bot**. The 4-step wizard (Basics → Persona → Guardrails → Review) walks through name, message provider, LLM profile, and persona. Sam runs it twice — once for **HelpfulHive** (Patient Mentor) and once for **BuzzBee** (Community Greeter) — and both appear in the fleet list.

![Bots page after creating a bot](screenshots/journey-04-bot-create.png)

To keep the two from talking over each other in one channel, Sam tunes each bot's **Response Profile**: BuzzBee gets a high base response probability but a "social anxiety" modifier so it goes quiet when the channel is busy; HelpfulHive responds mostly when mentioned or when a question is detected. Swarm mode is set so one bot claims a conversation rather than both piling on.

## 4. Guardrails before going live

A bot with an LLM behind it is a liability without limits, so Sam opens **Guards** before either bot says a word in public. A guard profile bundles:

- **Rate limits** — caps per-bot message volume so a prompt loop can't flood the channel.
- **Content filtering** — strictness level for what the bots will repeat or engage with.
- **Tool permissions** — which MCP tools the bot may invoke, and whether invocations need a human approval first (this matters in step 9).

Sam creates one profile, "Community Safe", and assigns it to both bots. Profiles are shared, so tightening a limit later fixes both bots at once.

![Guard profiles](screenshots/journey-08-guards.png)

## 5. Test drive

Rather than finding out in public that the API key is wrong, Sam opens HelpfulHive's detail drawer on the Bots page and uses the **Test Drive** tab — a direct chat against the bot's configured LLM, persona prompt included, with no platform round-trip. Token usage and estimated cost are tracked per exchange, which gives Sam an early feel for what a chatty support bot will cost per day.

![Test Drive tab in the bot detail drawer](screenshots/journey-05-bot-chat.png)

A few exchanges confirm the Mentor persona is coming through. Sam repeats the check with BuzzBee, then flips both bots' **Active** toggles on.

## 6. Going live in a real channel

Sam invites both Discord applications to the community server and watches `#support`. The bots don't answer everything — that's by design. Open-Hivemind bots respond *probabilistically*: a direct mention nearly always gets a reply, an open question usually draws HelpfulHive, and ambient chatter mostly gets ignored unless BuzzBee's engagement roll succeeds. Once a bot engages in a thread it tends to stay engaged, so conversations feel continuous rather than summoned.

The first real exchange: a member asks "how do I fix a node version mismatch?", HelpfulHive replies with a step-by-step, and BuzzBee stays quiet — exactly the division of labor Sam configured in the response profiles.

> **What that looks like:** the Activity page's **Conversations** view replays exactly this behavior. Below, one user question in `#community-support` draws an answer from SupportBot, an ops tip from DevOpsBot, and silence from every other persona — selective engagement, recorded with chronological timestamps and per-reply latency. (Demo-mode personas shown; regenerate with `npm run test:journey:showcase`.)

![Hivemind showcase — multiple personas, one channel, selective engagement](screenshots/hivemind-showcase.png)

## 7. Watching the swarm work

Back in the admin UI, the **Activity** page is the flight recorder: every inbound message, which bot replied (or chose not to), which provider served the reply, and how long it took. Filters narrow it to a bot, platform, provider, or date range, and the log exports to CSV. This is also where Sam will start when someone says "the bot ignored me" — if the inbound message never arrived, it's a platform problem; if it arrived and got no reply, it's usually the response-probability dice.

![Live activity feed](screenshots/journey-06-activity.png)

The **Monitoring** dashboard covers the system half of the story: per-bot health scores, message rates, CPU/memory. Prometheus-compatible metrics and trace export are available when Sam later wants this in the community's existing Grafana.

![Monitoring dashboard](screenshots/journey-10-monitoring.png)

## 8. Giving the bots memory

A support bot that forgets the user's setup between messages is barely better than a search box. Under **Memory**, Sam configures **MemVault**, the built-in backend — it persists to the app's SQLite database, so memories survive restarts (Mem0, Mem4AI, and PostgreSQL are the alternatives for bigger deployments). Retention and eviction controls cap how much history accumulates, and long conversations are summarized automatically in the message pipeline so context stays affordable.

![Memory provider configuration](screenshots/journey-09-memory.png)

From now on, HelpfulHive can recall that the user it's helping was on Node 18 yesterday.

## 9. Extending with an MCP tool (with approval)

The community's most common request is "what's the status of issue #N?" — answerable only by an external tool. Sam adds the project's MCP server under **MCP Servers** (HTTP, SSE, and stdio transports are supported); its tools are discovered automatically, and any MCP server already listed in a bot's configuration auto-connects at startup, so this is a one-time setup.

On **MCP Tools**, Sam inspects the `lookup_issue` tool's schema and test-runs it in Form mode before any bot can touch it. Then comes the safety decision: in the "Community Safe" guard profile, Sam enables `lookup_issue` for HelpfulHive only and turns on **human-in-the-loop approval** — when the bot wants to invoke the tool, the request is held until Sam approves it. After a week of sensible invocations, Sam can relax this to auto-approve.

The first approved invocation shows up in the Activity feed like any other event, tool call and all.

*(No screenshot for this step yet — see [Screenshots wanted](#screenshots-wanted).)*

## 10. Backing it all up

Everything Sam built — providers, two bots, personas, the guard profile, memory config — is now worth protecting. The **Export** page snapshots the entire configuration as JSON, YAML, or CSV (optionally compressed or encrypted), and the same page imports a snapshot back, so this doubles as a migration path to a bigger host later. The server also takes automatic daily configuration backups with a 7-backup retention window, visible under System Management.

![Configuration export](screenshots/journey-11-export.png)

Sam downloads a JSON export, commits it to the community's private ops repo, and closes the laptop. Total elapsed time: one evening. The swarm is live.

---

## Where to next

- The **[User Guide](USER_GUIDE.md)** covers every page in depth, plus ten common workflows (headless `.env` setup, debugging "my bot didn't reply", locking down a public deployment, …).
- **[SCREENSHOTS.md](SCREENSHOTS.md)** indexes every screenshot used here and elsewhere.

## Screenshots wanted

Steps in this tour that don't yet have a matching screenshot in the journey set (`tests/e2e/journey-user-guide.spec.ts`, regenerated via `npm run test:journey:guide`):

| Step | Wanted screenshot |
|---|---|
| [6. Going live in a real channel](#6-going-live-in-a-real-channel) | A real platform channel (Discord) showing a member's question and a bot's reply. (The admin-side view of this exchange now exists: `hivemind-showcase.png`, the Conversations-view transcript embedded in that step.) |
| [9. Extending with an MCP tool (with approval)](#9-extending-with-an-mcp-tool-with-approval) | The human-in-the-loop approval prompt for a pending MCP tool invocation, and/or the guard profile's tool-permission editor with approval enabled. |
| [3. Two bots, two personas](#3-two-bots-two-personas) | The Bots page showing **two** bots with different personas side by side (journey-04 shows a single created bot). |
