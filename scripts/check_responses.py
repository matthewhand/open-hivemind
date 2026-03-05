#!/usr/bin/env python3
"""
scripts/check_responses.py — Phase 2: Review what Jules changed in response to feedback

For each pending PR in .pending_prs.json, shows:
  - Whether Jules pushed new commits (SHA changed)
  - List of changed files
  - New test files added
  - Whether it's ready to merge

Usage (from repo root):
  python3 scripts/check_responses.py

Output is a human/AI-readable report. You decide what to merge.
Then run: python3 scripts/merge_pr.py <num>
"""
import subprocess, json, os, re

REPO_PATH = subprocess.check_output(
    ["git", "rev-parse", "--show-toplevel"],
    cwd=os.path.dirname(os.path.abspath(__file__)), text=True
).strip()

PENDING_FILE = os.path.join(REPO_PATH, ".pending_prs.json")

if not os.path.exists(PENDING_FILE):
    print("No .pending_prs.json found. Run post_feedback.py first.")
    raise SystemExit(1)

pending = json.load(open(PENDING_FILE))
if not pending:
    print("No pending PRs.")
    raise SystemExit(0)


def run(cmd, timeout=20):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                       timeout=timeout, cwd=REPO_PATH)
    return r.stdout.strip()


def get_current_sha(branch):
    out = run(f"git ls-remote origin refs/heads/{branch}")
    return out.split()[0] if out else ""


print(f"{'PR':<6} {'Responded?':<14} {'Files':>6} {'Tests':>6}  Title")
print("─" * 80)

ready_to_merge = []
waiting = []

for num_str, info in sorted(pending.items(), key=lambda x: int(x[0])):
    num = int(num_str)
    branch = info["branch"]
    title = info["title"][:50]
    sha_before = info["sha_at_feedback"]
    feedback_at = info.get("feedback_at", "?")

    run(f"git fetch origin {branch} 2>/dev/null")
    current_sha = get_current_sha(branch)

    jules_responded = current_sha and current_sha != sha_before

    if jules_responded:
        # Get diff stats since feedback SHA
        diff_stat = run(f"git diff --name-only {sha_before}..origin/{branch} 2>/dev/null")
        files = [f for f in diff_stat.splitlines() if f.strip()]
        tests = [f for f in files if re.search(r'\.(test|spec)\.(ts|tsx|js)$', f)]
        file_count = len(files)
        test_count = len(tests)
        flag = "✅ YES"
        ready_to_merge.append(num)
    else:
        file_count = test_count = 0
        flag = "⏳ no"
        waiting.append(num)

    print(f"#{num:<5} {flag:<14} {file_count:>6} {test_count:>6}  {title}")
    if jules_responded and files:
        for f in files[:5]:
            print(f"         + {f}")
        if len(files) > 5:
            print(f"         ... and {len(files)-5} more")

print()
print(f"Ready to merge ({len(ready_to_merge)}): {ready_to_merge}")
print(f"Still waiting  ({len(waiting)}):  {waiting}")
print()
print("To merge a reviewed PR:")
print("  python3 scripts/merge_pr.py <num>")
print()
print("To merge all ready PRs without further review:")
print(f"  python3 scripts/merge_pr.py {' '.join(str(n) for n in ready_to_merge)}")
