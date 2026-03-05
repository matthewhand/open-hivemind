#!/usr/bin/env python3
"""
scripts/force_merge.py — Batch rebase + admin squash-merge all open PRs

Iterates every open PR:
  1. Direct admin squash-merge (fast path)
  2. If rejected: checkout → rebase --theirs → force-push → retry merge
  3. If all else fails: close with a note

Usage (from repo root):
  python3 scripts/force_merge.py
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


def run(cmd, timeout=60, env=None):
    e = os.environ.copy()
    if env:
        e.update(env)
    r = subprocess.run(
        cmd, shell=True, capture_output=True, text=True,
        timeout=timeout, cwd=REPO_PATH, env=e
    )
    return r.stdout.strip(), r.stderr.strip(), r.returncode


def clean():
    run("git rebase --abort 2>/dev/null; git merge --abort 2>/dev/null; git clean -fd 2>/dev/null; git checkout -f main", 20)
    run("git pull origin main --ff-only 2>/dev/null || git reset --hard origin/main", 20)


def merge_pr(num, title):
    safe = title.replace('"', "'")[:65]
    out, err, rc = run(f'gh api repos/{REPO}/pulls/{num}/merge -X PUT -f merge_method=squash -f commit_title="{safe} (#{num})"', 30)
    return rc == 0 or '"merged":true' in out or "merged" in (out + err).lower()


out, _, _ = run(
    "gh pr list --state open --limit 100 "
    "--json number,title,headRefName "
    "--jq '.[] | [.number,.headRefName,.title] | @json'",
    30
)
prs = []
for line in out.splitlines():
    try:
        p = json.loads(line)
        prs.append({"num": p[0], "branch": p[1], "title": p[2]})
    except (json.JSONDecodeError, IndexError):
        pass

print(f"Open PRs to process: {len(prs)} | repo: {REPO}\n")
merged = failed = 0

for pr in prs:
    num, branch, title = pr["num"], pr["branch"], pr["title"]
    print(f"#{num} {title[:55]}", flush=True)

    if merge_pr(num, title):
        print("  ✅ direct merge\n", flush=True)
        merged += 1
        time.sleep(0.5)
        continue

    clean()
    run(f"git fetch origin {branch}", 20)
    run(f"git checkout -B __wrk origin/{branch}", 20)

    done = False
    for _ in range(20):
        out2, err2, rc = run("git rebase origin/main", 90)
        combined = out2 + err2
        if rc == 0:
            done = True
            break
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

    if not done:
        print("  ❌ rebase failed\n", flush=True)
        clean()
        failed += 1
        continue

    _, ferr, frc = run(f"git push origin HEAD:{branch} --force", 30)
    if frc != 0:
        print(f"  ❌ push failed: {ferr[:60]}\n", flush=True)
        clean()
        failed += 1
        continue

    clean()
    time.sleep(3)

    if merge_pr(num, title):
        print("  ✅ rebase+merged\n", flush=True)
        merged += 1
    else:
        o, e, r = run(f'gh pr merge {num} --squash --admin --subject "{title[:60]} (#{num})"', 20)
        if r == 0:
            print("  ✅ admin merged\n", flush=True)
            merged += 1
        else:
            print("  🔒 closing (likely already in main)\n", flush=True)
            run(f"gh api repos/{REPO}/pulls/{num} -X PATCH -f state=closed", 15)
            failed += 1
    time.sleep(0.5)

print(f"\n✅ Merged: {merged}  ❌ Failed/closed: {failed}")
