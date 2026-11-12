"""Check the four Writer-style answers against immutable local ODT files.

Run from any directory: python3 docs/audits/ege-informatics-word-final-2026-11-05/verify.py
The independent oracle tokenizes Unicode letters; JS scans character positions.
No network access or database writes.
"""
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
EXPECTED = {
    "EGEINF2F9ABA": (38, 34),
    "EGEINF671119": (37, 35),
    "EGEINF870FE9": (11, 15),
    "EGEINFE4A3C2": (52, 54),
}
proofs = json.loads((ROOT / "scripts/data/ege-informatics-mirror-library-proofs.json").read_text())
records = {r["id"]: r for r in json.loads((ROOT / "scripts/data/ege-informatics-mirror-library-records.json").read_text())}
for task_id, expected in EXPECTED.items():
    proof = proofs[task_id]
    data = proof["data"]
    raw = (ROOT / "fipi-assets/ege-informatics/docs/restored-library" / (task_id + ".odt")).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == data["fileSha256"]
    doc = json.loads(subprocess.check_output(["python3", str(ROOT / "scripts/lib/read-ege-informatics-odt.py")], input=raw))
    assert doc["notes"] == 0
    text = "\n".join(doc["paragraphs"])
    assert all(ord(c) < 65536 for c in text), "Python and JS offsets must agree"
    for hyphens, answer in zip(("boundary", "compound"), expected):
        pattern = r"[^\W\d_]+" + (r"(?:[-‑][^\W\d_]+)*" if hyphens == "compound" else "")
        words = list(re.finditer(pattern, text))
        model = dict(data["model"], hyphens=hyphens)
        terms = model["terms"]
        if model["mode"] == "whole":
            positions = [m.start() for m in words if m.group() in terms]
        else:
            positions = [m.start() for m in words if m.group() not in terms and any(t in m.group() for t in terms)]
        js = json.loads(subprocess.check_output([
            "node", "-e",
            "const fs=require('fs'),m=require(process.argv[1]),d=JSON.parse(fs.readFileSync(0,'utf8'));console.log(JSON.stringify(m.solve(d.paragraphs,d.model)));",
            str(ROOT / "scripts/lib/ege-informatics-mirror-library-machine.js"),
        ], input=json.dumps({"paragraphs": doc["paragraphs"], "model": model}).encode()))
        assert positions == js["selectedPositions"]
        assert len(positions) == answer == js["answer"]
        if hyphens == "boundary":
            assert js == data["result"]
            assert records[task_id]["answer"] == proof["answer"] == str(answer)
            assert "дефис" in records[task_id]["solution"]
    print(task_id, "Writer:", expected[0], "compound-word alternative:", expected[1])
