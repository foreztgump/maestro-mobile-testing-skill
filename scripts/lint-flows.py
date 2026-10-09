#!/usr/bin/env python3
"""Run `maestro check-syntax` on every flow in the skill.

Checks each template under templates/ and each ```yaml block in the
markdown. A block counts as a flow when it has a `---` separator or starts
with a command list item. Commands-only blocks get a stub `appId` header.
Config and CI snippets don't match that test, so they are skipped.

Usage: scripts/lint-flows.py [skill_dir]   (MAESTRO_BIN overrides `maestro`)
"""
import os
import re
import subprocess
import sys
from pathlib import Path

STUB_HEADER = "appId: com.example.lint\n---\n"


def is_flow(body):
    if re.search(r"^---\s*$", body, re.M):
        return True
    first = next((l for l in body.splitlines() if l.strip() and not l.lstrip().startswith("#")), "")
    return first.startswith("- ")


def as_flow(body):
    return body if re.search(r"^---\s*$", body, re.M) else STUB_HEADER + body


def snippets(skill_dir):
    for md in sorted(skill_dir.rglob("*.md")):
        text = md.read_text()
        for m in re.finditer(r"^```yaml\n(.*?)^```", text, re.S | re.M):
            yield md, text.count("\n", 0, m.start()) + 2, m.group(1)
    for flow in sorted((skill_dir / "templates").rglob("*.yaml")):
        yield flow, 1, flow.read_text()


def check(maestro, body):
    proc = subprocess.run([maestro, "check-syntax", "-"], input=body, capture_output=True, text=True)
    if proc.returncode == 0:
        return None
    out = proc.stdout + proc.stderr
    lines = [l.strip(" │╭╮╰╯─") for l in out.splitlines()]
    reasons = [l for l in lines if l.startswith(">") or re.search(r"not a valid|must|Unknown|Invalid|Expected", l)]
    return " ".join(reasons[:3]) or out.strip().splitlines()[-1]


def main():
    skill_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "skills/maestro-mobile-testing")
    maestro = os.environ.get("MAESTRO_BIN", "maestro")
    checked = failed = 0
    for path, line, body in snippets(skill_dir):
        if not is_flow(body):
            continue
        checked += 1
        error = check(maestro, as_flow(body))
        if error:
            failed += 1
            print(f"{path}:{line}: {error}")
    print(f"{checked} flows checked, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
