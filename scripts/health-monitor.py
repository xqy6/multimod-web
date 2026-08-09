import base64
import json
import os
import time
import urllib.error
import urllib.request

repo = os.environ["REPO"]
branch = os.environ["BRANCH"]
token = os.environ["GITHUB_TOKEN"]
health_url = os.environ["HEALTH_URL"]
webhook_url = os.environ.get("WEBHOOK_URL", "")
headers = {
    "Authorization": f"Bearer {token}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}


def github(method, path, payload=None):
    req = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/{path}",
        method=method,
        headers=headers,
        data=json.dumps(payload).encode() if payload is not None else None,
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            text = res.read().decode()
            return json.loads(text) if text else None
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise


def post_webhook(kind, status, details):
    if not webhook_url:
        print(f"{kind} webhook skipped (MONITOR_WEBHOOK_URL not set)")
        return
    payload = json.dumps(
        {
            "type": kind,
            "service": "netdisk-backend",
            "status": status,
            "details": details[:1000],
            "time": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        },
        ensure_ascii=False,
    ).encode()
    req = urllib.request.Request(
        webhook_url,
        method="POST",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        urllib.request.urlopen(req, timeout=20)
    except Exception as error:
        print(f"webhook failed: {error}")


try:
    with urllib.request.urlopen(
        urllib.request.Request(health_url, headers={"User-Agent": "health-monitor"}),
        timeout=20,
    ) as res:
        body = res.read().decode()
        current = json.loads(body).get("ok") is True
        details = body[:1000]
except Exception as error:
    current = False
    details = f"health request failed: {error}"

state_path = "netdisk-monitor-state.json"
existing = github("GET", f"contents/{state_path}?ref={branch}")
previous = None
if existing:
    try:
        previous = json.loads(base64.b64decode(existing["content"]))["status"]
    except Exception:
        previous = None

new_status = "ok" if current else "failed"
print(f"status={new_status} previous={previous or 'none'}")

if current and previous == "failed":
    post_webhook("health.recovered", "up", details)
if not current and previous != "failed":
    post_webhook("health.alert", "down", details)

if previous != new_status:
    content = json.dumps(
        {"status": new_status, "time": time.strftime("%Y-%m-%dT%H:%M:%S%z")},
        ensure_ascii=False,
    )
    payload = {
        "message": f"monitor: {new_status}",
        "content": base64.b64encode(content.encode()).decode(),
        "sha": existing["sha"] if existing else None,
        "branch": branch,
    }
    github("PUT", f"contents/{state_path}", payload)
    print(f"state saved: {new_status}")
