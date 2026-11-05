#!/usr/bin/env python3
"""Offline evidence only. Never imports solutions or writes the site database.

Usage: python3 verify.py > python-review.json
Requires Python 3 and unrar for the original RAR named .zip.
"""
from pathlib import Path
import collections
import hashlib
import heapq
import itertools
import json
import random
import re
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent
ARRIVALS = ('290F15', 'B3C563', 'A99635', '8ECB7C')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def digest(value):
    return sha(json.dumps(value, separators=(',', ':')).encode())


def load():
    manifest = json.loads((ROOT / 'manifest.json').read_text())
    cross = manifest['crossLinkedAttachment']
    assert sha((ROOT / cross['sameBytesAs']).read_bytes()) == cross['archiveSha256']
    assert sha((ROOT / cross['conditionFragment']).read_bytes()) == cross['conditionFragmentSha256']
    result = {}
    for item in manifest['attachments']:
        path = ROOT / item['path']
        data = path.read_bytes()
        assert len(data) == item['bytes'] and sha(data) == item['sha256']
        if data.startswith(b'PK'):
            with zipfile.ZipFile(path) as archive:
                assert archive.testzip() is None
                assert set(archive.namelist()) == {m['name'] for m in item['members']}
                members = {m['name']: archive.read(m['name']) for m in item['members']}
        else:
            assert data.startswith(b'Rar!')
            binary = shutil.which('unrar')
            assert binary, 'Install unrar to verify the original RAR archive'
            subprocess.run([binary, 't', '-inul', str(path)], check=True, stdout=subprocess.DEVNULL)
            members = {m['name']: subprocess.check_output(
                [binary, 'p', '-inul', str(path), m['name']]) for m in item['members']}
        for member in item['members']:
            b = members[member['name']]
            assert len(b) == member['bytes'] and sha(b) == member['sha256']
        result[item['id'][6:]] = {name: b.decode('utf-8-sig') for name, b in members.items()}
    return result


def parse_arrivals(text):
    lines = [list(map(int, line.split())) for line in text.splitlines()]
    assert len(lines[0]) == len(lines[1]) == 1
    k, n = lines[0][0], lines[1][0]
    rows = lines[2:]
    assert 0 < k <= 1000 and len(rows) == n <= 10000
    assert all(len(row) == 2 and 0 < row[0] < row[1] <= 1440 for row in rows)
    return k, [(a, b, i + 1) for i, (a, b) in enumerate(rows)]


def simulate(k, ordered):
    free = list(range(1, k + 1))
    busy = []
    count, latest, last_cell = 0, -1, None
    trace = []
    for start, end, index in ordered:
        while busy and busy[0][0] < start:
            _, cell = heapq.heappop(busy)
            heapq.heappush(free, cell)
        if not free:
            trace.append([index, 0])
            continue
        cell = heapq.heappop(free)
        heapq.heappush(busy, (end, cell))
        trace.append([index, cell])
        count += 1
        last_cell = cell if start > latest else min(cell, last_cell)
        latest = start
    return {'answer': [count, last_cell], 'lastStart': latest,
            'traceSha256': digest(trace)}, trace


def arrival_evidence(k, rows):
    stable = sorted(rows, key=lambda r: (r[0], r[2]))
    schedules = {
        'file-order': stable,
        'end-ascending': sorted(rows, key=lambda r: (r[0], r[1], r[2])),
        'end-descending': sorted(rows, key=lambda r: (r[0], -r[1], r[2])),
    }
    baseline, baseline_trace = simulate(k, stable)
    witness = None
    for pos in range(len(stable) - 1):
        if stable[pos][0] != stable[pos + 1][0]:
            continue
        candidate = stable.copy()
        candidate[pos], candidate[pos + 1] = candidate[pos + 1], candidate[pos]
        observed, trace = simulate(k, candidate)
        if observed['answer'] != baseline['answer']:
            before = dict(baseline_trace)
            after = dict(trace)
            changed = [r for r in stable if before[r[2]] != after[r[2]]]
            witness = {
                'minute': stable[pos][0],
                'requestIndices': [stable[pos][2], stable[pos + 1][2]],
                'physicalFileLines': [stable[pos][2] + 2, stable[pos + 1][2] + 2],
                'requests': [list(stable[pos]), list(stable[pos + 1])],
                'firstChangedAssignment': {
                    'request': list(changed[0]),
                    'fileOrderCell': before[changed[0][2]],
                    'swappedOrderCell': after[changed[0][2]],
                },
                'changedAssignments': len(changed),
            }
            schedules['single-tie-swap'] = candidate
            break
    assert witness is not None, 'No single-swap witness; investigate explicitly'
    variants = {name: simulate(k, order)[0] for name, order in schedules.items()}
    assert len({tuple(v['answer']) for v in variants.values()}) > 1
    return {'capacity': k, 'requests': len(rows),
            'tieGroups': sum(n > 1 for n in collections.Counter(r[0] for r in rows).values()),
            'variants': variants, 'singleSwap': witness}


def pair_run(text, consonants, vowels):
    pattern = '(?:[' + consonants + '][' + vowels + '])+'
    best = max(re.finditer(pattern, text), key=lambda m: len(m[0]), default=None)
    if best is None:
        return {'pairs': 0, 'start': None, 'end': None, 'text': ''}
    return {'pairs': len(best[0]) // 2, 'start': best.start() + 1,
            'end': best.end(), 'text': best[0]}


def boxes(sides, gap):
    chosen = []
    for side in sorted(sides, reverse=True):
        if not chosen or chosen[-1] - side >= gap:
            chosen.append(side)
    return [len(chosen), chosen[-1] if chosen else None]


def seats(occupied):
    groups = collections.defaultdict(set)
    for row, seat in occupied:
        groups[row].add(seat)
    for row in sorted(groups, reverse=True):
        ordered = sorted(groups[row])
        for left, right in zip(ordered, ordered[1:]):
            if right - left == 3:
                return [row, left + 1]
    return None


def laboratory(points, capacity):
    weights = [(tubes + capacity - 1) // capacity for _, tubes in points]
    total = sum(weights)
    prefix = 0
    for (position, _), weight in zip(points, weights):
        prefix += weight
        if 2 * prefix >= total:
            center = position
            break
    return sum(abs(position - center) * weight for (position, _), weight in zip(points, weights))


def self_check():
    rng = random.Random(20261105)
    assert simulate(2, [(30, 60, 1), (40, 1000, 2), (59, 60, 3),
                        (61, 1000, 4), (1010, 1440, 5)])[0]['answer'] == [4, 1]
    assert simulate(2, [(30, 60, 1), (40, 100, 2), (59, 60, 3),
                        (61, 100, 4), (101, 144, 5)])[0]['answer'] == [4, 1]
    assert simulate(1, [(1, 2, 1), (2, 3, 2), (3, 4, 3)])[0]['answer'] == [2, 1]
    assert simulate(2, [(1, 2, 1), (1, 3, 2)])[0]['answer'] == [2, 1]
    assert boxes([43, 40, 32, 40, 30], 3) == [3, 32]
    assert seats([(40, 3), (40, 6), (60, 33), (50, 125), (50, 128),
                  (50, 64), (50, 67)]) == [50, 65]
    assert laboratory([(1, 100), (2, 200), (5, 4), (7, 3), (8, 2), (10, 190)], 96) == 32
    for _ in range(500):
        sides = [rng.randint(1, 60) for _ in range(rng.randint(1, 10))]
        gap = rng.choice([1, 3, 13])
        candidates = []
        for size in range(1, len(sides) + 1):
            for subset in itertools.combinations(sides, size):
                ordered = sorted(subset)
                if all(b - a >= gap for a, b in zip(ordered, ordered[1:])):
                    candidates.append((size, ordered[0]))
        assert tuple(boxes(sides, gap)) == max(candidates)
    for mask in range(1, 1024):
        occupied = {i + 1 for i in range(10) if mask & (1 << i)}
        expected = [i for i in range(2, 9) if i not in occupied and i + 1 not in occupied
                    and i - 1 in occupied and i + 2 in occupied]
        assert seats([(5, s) for s in occupied]) == ([5, min(expected)] if expected else None)
    for _ in range(500):
        points = [(x, rng.randint(1, 1000)) for x in sorted(rng.sample(range(1, 200), rng.randint(1, 12)))]
        capacity = rng.choice([1, 44, 96])
        exhaustive = min(sum(abs(x - center) * ((n + capacity - 1) // capacity)
                             for x, n in points) for center, _ in points)
        assert laboratory(points, capacity) == exhaustive
    for size in range(7):
        for letters in itertools.product('ACU', repeat=size):
            s = ''.join(letters)
            best = 0
            for a in range(len(s)):
                for b in range(a + 2, len(s) + 1, 2):
                    if all(s[i] == 'C' and s[i + 1] in 'AU' for i in range(a, b, 2)):
                        best = max(best, (b - a) // 2)
            assert pair_run(s, 'C', 'AU')['pairs'] == best
    return {'status': 'ok', 'boxesExhaustiveSubsetCases': 500,
            'seatMasks': 1023, 'laboratoryExhaustiveLocationCases': 500,
            'pairStringsExhaustive': sum(3 ** n for n in range(7)),
            'primaryExamples': 5, 'arrivalBoundaryCases': 2}


def main():
    data = load()
    arrivals = {i: arrival_evidence(*parse_arrivals(next(iter(data[i].values())))) for i in ARRIVALS}
    for i in ARRIVALS[:3]:
        assert arrivals[i]['requests'] <= 1000
    text = data['CE2CF3']['320_24.txt'].strip()
    assert set(text) == set('ACDEF')
    actual = pair_run(text, 'CDF', 'AE')
    literal = pair_run(text, 'BCD', 'AU')
    assert actual['pairs'] == 97 and literal['pairs'] == 11
    box_text = data['1F25B2']['331_24.txt']
    assert not re.fullmatch(r'\d+', box_text.splitlines()[0])
    seat_files = {}
    for name, s in data['7F1EAA'].items():
        lines = s.splitlines()
        seat_files[name] = {'header': lines[0], 'bodyLines': len(lines) - 1,
                            'fieldCounts': sorted({len(line.split()) for line in lines[1:]})}
        assert seat_files[name]['fieldCounts'] == [1]
    lab_headers = {name: s.splitlines()[0] for name, s in data['327EB5'].items()}
    assert all(len(header.split()) == 2 for header in lab_headers.values())
    result = {'status': 'verified-conditional-only', 'publishedAnswersAdded': 0,
              'arrivals': arrivals,
              'attachmentDiagnostics': {
                  'CE2CF3': {'declaredAlphabet': 'ABCDU', 'actualAlphabet': 'ACDEF',
                             'characters': len(text), 'actualAlphabetCV': actual,
                             'literalDeclaredSetsCV': literal,
                             'archiveEqualsSaved2F6892': True},
                  '1F25B2': {'archiveFormat': 'RAR', 'member': '331_24.txt',
                             'prefix': box_text[:60], 'expected': 'N followed by N integer box sizes'},
                  '7F1EAA': {'files': seat_files, 'expected': 'N followed by N row-seat pairs'},
                  '327EB5': {'headers': lab_headers, 'expected': 'one integer N in each header'}},
              'algorithmChecks': self_check()}
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
