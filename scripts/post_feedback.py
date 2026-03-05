#!/usr/bin/env python3
"""
scripts/post_feedback.py — Phase 1: Post scope-widening feedback on open PRs

Detects new open PRs (not previously seen), posts 3-idea feedback, and writes
a pending.json summary for the human/AI reviewer to inspect later.

Usage (from repo root):
  python3 scripts/post_feedback.py [--limit N]

This is a ONE-SHOT script, not a watcher. Run it once, let Jules work,
then run check_responses.py to see what changed.
"""
import subprocess, json, time, os, re, argparse

parser = argparse.ArgumentParser()
parser.add_argument("--limit", type=int, default=20, help="Max PRs to process (default: 20)")
args = parser.parse_args()

REPO_PATH = subprocess.check_output(
    ["git", "rev-parse", "--show-toplevel"],
    cwd=os.path.dirname(os.path.abspath(__file__)), text=True
).strip()
_remote = subprocess.check_output(
    ["git", "remote", "get-url", "origin"], cwd=REPO_PATH, text=True
).strip()
REPO = re.sub(r".*github\.com[:/](.+?)(?:\.git)?$", r"\1", _remote)

PENDING_FILE = os.path.join(REPO_PATH, ".pending_prs.json")
pending = json.load(open(PENDING_FILE)) if os.path.exists(PENDING_FILE) else {}


def run(cmd, timeout=30):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True,
                          timeout=timeout, cwd=REPO_PATH).stdout.strip()


def get_feedback(title):
    t = title.lower()
    if any(x in t for x in ["form", "input", "field"]):
        ideas = [
            "**Idea 1:** Audit remaining raw `<input>`/`<select>` not migrated to DaisyUI wrappers.",
            "**Idea 2:** Add blur-only inline validation with `text-error` helper text.",
            "**Idea 3:** Add `aria-describedby` linking each field to its error message.",
        ]
    elif any(x in t for x in ["modal", "dialog", "backdrop"]):
        ideas = [
            "**Idea 1:** Audit every modal for `div.modal-open` → native `<dialog>` + `showModal()`.",
            "**Idea 2:** Add keyboard focus trap (Tab cycles within modal, WCAG 2.1.2).",
            "**Idea 3:** Add Playwright test: Escape closes modal, focus returns to trigger.",
        ]
    elif any(x in t for x in ["screenshot", "doc", "guide", "readme"]):
        ideas = [
            "**Idea 1:** Add screenshots for every major page not yet covered in the docs.",
            "**Idea 2:** Add a CI step that fails if any screenshot referenced in markdown is missing.",
            "**Idea 3:** For fix PRs, include a before-screenshot alongside the after.",
        ]
    elif any(x in t for x in ["test", "spec", "coverage"]):
        ideas = [
            "**Idea 1:** Add 5+ edge case tests: empty input, max-length, network error.",
            "**Idea 2:** Add a Vitest snapshot test to lock in the rendered output.",
            "**Idea 3:** Enable `strict: true` in the relevant tsconfig and fix any new errors.",
        ]
    elif any(x in t for x in ["mcp", "server", "provider"]):
        ideas = [
            "**Idea 1:** Show `lastConnected` as a human-readable relative time ('2 mins ago').",
            "**Idea 2:** Display `tools.length` as a badge on each server card.",
            "**Idea 3:** Add a distinct visual state + Reconnect button for disconnected servers.",
        ]
    else:
        ideas = [
            "**Idea 1:** Find 2–3 adjacent components with the same issue and fix all of them.",
            "**Idea 2:** Write 3 unit tests: happy path, error case, edge case.",
            "**Idea 3:** Add JSDoc to new/modified functions: params, returns, side-effects.",
        ]
    body = "## 🚀 Scope Widening Feedback\n\n"
    body += "Thanks for this PR! Here are **3 ideas** to widen its impact:\n\n"
    for idea in ideas:
        body += f"{idea}\n\n"
    body += "_Push any improvements to this branch — we'll review before merging._"
    return body


out = run(
    "gh pr list --state open --limit 100 "
    "--json number,title,headRefName,headRefOid "
    "--jq '.[] | [.number,.headRefName,.title,.headRefOid] | @json'"
)

if not out:
    print("⚠️  No open PRs or gh API error.")
    raise SystemExit(0)

processed = 0
for line in out.splitlines():
    if processed >= args.limit:
        break
    try:
        p = json.loads(line)
        num, branch, title, sha = p[0], p[1], p[2], p[3]
    except Exception:
        continue

    if str(num) in pending:
        print(f"#{num} already pending — skipping")
        continue

    print(f"#{num} {title[:60]}")
    fb = get_feedback(title)
    tmp = f"/tmp/fb_{num}.md"
    open(tmp, "w").write(fb)
    rc = subprocess.run(f"gh pr comment {num} --body-file {tmp}",
                        shell=True, cwd=REPO_PATH).returncode
    try:
        os.remove(tmp)
    except OSError:
        pass

    if rc == 0:
        pending[str(num)] = {
            "branch": branch,
            "title": title,
            "sha_at_feedback": sha,
            "feedback_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        print(f"  💬 feedback posted")
        processed += 1
    else:
        print(f"  ⚠️  gh comment failed")
    time.sleep(0.3)

with open(PENDING_FILE, "w") as f:
    json.dump(pending, f, indent=2)

print(f"\nPosted feedback on {processed} PR(s). Pending file: .pending_prs.json")
print("Next: wait for Jules (~30 min), then run: python3 scripts/check_responses.py")
