# Content Filter Flow Diagram

## Message Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    Incoming Message                              │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Input Sanitize │
         └────────┬───────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Input Validate  │
         └────────┬────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │  Content Filter Check       │◄──── ContentFilterService
    │  (if enabled)               │
    └────────┬────────────────────┘
             │
             ├─ allowed = false ───┐
             │                     │
             │                     ▼
             │              ┌──────────────┐
             │              │ Audit Log    │
             │              └──────┬───────┘
             │                     │
             │                     ▼
             │              ┌──────────────┐
             │              │ Send Notify  │
             │              │ (optional)   │
             │              └──────┬───────┘
             │                     │
             │                     ▼
             │              ┌──────────────┐
             │              │ Return null  │
             │              └──────────────┘
             │
             └─ allowed = true
                  │
                  ▼
         ┌────────────────┐
         │ Command Check  │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ Should Reply?  │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ LLM Inference  │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ Format Response│
         └────────┬───────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │  Bot Response Filter        │◄──── ContentFilterService
    │  (if enabled)               │
    └────────┬────────────────────┘
             │
             ├─ allowed = false ───┐
             │                     │
             │                     ▼
             │              ┌──────────────┐
             │              │ Audit Log    │
             │              └──────┬───────┘
             │                     │
             │                     ▼
             │              ┌──────────────┐
             │              │ Return null  │
             │              └──────────────┘
             │
             └─ allowed = true
                  │
                  ▼
         ┌────────────────┐
         │ Send to Channel│
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │  Store Memory  │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ Return Response│
         └────────────────┘
```

## Content Filter Decision Flow

```
┌─────────────────────────────────────┐
│  checkContent(content, config, role)│
└─────────────────┬───────────────────┘
                  │
                  ▼
        ┌──────────────────┐
        │ role == 'system'?│
        └────┬──────────────┘
             │
             ├─ YES ──► return { allowed: true }
             │
             └─ NO
                  │
                  ▼
        ┌──────────────────┐
        │ filter.enabled? │
        └────┬─────────────┘
             │
             ├─ NO ──► return { allowed: true }
             │
             └─ YES
                  │
                  ▼
        ┌──────────────────┐
        │ blockedTerms     │
        │ exists & length? │
        └────┬─────────────┘
             │
             ├─ NO ──► return { allowed: true }
             │
             └─ YES
                  │
                  ▼
        ┌──────────────────┐
        │ Normalize content│
        │ (toLowerCase)    │
        └────┬─────────────┘
             │
             ▼
    ┌────────────────────────┐
    │ For each blocked term: │
    └────────┬───────────────┘
             │
             ▼
    ┌────────────────────────┐
    │  Check strictness:     │
    ├────────────────────────┤
    │ • low → matchWholeWord │
    │ • medium → includes    │
    │ • high → matchPattern  │
    └────────┬───────────────┘
             │
             ├─ MATCH ──► Add to matchedTerms[]
             │
             └─ NO MATCH ──► Continue
                  │
                  ▼
        ┌──────────────────┐
        │ Any matches?     │
        └────┬─────────────┘
             │
             ├─ YES ──► return {
             │            allowed: false,
             │            reason: "...",
             │            matchedTerms: [...]
             │          }
             │
             └─ NO ──► return { allowed: true }
```

## Strictness Level Matching

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOW STRICTNESS                            │
├─────────────────────────────────────────────────────────────────┤
│  matchWholeWord(content, term)                                   │
│    1. Escape regex special chars                                │
│    2. Create pattern: \b{term}\b                                │
│    3. Test with case-insensitive flag                           │
│                                                                  │
│  Example: term = "spam"                                         │
│    "spam here" ────► MATCH (whole word)                         │
│    "spammy" ───────► NO MATCH (partial)                         │
│    "SPAM" ─────────► MATCH (case-insensitive)                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      MEDIUM STRICTNESS                           │
├─────────────────────────────────────────────────────────────────┤
│  content.includes(term)                                         │
│    1. Normalize both to lowercase                               │
│    2. Check if term exists in content                           │
│                                                                  │
│  Example: term = "spam"                                         │
│    "spam here" ────► MATCH                                      │
│    "spammy" ───────► MATCH (substring)                          │
│    "SPAM" ─────────► MATCH (case-insensitive)                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       HIGH STRICTNESS                            │
├─────────────────────────────────────────────────────────────────┤
│  matchPattern(content, term)                                    │
│    1. Check direct substring match                              │
│    2. Deobfuscate content:                                      │
│       • 0→o, 1→i, 3→e, 4→a, 5→s, 7→t, 8→b                      │
│       • $→s, @→a, !→i                                           │
│       • Remove *, _, -, spaces                                  │
│    3. Deobfuscate term                                          │
│    4. Check if deobfuscated term in deobfuscated content       │
│                                                                  │
│  Example: term = "spam"                                         │
│    "spam here" ────► MATCH                                      │
│    "sp4m" ─────────► MATCH (4→a)                                │
│    "$pam" ─────────► MATCH ($→s)                                │
│    "s p a m" ──────► MATCH (spaces removed)                     │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Guardrail Profile JSON                        │
│  {                                                               │
│    "guards": {                                                   │
│      "contentFilter": {                                          │
│        "enabled": true,                                          │
│        "strictness": "medium",                                   │
│        "blockedTerms": ["spam", "scam"]                          │
│      }                                                           │
│    }                                                             │
│  }                                                               │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ loadProfiles() │
         └────────┬───────┘
                  │
                  ▼
    ┌─────────────────────────┐
    │ BotConfigurationManager │
    │ .applyGuardrailProfile()│
    └────────┬────────────────┘
             │
             ▼
    ┌────────────────────────┐
    │  config.contentFilter  │◄──── Applied to botConfig
    │  = profile.guards      │
    │     .contentFilter     │
    └────────┬───────────────┘
             │
             ▼
    ┌────────────────────────┐
    │   handleMessage()      │
    │   checks contentFilter │
    └────────────────────────┘
```

## System Message Bypass

```
┌─────────────────────────────────────────────────────────────────┐
│                     Message Type Check                           │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ message.role?  │
         └────┬───────────┘
              │
              ├─ 'user' ──────► Apply content filter
              │
              ├─ 'assistant' ──► Apply content filter
              │
              └─ 'system' ─────► BYPASS (always allowed)
                                  │
                                  ▼
                          ┌──────────────┐
                          │ No filtering │
                          │ No logging   │
                          │ No blocking  │
                          └──────────────┘
```

## Audit Logging Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Content Filter Block                          │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Block Type?    │
         └────┬───────────┘
              │
              ├─ Incoming Message Block
              │         │
              │         ▼
              │  ┌──────────────────────┐
              │  │ AuditLogger.log()    │
              │  │ type: CONTENT_       │
              │  │   FILTER_BLOCK       │
              │  │ action: BLOCK        │
              │  │ metadata:            │
              │  │   - matchedTerms     │
              │  │   - strictness       │
              │  │   - channelId        │
              │  │   - userId           │
              │  └──────────────────────┘
              │
              └─ Bot Response Block
                        │
                        ▼
                 ┌──────────────────────┐
                 │ AuditLogger.log()    │
                 │ type: BOT_RESPONSE_  │
                 │   FILTER_BLOCK       │
                 │ action: BLOCK        │
                 │ metadata:            │
                 │   - matchedTerms     │
                 │   - strictness       │
                 │   - channelId        │
                 │   - userId           │
                 └──────────────────────┘
```

## Performance Profile

```
┌─────────────────────────────────────────────────────────────────┐
│                    Processing Time (per message)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Filter disabled:    ~0.001ms (single if check)                 │
│                                                                  │
│  Low strictness:     ~0.1-0.5ms (10 terms)                      │
│                      ~0.5-2ms (100 terms)                       │
│                                                                  │
│  Medium strictness:  ~0.2-0.8ms (10 terms)                      │
│                      ~0.8-3ms (100 terms)                       │
│                                                                  │
│  High strictness:    ~0.5-1.5ms (10 terms)                      │
│                      ~1.5-5ms (100 terms)                       │
│                                                                  │
│  Notes:                                                          │
│  • Times are per message                                        │
│  • Linear O(n) complexity                                       │
│  • No database queries                                          │
│  • No network calls                                             │
│  • Minimal memory overhead                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                        System Components                         │
└─────────────────┬───────────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────────────────────────────┐
    │             │                                     │
    ▼             ▼                                     ▼
┌────────┐  ┌──────────┐  ┌──────────────┐  ┌────────────────┐
│Guardrail│  │  Bot     │  │   Message    │  │ ContentFilter  │
│Profiles │─►│  Config  │─►│   Handler    │─►│    Service     │
└────────┘  └──────────┘  └──────────────┘  └────────────────┘
                                  │
                                  │ (blocked)
                                  │
                         ┌────────┴────────┐
                         │                 │
                         ▼                 ▼
                  ┌────────────┐    ┌───────────┐
                  │ Audit Log  │    │ Messenger │
                  │  Service   │    │  Provider │
                  └────────────┘    └───────────┘
                                          │
                                          ▼
                                    ┌──────────┐
                                    │   User   │
                                    │  Notify  │
                                    └──────────┘
```
