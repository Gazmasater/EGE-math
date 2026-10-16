"""Collect Wordstat through Direct Live 4. Never prints or saves credentials.

Usage: python3 collect.py seeds.json broad.json
The input is a JSON list of phrases. Reports are checkpointed before deletion.
Only reports created by this run are deleted; campaigns are never accessed.
"""
import argparse
import datetime as dt
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

ENDPOINT = "https://api.direct.yandex.ru/live/v4/json/"


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def token():
    value = os.environ.get("YANDEX_DIRECT_TOKEN")
    if value:
        return value
    path = Path(os.environ.get("WORDSTAT_ENV_FILE", "/etc/api-direct/api-direct.env"))
    for line in path.read_text().splitlines():
        if line.startswith("YANDEX_DIRECT_TOKEN="):
            return line.split("=", 1)[1].strip().strip("\"'")
    raise RuntimeError("YANDEX_DIRECT_TOKEN is not configured")


def call_once(method, param=None):
    payload = {"method": method, "token": token(), "locale": "ru"}
    if param is not None:
        payload["param"] = param
    req = urllib.request.Request(ENDPOINT, data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                                 headers={"Content-Type": "application/json; charset=utf-8"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        try:
            return json.load(exc)
        except ValueError:
            return {"http_status": exc.code}


def call(method, param=None):
    # A timed-out creation must not be retried blindly: it may have committed.
    for attempt in range(3 if method != "CreateNewWordstatReport" else 1):
        try:
            return call_once(method, param)
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if method == "CreateNewWordstatReport" or attempt == 2:
                raise RuntimeError(f"Network error during {method}; inspect saved report state") from None
            time.sleep(2)


def save(path, data):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("phrases", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    phrases = list(dict.fromkeys(json.loads(args.phrases.read_text())))
    if args.output.exists():
        data = json.loads(args.output.read_text())
        if data["phrases"] != phrases or data["geo_ids"] != [225]:
            raise RuntimeError("Existing output uses different parameters")
    else:
        data = {"started_at": now(), "endpoint": ENDPOINT,
                "geo_ids": [225], "geo_name": "Россия", "device_filter": None,
                "period": "Monthly estimate returned by Direct Wordstat; exact date boundaries are not returned",
                "phrases": phrases, "batches": []}
    for batch in data["batches"]:
        if batch.get("status") == "pending":
            raise RuntimeError("Resume the saved pending report before creating another")
        if batch.get("status") == "complete" and not batch.get("cleanup_response"):
            batch["cleanup_response"] = call("DeleteWordstatReport", batch["report_id"])
            save(args.output, data)
    complete = {p for b in data["batches"] if b.get("status") == "complete" for p in b["phrases"]}
    remaining = [p for p in phrases if p not in complete]
    for start in range(0, len(remaining), 10):
        batch = {"phrases": remaining[start:start + 10], "created_at": now()}
        created = call("CreateNewWordstatReport", {"Phrases": batch["phrases"], "GeoID": [225]})
        rid = created.get("data")
        if not isinstance(rid, int):
            batch.update(status="create_error", response=created)
            data["batches"].append(batch)
            save(args.output, data)
            raise RuntimeError("Wordstat creation failed: " + str(created.get("error_code", created.get("http_status"))))
        batch.update(report_id=rid, status="pending")
        data["batches"].append(batch)
        save(args.output, data)
        print(f"Created batch {start // 10 + 1}: {len(batch['phrases'])} phrases", flush=True)
        for attempt in range(50):
            response = call("GetWordstatReport", rid)
            if isinstance(response.get("data"), list):
                batch.update(status="complete", retrieved_at=now(), response=response)
                save(args.output, data)
                deleted = call("DeleteWordstatReport", rid)
                batch["cleanup_response"] = deleted
                save(args.output, data)
                print(f"Saved {len(response['data'])} seed results; cleaned={deleted.get('data') == 1}", flush=True)
                break
            if response.get("error_code") != 92:
                batch.update(status="get_error", response=response)
                save(args.output, data)
                raise RuntimeError("Wordstat retrieval failed: " + str(response.get("error_code")))
            time.sleep(5)
        else:
            raise RuntimeError("Report remains pending; its ID is saved for recovery")
    data["completed_at"] = now()
    save(args.output, data)
    print(f"Completed {len(phrases)} phrases: {args.output.name}", flush=True)


if __name__ == "__main__":
    main()
