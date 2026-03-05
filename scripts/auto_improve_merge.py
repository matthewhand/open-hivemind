#!/usr/bin/env python3
"""
scripts/auto_improve_merge.py — Continuous Jules-fleet PR pipeline

For each new PR discovered:
  1. Post 3-idea scope-widening feedback comment
  2. Rebase branch onto main (resolve conflicts with --theirs)
  3. Squash-merge via admin API

Usage (from repo root):
  python3 scripts/auto_improve_merge.py

Polls every 60s. Exits after 30 idle rounds (~30 min with no new PRs).
"""
import subprocess, json, time, os, re

# Auto-detect repo root — portable, works in any clone
REPO_PATH = subprocess.check_output(
    ["git", "rev-parse", "--show-toplevel"],
    cwd=os.path.dirname(os.path.abspath(__file__)),
    text=True
).strip()

# Read GitHub repo from git remote
_remote = subprocess.check_output(
    ["git", "remote", "get-url", "origin"],
    cwd=REPO_PATH, text=True
).strip()
REPO = re.sub(r".*github\.com[:/](.+?)(?:\.git)?$", r"\1", _remote)

POLL_INTERVAL = 60
IDLE_EXIT_AFTER = 30
SEEN: set = set()


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


# ─── Feedback generation ──────────────────────────────────────────────────────

def get_feedback(title, body):
    t = title.lower()
    if any(x in t for x in ["form", "input", "field", "config form"]):
        ideas = [
            "**Idea 1 — Full field audit:** Find remaining raw `<input>`/`<select>`/`<textarea>` not yet migrated to DaisyUI wrappers.",
            "**Idea 2 — Inline validation:** Add `text-error` helper below each field on blur before submit.",
            "**Idea 3 — Accessibility:** Ensure every field has `<label for=...>` and `aria-describedby` on error messages.",
        ]
    elif any(x in t for x in ["modal", "backdrop", "dialog"]):
        ideas = [
            "**Idea 1 — Audit all modals:** Apply `<dialog>` + `showModal()` pattern to every modal in the app.",
            "**Idea 2 — Focus trap:** Add keyboard focus trap (WCAG 2.1.2).",
            "**Idea 3 — Escape dismissal:** Ensure Escape closes modals and restores focus to the trigger element.",
        ]
    elif any(x in t for x in ["websocket", "ws", "realtime", "real-time"]):
        ideas = [
            "**Idea 1 — Reconnection:** Add exponential backoff reconnect (1s → 30s max).",
            "**Idea 2 — Event docs:** JSDoc every emit/on call with payload shape and purpose.",
            "**Idea 3 — Cleanup:** `useEffect` cleanup calling `socket.off(eventName)` on unmount.",
        ]
    elif any(x in t for x in ["test", "lint", "type", "janitor"]):
        ideas = [
            "**Idea 1 — Coverage:** Add 5+ test cases for edge cases (empty, max-length, network errors).",
            "**Idea 2 — Snapshot:** Add a Jest/Vitest snapshot to lock in rendered output.",
            "**Idea 3 — Strict types:** Enable `strict: true` in the module tsconfig and fix new errors.",
        ]
    elif any(x in t for x in ["chart", "analytics", "dashboard", "metric"]):
        ideas = [
            "**Idea 1 — Tooltips:** Add hover tooltips showing exact value and timestamp on each data point.",
            "**Idea 2 — Export:** Add CSV/PNG download button.",
            "**Idea 3 — Time range:** Add a 1h/24h/7d/30d filter that updates without page reload.",
        ]
    elif any(x in t for x in ["cors", "security", "header", "csp", "rate"]):
        ideas = [
            "**Idea 1 — Full route audit:** Find every route missing the fix and apply it.",
            "**Idea 2 — Security headers:** Add HSTS, X-Content-Type-Options, X-Frame-Options, CSP.",
            "**Idea 3 — Integration test:** Assert disallowed origins get 403, allowed origins get 200.",
        ]
    elif any(x in t for x in ["avatar", "placeholder", "image", "icon"]):
        ideas = [
            "**Idea 1 — All avatar contexts:** Apply the fix wherever bot avatars appear (sidebar, chat, list).",
            "**Idea 2 — Fallback hierarchy:** Initials → custom avatar → generic icon.",
            "**Idea 3 — Alt text:** Add descriptive `alt` text for screen readers.",
        ]
    elif any(x in t for x in ["mcp", "server", "card", "list"]):
        ideas = [
            "**Idea 1 — Timestamps:** Show `lastConnected` as relative time (e.g. '2 mins ago').",
            "**Idea 2 — Tool count badge:** Display `tools.length` on each card.",
            "**Idea 3 — Disconnected state:** Distinct visual + Reconnect button for offline servers.",
        ]
    else:
        ideas = [
            "**Idea 1 — Broader coverage:** Find 2–3 adjacent components with the same issue and fix all.",
            "**Idea 2 — Tests:** Write 3 unit tests — happy path, error case, edge case.",
            "**Idea 3 — Docs:** Add JSDoc to new/modified functions (params, returns, side-effects).",
        ]
    fb = "## 🚀 Scope Widening Feedback\n\n"
    fb += "Thanks for this PR! Here are **3 ideas** to widen its impact before we merge:\n\n"
    for idea in ideas:
        fb += f"{idea}\n\n"
    fb += "_Please broaden the changes and push — we want to merge the fullest version of this fix!_"
    return fb


def post_feedback(num, title, body):
    fb = get_feedback(title, body)
    tmp = f"/tmp/fb_{num}.md"
    with open(tmp, "w") as f:
        f.write(fb)
    _, _, rc = run(f"gh pr comment {num} --body-file {tmp}", 20)
    try:
        os.remove(tmp)
    except OSError:
        pass
    return rc == 0


# ─── Merge ────────────────────────────────────────────────────────────────────

def try_merge(num, title):
    safe = title.replace('"', "'")[:65]
    _, _, rc = run(f'gh pr merge {num} --squash --admin --subject "{safe} (#{num})"', 30)
    return rc == 0


# ─── Rebase + push ────────────────────────────────────────────────────────────

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


# ─── Main ─────────────────────────────────────────────────────────────────────

print(f"🤖 auto_improve_merge.py | repo: {REPO} | root: {REPO_PATH}\n", flush=True)
idle_rounds = total_merged = total_commented = 0

try:
    while True:
        out, _, _ = run(
            "gh pr list --state open --limit 100 "
            "--json number,title,body,headRefName "
            "--jq '.[] | [.number,.headRefName,.title,.body] | @json'",
            30
        )
        prs = []
        for line in out.splitlines():
            try:
                p = json.loads(line)
                prs.append({"num": p[0], "branch": p[1], "title": p[2], "body": p[3]})
            except (json.JSONDecodeError, IndexError):
                pass

        new_prs = [p for p in prs if p["num"] not in SEEN]
        now = time.strftime("%H:%M:%S")

        if not new_prs:
            idle_rounds += 1
            print(f"[{now}] {len(prs)} open, 0 new. Idle {idle_rounds}/{IDLE_EXIT_AFTER}", flush=True)
            if idle_rounds >= IDLE_EXIT_AFTER:
                print("\nLong idle — exiting.")
                break
        else:
            idle_rounds = 0
            for pr in new_prs:
                num, branch, title, body = pr["num"], pr["branch"], pr["title"], pr["body"]
                SEEN.add(num)
                print(f"[{now}] 🆕 #{num} {title[:55]}", flush=True)
                if is_graceful(title):
                    print("  ⏭️  graceful — merging directly", flush=True)
                    if try_merge(num, title):
                        total_merged += 1
                    continue
                if post_feedback(num, title, body):
                    print("  💬 feedback posted", flush=True)
                    total_commented += 1
                if rebase_and_push(branch):
                    print("  🔄 rebased", flush=True)
                    time.sleep(5)
                    if try_merge(num, title) or (time.sleep(10) or try_merge(num, title)):  # type: ignore
                        print("  ✅ merged", flush=True)
                        total_merged += 1
                    else:
                        print("  ⏳ not mergeable yet", flush=True)
                else:
                    print("  ❌ rebase failed — leaving for author", flush=True)
                time.sleep(0.5)

        time.sleep(POLL_INTERVAL)

except KeyboardInterrupt:
    print("\n⛔ Interrupted.")

print(f"\n📊 Commented: {total_commented} | Merged: {total_merged}")
