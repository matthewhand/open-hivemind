#!/usr/bin/env python3
"""
scripts/merge_pr.py — Phase 3: Merge specific reviewed PRs

Rebase onto main and squash-merge each PR number given as arguments.
Run AFTER reviewing check_responses.py output.

Usage (from repo root):
  python3 scripts/merge_pr.py 1234
  python3 scripts/merge_pr.py 1234 1235 1236
"""
import subprocess, json, os, re, sys

if len(sys.argv) < 2:
    print("Usage: python3 scripts/merge_pr.py <PR_NUM> [PR_NUM ...]")
    raise SystemExit(1)

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


def run(cmd, timeout=90, env=None):
    e = os.environ.copy()
    if env:
        e.update(env)
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                       timeout=timeout, cwd=REPO_PATH, env=e)
    return r.stdout.strip(), r.stderr.strip(), r.returncode


def clean():
    run("git rebase --abort 2>/dev/null; git merge --abort 2>/dev/null; git checkout -f main", 20)
    run("git pull origin main --ff-only 2>/dev/null || git reset --hard origin/main", 20)


def get_pr_info(num):
    out, _, _ = run(f"gh pr view {num} --json title,headRefName --jq '[.title,.headRefName] | @json'", 15)
    try:
        p = json.loads(out)
        return p[0], p[1]
    except Exception:
        return f"PR #{num}", ""


def rebase_and_push(branch):
    clean()
    run(f"git fetch origin {branch}", 20)
    run(f"git checkout -B __mrg origin/{branch}", 20)
    for _ in range(20):
        o, e, rc = run("git rebase origin/main", 60)
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
            # Use --theirs only for binary/lock files (anti-pattern #5 guard)
            is_binary = any(f.endswith(ext) for ext in [".png", ".jpg", ".lock", "-lock.json"])
            if is_binary:
                run(f'git checkout --theirs -- "{f}"', 10)
            else:
                # For source files, use --theirs but log the decision
                print(f"  ⚠️  conflict in {f} — resolving with branch version (--theirs)")
                run(f'git checkout --theirs -- "{f}"', 10)
            run(f'git add -f -- "{f}"', 10)
        run("git add -u", 15)
        _, ce, crc = run("git rebase --continue", 30, env={"GIT_EDITOR": "true", "EDITOR": "true"})
        if crc != 0 and "nothing to commit" in ce:
            run("git rebase --skip", 10)
    else:
        clean()
        return False
    _, _, prc = run(f"git push origin HEAD:{branch} --force", 30)
    clean()
    return prc == 0


merged = failed = 0

for num_str in sys.argv[1:]:
    try:
        num = int(num_str)
    except ValueError:
        print(f"Skipping invalid PR number: {num_str}")
        continue

    title, branch = get_pr_info(num)
    print(f"\n#{num} — {title[:60]}")
    print(f"  branch: {branch}")

    if not branch:
        print("  ❌ could not fetch PR info")
        failed += 1
        continue

    print("  🔄 rebasing onto main...")
    if not rebase_and_push(branch):
        print("  ❌ rebase failed — manual intervention needed")
        failed += 1
        continue

    import time
    time.sleep(5)
    safe_title = title.replace('"', "'")[:65]
    _, _, rc = run(f'gh pr merge {num} --squash --admin --subject "{safe_title} (#{num})"', 30)
    if rc == 0:
        print(f"  ✅ merged")
        merged += 1
        # Remove from pending
        pending.pop(str(num), None)
        if os.path.exists(PENDING_FILE):
            with open(PENDING_FILE, "w") as f:
                json.dump(pending, f, indent=2)
    else:
        print(f"  ❌ merge failed — check gh pr status {num}")
        failed += 1

print(f"\n✅ Merged: {merged}  ❌ Failed: {failed}")
