#!/usr/bin/env python3
"""
scripts/auto_improve_merge.py — Two-phase Jules fleet PR pipeline

Phase 1 (FEEDBACK):  Detect new PR → post scope-widening feedback → record time
Phase 2 (MERGE):     After FEEDBACK_WAIT_MINUTES, check if Jules pushed new commits
                     → if yes: merge (Jules responded!)
                     → if no:  merge anyway (no response, still want progress)

This separation ensures Jules has TIME to act on feedback before we close the PR.

Usage (from repo root):
  python3 scripts/auto_improve_merge.py [--wait-minutes N]

Options:
  --wait-minutes N    Minutes to wait after feedback before merging (default: 30)

Polls every 60s. Exits after IDLE_EXIT_AFTER idle rounds.
"""
import subprocess, json, time, os, re, sys, argparse

# ─── Config ──────────────────────────────────────────────────────────────────

parser = argparse.ArgumentParser()
parser.add_argument("--wait-minutes", type=int, default=30,
                    help="Minutes to wait after posting feedback before merging (default: 30)")
args = parser.parse_args()

FEEDBACK_WAIT_SECONDS = args.wait_minutes * 60
POLL_INTERVAL = 60
IDLE_EXIT_AFTER = 60  # exit after ~60 min of no new PRs

# Auto-detect repo root — portable, works in any clone
REPO_PATH = subprocess.check_output(
    ["git", "rev-parse", "--show-toplevel"],
    cwd=os.path.dirname(os.path.abspath(__file__)),
    text=True
).strip()

# Read GitHub repo from git remote
_remote = subprocess.check_output(
    ["git", "remote", "get-url", "origin"], cwd=REPO_PATH, text=True
).strip()
REPO = re.sub(r".*github\.com[:/](.+?)(?:\.git)?$", r"\1", _remote)

# Persist state so restarts don't re-process PRs
STATE_FILE = os.path.join(REPO_PATH, ".auto_merge_state.json")

def _load_state():
    if os.path.exists(STATE_FILE):
        try:
            return json.load(open(STATE_FILE))
        except Exception:
            pass
    return {"seen": [], "pending": {}}

def _save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

state = _load_state()
SEEN: set = set(state.get("seen", []))
# pending: {pr_num: {"feedback_at": timestamp, "branch": str, "title": str, "head_sha": str}}
PENDING: dict = {int(k): v for k, v in state.get("pending", {}).items()}


# ─── Shell helper ─────────────────────────────────────────────────────────────

def run(cmd, timeout=60, env=None):
    e = os.environ.copy()
    if env:
        e.update(env)
    r = subprocess.run(
        cmd, shell=True, capture_output=True, text=True,
        timeout=timeout, cwd=REPO_PATH, env=e
    )
    return r.stdout.strip(), r.stderr.strip(), r.returncode


def is_graceful(title):
    return any(x in title.lower() for x in ["graceful", "no code changes", "abort"])


# ─── Feedback ────────────────────────────────────────────────────────────────

def get_feedback(title):
    t = title.lower()
    if any(x in t for x in ["form", "input", "field", "config form"]):
        ideas = [
            "**Idea 1 — Full field audit:** Find remaining raw `<input>`/`<select>`/`<textarea>` not migrated to DaisyUI wrappers.",
            "**Idea 2 — Inline validation:** Add `text-error` helper below each field on blur/change.",
            "**Idea 3 — Accessibility:** Ensure every field has `<label for=...>` and `aria-describedby` on error messages.",
        ]
    elif any(x in t for x in ["modal", "backdrop", "dialog"]):
        ideas = [
            "**Idea 1 — Audit all modals:** Apply `<dialog>` + `showModal()` pattern to every modal.",
            "**Idea 2 — Focus trap:** Add keyboard focus trap (WCAG 2.1.2).",
            "**Idea 3 — Escape dismissal:** Ensure Escape closes modals and restores focus to trigger element.",
        ]
    elif any(x in t for x in ["websocket", "ws", "realtime", "real-time"]):
        ideas = [
            "**Idea 1 — Reconnection:** Add exponential backoff reconnect (1s → 30s max).",
            "**Idea 2 — Event docs:** JSDoc every emit/on call with payload shape.",
            "**Idea 3 — Cleanup:** `useEffect` cleanup calling `socket.off(eventName)` on unmount.",
        ]
    elif any(x in t for x in ["test", "lint", "type", "janitor"]):
        ideas = [
            "**Idea 1 — Coverage:** Add 5+ test cases for edge cases (empty, max-length, errors).",
            "**Idea 2 — Snapshot:** Add a Vitest snapshot to lock in rendered output.",
            "**Idea 3 — Strict types:** Enable `strict: true` in tsconfig and fix new errors.",
        ]
    elif any(x in t for x in ["cors", "security", "header", "rate"]):
        ideas = [
            "**Idea 1 — Full route audit:** Find every route missing the fix and apply it.",
            "**Idea 2 — Security headers:** Add HSTS, X-Content-Type-Options, X-Frame-Options, CSP.",
            "**Idea 3 — Integration test:** Assert disallowed origins get 403.",
        ]
    elif any(x in t for x in ["mcp", "server", "card"]):
        ideas = [
            "**Idea 1 — Timestamps:** Show `lastConnected` as relative time ('2 mins ago').",
            "**Idea 2 — Tool count badge:** Display `tools.length` on each card.",
            "**Idea 3 — Disconnected state:** Distinct visual + Reconnect button for offline servers.",
        ]
    elif any(x in t for x in ["screenshot", "doc", "guide", "readme"]):
        ideas = [
            "**Idea 1 — Full page coverage:** Add screenshots for every major page not yet covered.",
            "**Idea 2 — CI enforcement:** Add a workflow step that fails if any referenced screenshot is missing.",
            "**Idea 3 — Before/after:** For fix PRs, include a before-screenshot alongside the after.",
        ]
    else:
        ideas = [
            "**Idea 1 — Broader coverage:** Find 2–3 adjacent components with the same issue.",
            "**Idea 2 — Tests:** Write 3 unit tests — happy path, error case, edge case.",
            "**Idea 3 — Docs:** Add JSDoc to new/modified functions (params, returns, side-effects).",
        ]
    fb = "## 🚀 Scope Widening Feedback\n\n"
    fb += "Thanks for this PR! Here are **3 ideas** to widen its impact:\n\n"
    for idea in ideas:
        fb += f"{idea}\n\n"
    fb += (f"_We'll check back in ~{args.wait_minutes} minutes. "
           "If you've pushed improvements by then, they'll be included in the merge!_")
    return fb


def post_feedback(num, title):
    fb = get_feedback(title)
    tmp = f"/tmp/fb_{num}.md"
    with open(tmp, "w") as f:
        f.write(fb)
    _, _, rc = run(f"gh pr comment {num} --body-file {tmp}", 20)
    try:
        os.remove(tmp)
    except OSError:
        pass
    return rc == 0


def get_head_sha(branch):
    out, _, _ = run(f"git ls-remote origin refs/heads/{branch}", 15)
    return out.split()[0] if out else ""


# ─── Merge ────────────────────────────────────────────────────────────────────

def try_merge(num, title):
    safe = title.replace('"', "'")[:65]
    _, _, rc = run(f'gh pr merge {num} --squash --admin --subject "{safe} (#{num})"', 30)
    return rc == 0


def clean_state():
    run("git rebase --abort 2>/dev/null; git merge --abort 2>/dev/null; git checkout -f main", 20)
    run("git pull origin main --ff-only 2>/dev/null || git reset --hard origin/main", 20)


def rebase_and_push(branch):
    clean_state()
    run(f"git fetch origin {branch}", 20)
    run(f"git checkout -B __w origin/{branch}", 20)
    for _ in range(20):
        o, e, rc = run("git rebase origin/main", 90)
        if rc == 0:
            break
        combined = o + e
        if any(x in combined for x in ["nothing to commit", "No changes", "skipped"]):
            run("git rebase --skip", 10)
            continue
        conflicts, _, _ = run("git diff --name-only --diff-filter=U", 10)
        for f in conflicts.splitlines():
            f = f.strip()
            if not f:
                continue
            _, _, rc2 = run(f'git checkout --theirs -- "{f}"', 10)
            if rc2 != 0:
                run(f'git checkout --ours -- "{f}"', 10)
            run(f'git add -f -- "{f}"', 10)
        run("git add -u", 15)
        _, ce, crc = run("git rebase --continue", 30, env={"GIT_EDITOR": "true", "EDITOR": "true"})
        if crc != 0 and "nothing to commit" in ce:
            run("git rebase --skip", 10)
    else:
        clean_state()
        return False
    _, _, prc = run(f"git push origin HEAD:{branch} --force", 30)
    clean_state()
    return prc == 0


# ─── Main loop ────────────────────────────────────────────────────────────────

print(f"🤖 auto_improve_merge.py | repo: {REPO}", flush=True)
print(f"   feedback wait: {args.wait_minutes} min | poll: {POLL_INTERVAL}s\n", flush=True)
idle_rounds = total_merged = total_commented = 0

try:
    while True:
        now_ts = time.time()
        now_str = time.strftime("%H:%M:%S")

        # ── Phase 1: Detect new PRs, post feedback ────────────────────────────
        out, _, rc = run(
            "gh pr list --state open --limit 100 "
            "--json number,title,body,headRefName,headRefOid "
            "--jq '.[] | [.number,.headRefName,.title,.body,.headRefOid] | @json'",
            30
        )

        # Validate gh response (anti-pattern #6)
        if not out and rc != 0:
            print(f"[{now_str}] ⚠️  gh API error — skipping round", flush=True)
            time.sleep(POLL_INTERVAL)
            continue

        open_prs = {}
        for line in out.splitlines():
            try:
                p = json.loads(line)
                open_prs[p[0]] = {"branch": p[1], "title": p[2], "body": p[3], "sha": p[4]}
            except (json.JSONDecodeError, IndexError):
                pass

        new_prs = [num for num in open_prs if num not in SEEN]

        for num in new_prs:
            pr = open_prs[num]
            SEEN.add(num)
            title, branch, sha = pr["title"], pr["branch"], pr["sha"]
            print(f"[{now_str}] 🆕 #{num} {title[:55]}", flush=True)

            if is_graceful(title):
                print("  ⏭️  graceful — merging directly", flush=True)
                if rebase_and_push(branch) and try_merge(num, title):
                    total_merged += 1
                    print("  ✅ merged\n", flush=True)
                continue

            # Post feedback, then park in PENDING — do NOT merge yet
            if post_feedback(num, title):
                print(f"  💬 feedback posted — will merge in ~{args.wait_minutes} min\n", flush=True)
                total_commented += 1
            else:
                print("  ⚠️  feedback failed\n", flush=True)

            PENDING[num] = {
                "feedback_at": now_ts,
                "branch": branch,
                "title": title,
                "sha_at_feedback": sha,
            }
            _save_state({"seen": sorted(SEEN), "pending": PENDING})

        # ── Phase 2: Merge PRs where wait has elapsed ─────────────────────────
        ready = [num for num, p in list(PENDING.items())
                 if now_ts - p["feedback_at"] >= FEEDBACK_WAIT_SECONDS]

        for num in ready:
            p = PENDING.pop(num)
            branch, title = p["branch"], p["title"]

            # Check if Jules pushed new commits (responded to feedback)
            current_sha = get_head_sha(branch)
            jules_responded = current_sha and current_sha != p["sha_at_feedback"]

            tag = "Jules responded! 🎉" if jules_responded else "no Jules response"
            print(f"[{now_str}] 🔀 merging #{num} ({tag})", flush=True)

            if rebase_and_push(branch):
                time.sleep(5)
                if try_merge(num, title):
                    total_merged += 1
                    print(f"  ✅ merged\n", flush=True)
                else:
                    time.sleep(10)
                    if try_merge(num, title):
                        total_merged += 1
                        print(f"  ✅ merged (retry)\n", flush=True)
                    else:
                        print(f"  ⏳ still not mergeable — will retry next round\n", flush=True)
                        PENDING[num] = p  # put back
            else:
                print(f"  ❌ rebase failed — leaving for author\n", flush=True)

            _save_state({"seen": sorted(SEEN), "pending": PENDING})

        # ── Status ────────────────────────────────────────────────────────────
        waiting = [(num, int((FEEDBACK_WAIT_SECONDS - (now_ts - p["feedback_at"])) / 60))
                   for num, p in PENDING.items()]
        if new_prs or ready:
            idle_rounds = 0
        else:
            idle_rounds += 1

        status = f"[{now_str}] open={len(open_prs)} | pending_merge={len(PENDING)}"
        if waiting:
            wstr = " ".join(f"#{n}({m}m)" for n, m in waiting[:5])
            status += f" | waiting: {wstr}"
        status += f" | idle={idle_rounds}/{IDLE_EXIT_AFTER}"
        print(status, flush=True)

        if idle_rounds >= IDLE_EXIT_AFTER:
            print("\nLong idle with no new PRs — exiting.")
            break

        time.sleep(POLL_INTERVAL)

except KeyboardInterrupt:
    print("\n⛔ Interrupted.")

_save_state({"seen": sorted(SEEN), "pending": PENDING})
print(f"\n📊 Commented: {total_commented} | Merged: {total_merged}")
