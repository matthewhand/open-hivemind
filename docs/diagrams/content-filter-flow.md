# Content Filter Flow Diagram

## Message Processing Pipeline

```mermaid
flowchart TD
    A([Incoming Message]) --> B[Input Sanitize]
    B --> C[Input Validate]
    C --> D["Content Filter Check\n(if enabled)"]
    D -->|"allowed = false"| E[Audit Log]
    E --> F["Send Notify\n(optional)"]
    F --> G([Return null])
    D -->|"allowed = true"| H[Command Check]
    H --> I[Should Reply?]
    I --> J[LLM Inference]
    J --> K[Format Response]
    K --> L["Bot Response Filter\n(if enabled)"]
    L -->|"allowed = false"| M[Audit Log]
    M --> N([Return null])
    L -->|"allowed = true"| O[Send to Channel]
    O --> P[Store Memory]
    P --> Q([Return Response])
    CF([ContentFilterService]) -. checks .-> D
    CF -. checks .-> L
```

## Content Filter Decision Flow

```mermaid
flowchart TD
    A["checkContent(content, config, role)"] --> B{"role == 'system'?"}
    B -->|YES| C([return: allowed true])
    B -->|NO| D{filter.enabled?}
    D -->|NO| E([return: allowed true])
    D -->|YES| F{"blockedTerms exists & length > 0?"}
    F -->|NO| G([return: allowed true])
    F -->|YES| H["Normalize content (toLowerCase)"]
    H --> I[For each blocked term]
    I --> J["Check strictness:\nlow → matchWholeWord\nmedium → includes\nhigh → matchPattern"]
    J -->|MATCH| K[Add to matchedTerms]
    K --> I
    J -->|NO MATCH| I
    I -->|all terms checked| L{Any matches?}
    L -->|YES| M(["return: allowed false\nreason, matchedTerms"])
    L -->|NO| N([return: allowed true])
```

## Strictness Level Matching

| Strictness | Function | Match Logic | Example term: `spam` |
|---|---|---|---|
| **LOW** | `matchWholeWord` | Word-boundary regex `\b{term}\b`, case-insensitive | ✅ `"spam here"` · ❌ `"spammy"` · ✅ `"SPAM"` |
| **MEDIUM** | `content.includes` | Case-insensitive substring | ✅ `"spam here"` · ✅ `"spammy"` · ✅ `"SPAM"` |
| **HIGH** | `matchPattern` | Substring + deobfuscation (`0→o`, `1→i`, `3→e`, `4→a`, `5→s`, `7→t`, `8→b`, `$→s`, `@→a`, `!→i`, strips `*_- `) | ✅ `"sp4m"` · ✅ `"$pam"` · ✅ `"s p a m"` |

## Configuration Flow

```mermaid
flowchart TD
    A["Guardrail Profile JSON\nguards.contentFilter:\n  enabled, strictness, blockedTerms"] --> B["loadProfiles()"]
    B --> C["BotConfigurationManager\n.applyGuardrailProfile()"]
    C --> D["config.contentFilter =\nprofile.guards.contentFilter"]
    D --> E["handleMessage()\nchecks contentFilter"]
```

## System Message Bypass

```mermaid
flowchart TD
    A([Message Type Check]) --> B{"message.role?"}
    B -->|user| C[Apply content filter]
    B -->|assistant| D[Apply content filter]
    B -->|system| E["BYPASS — always allowed\n(no filtering · no logging · no blocking)"]
```

## Audit Logging Flow

```mermaid
flowchart TD
    A([Content Filter Block]) --> B{Block Type?}
    B -->|Incoming Message Block| C["AuditLogger.log()\ntype: CONTENT_FILTER_BLOCK\naction: BLOCK\nmetadata: matchedTerms,\nstrictness, channelId, userId"]
    B -->|Bot Response Block| D["AuditLogger.log()\ntype: BOT_RESPONSE_FILTER_BLOCK\naction: BLOCK\nmetadata: matchedTerms,\nstrictness, channelId, userId"]
```

## Performance Profile

Processing time per message:

| Configuration | 10 terms | 100 terms |
|---|---|---|
| Filter disabled | ~0.001 ms | ~0.001 ms |
| Low strictness | ~0.1–0.5 ms | ~0.5–2 ms |
| Medium strictness | ~0.2–0.8 ms | ~0.8–3 ms |
| High strictness | ~0.5–1.5 ms | ~1.5–5 ms |

> **Notes:** O(n) complexity — no database queries, no network calls, minimal memory overhead.

## Integration Points

```mermaid
flowchart LR
    GP[Guardrail Profiles] --> BC[Bot Config]
    BC --> MH[Message Handler]
    MH --> CF[ContentFilter Service]
    CF -->|blocked| AL[Audit Log Service]
    CF -->|blocked| MP[Messenger Provider]
    MP --> UN[User Notify]
```
