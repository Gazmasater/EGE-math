"""Fetch original FIPI bytes, test every member with 7-Zip, and record provenance.

Python 3 standard library, curl, 7z/7zz and Node.js are required.
No database, solutions, original HTML or application code is modified.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import threading
import time
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data-sources/oge-informatics'
STATE = ROOT / 'storage/oge-informatics-archives'
LOCK = threading.Lock()


def now():
    return datetime.now(timezone.utc).isoformat()


def sha256(file):
    with open(file, 'rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def write_json(file, value):
    file.parent.mkdir(parents=True, exist_ok=True)
    temporary = file.with_suffix(file.suffix + '.tmp')
    with temporary.open('w', encoding='utf-8', newline='\n') as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(file)


def repository_path(url):
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or parsed.netloc != 'oge.fipi.ru':
        raise ValueError('Only official HTTPS URLs are accepted: ' + url)
    relative = PurePosixPath(unquote(parsed.path).lstrip('/'))
    if '..' in relative.parts or not str(relative).startswith('docs/'):
        raise ValueError('Invalid source path: ' + url)
    return 'fipi-assets/oge-informatics/' + str(relative)


def seven_zip():
    found = os.environ.get('SEVEN_ZIP') or shutil.which('7zz') or shutil.which('7z')
    if not found:
        windows = Path('C:/Program Files/7-Zip/7z.exe')
        if windows.is_file():
            found = str(windows)
    if not found:
        raise RuntimeError('Install 7-Zip (RAR support required), or set SEVEN_ZIP.')
    return found


def validate(file, digest, executable, use_cache=True, persist=True):
    # Equal hashes share validation evidence, never guessed task/filename matches.
    evidence = DATA / 'validation' / (digest + '.json')
    with LOCK:
        if use_cache and evidence.is_file():
            cached = json.loads(evidence.read_text(encoding='utf-8'))
            if cached['sha256'] == digest and cached['size'] == file.stat().st_size:
                return cached['summary']
        with file.open('rb') as stream:
            magic = stream.read(8)
        if magic.startswith(b'PK\x03\x04'):
            kind = 'zip'
        elif magic.startswith(b'Rar!\x1a\x07\x00') or magic.startswith(b'Rar!\x1a\x07\x01\x00'):
            kind = 'rar'
        else:
            raise ValueError('Not a ZIP/RAR archive (including HTML/error pages)')
        test = subprocess.run([executable, 't', '-y', '-bd', '-bb0', '-sccUTF-8', '-p', str(file)],
                              capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=300)
        if test.returncode != 0 or 'Everything is Ok' not in test.stdout:
            raise ValueError('7-Zip integrity/readability failure: ' + (test.stdout + test.stderr)[-3000:])
        listing = subprocess.run([executable, 'l', '-slt', '-ba', '-sccUTF-8', '-p', str(file)],
                                 capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=60)
        if listing.returncode != 0:
            raise ValueError('7-Zip member listing failed: ' + listing.stderr)
        members = []
        for block in listing.stdout.strip().split('\n\n'):
            item = dict(line.split(' = ', 1) for line in block.splitlines() if ' = ' in line)
            if 'Path' not in item:
                continue
            name = item['Path'].replace('\\', '/')
            if name.startswith('/') or '..' in PurePosixPath(name).parts or ':' in name:
                raise ValueError('Unsafe member path: ' + name)
            if item.get('Encrypted') == '+':
                raise ValueError('Encrypted member: ' + name)
            directory = item.get('Folder') == '+' or item.get('Attributes', '').startswith('D')
            members.append({'path': name, 'directory': directory, 'size': int(item.get('Size', 0)),
                            'crc32': item.get('CRC'), 'encrypted': False})
        files = [m for m in members if not m['directory']]
        if not files or not sum(m['size'] for m in files):
            raise ValueError('Archive contains no nonempty files')
        summary = {'status': 'passed', 'format': kind, 'magic': magic.hex(),
                   'integrity': 'passed', 'readable': True, 'encrypted': False,
                   'method': '7-Zip t: full decompression and checksum verification of every member',
                   'files': len(files), 'directories': len(members) - len(files),
                   'uncompressedBytes': sum(m['size'] for m in files),
                   'evidence': evidence.relative_to(ROOT).as_posix()}
        if persist:
            write_json(evidence, {'sha256': digest, 'size': file.stat().st_size, 'checkedAt': now(),
                                 'summary': summary, 'testOutput': test.stdout.strip().replace(str(file), '<archive>'),
                                 'members': members})
        return summary


def fetch(task, url, executable, retry_count):
    rel = repository_path(url)
    target = ROOT / rel
    checkpoint = STATE / 'results' / (hashlib.sha256(url.encode()).hexdigest() + '.json')
    base = {'taskId': task['id'], 'sourceId': task['sourceId'], 'group': task['group'],
            'originalUrl': url, 'repositoryPath': rel}
    if checkpoint.is_file() and target.is_file():
        old = json.loads(checkpoint.read_text(encoding='utf-8'))
        if old.get('status') == 'verified' and sha256(target) == old['sha256']:
            old['validation'] = validate(target, old['sha256'], executable)
            return old
    temporary = STATE / 'downloads' / (checkpoint.stem + Path(urlsplit(url).path).suffix)
    temporary.parent.mkdir(parents=True, exist_ok=True)
    attempts = []
    for attempt in range(1, retry_count + 1):
        started = now()
        try:
            response = subprocess.run(['curl', '--silent', '--show-error', '--fail', '--location',
                                      '--proto', '=https', '--proto-redir', '=https',
                                      '--connect-timeout', '15', '--max-time', '300',
                                      '--speed-time', '30', '--speed-limit', '1024',
                                      '--output', str(temporary), '--write-out', '%{json}', url],
                                     capture_output=True, text=True, encoding='utf-8', timeout=320)
            metadata = json.loads(response.stdout) if response.stdout else {}
            info = {'attempt': attempt, 'startedAt': started, 'finishedAt': now(),
                    'curlExitCode': response.returncode, 'httpStatus': metadata.get('http_code'),
                    'actualSource': metadata.get('url_effective', url),
                    'contentType': metadata.get('content_type'), 'tlsVerified': metadata.get('ssl_verify_result') == 0}
            attempts.append(info)
            if response.returncode or metadata.get('http_code') != 200:
                raise ValueError(response.stderr.strip() or f"HTTP {metadata.get('http_code')}")
            if urlsplit(info['actualSource']).hostname != 'oge.fipi.ru':
                raise ValueError('Redirect outside official host; manual provenance review required')
            if 'html' in (info['contentType'] or '').lower():
                raise ValueError('HTML response is not an archive')
            size = temporary.stat().st_size
            if not size or size != int(metadata.get('size_download', -1)):
                raise ValueError('Empty or truncated response')
            digest = sha256(temporary)
            validation = validate(temporary, digest, executable)
            if validation['format'] != Path(urlsplit(url).path).suffix[1:].lower():
                raise ValueError('Archive signature does not match its filename extension')
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary.replace(target)
            record = {**base, 'status': 'verified', 'actualSource': info['actualSource'],
                      'sourceKind': 'official', 'retrievedAt': now(), 'size': size, 'sha256': digest,
                      'storage': 'git', 'attempts': attempts, 'validation': validation}
            write_json(checkpoint, record)
            return record
        except (ValueError, OSError, subprocess.TimeoutExpired) as error:
            if not attempts or attempts[-1]['attempt'] != attempt:
                attempts.append({'attempt': attempt, 'startedAt': started, 'finishedAt': now()})
            attempts[-1]['error'] = str(error)
            temporary.unlink(missing_ok=True)
            if attempt < retry_count:
                time.sleep(attempt * 2)
    record = {**base, 'status': 'missing', 'reason': attempts[-1]['error'], 'attempts': attempts}
    write_json(checkpoint, record)
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verify', action='store_true', help='Check recorded SHA-256 and fully test all distinct archives; no network')
    parser.add_argument('--workers', type=int, default=3, choices=range(1, 5))
    parser.add_argument('--attempts', type=int, default=3, choices=range(1, 4))
    args = parser.parse_args()
    executable = seven_zip()
    # The JS reader is authoritative for task IDs, group, text and attachment links.
    registry_check = subprocess.run(['node', str(ROOT / 'scripts/audit-oge-informatics-archive-registry.js')],
                                    capture_output=True, text=True, encoding='utf-8', check=True)
    registry_evidence = json.loads(registry_check.stdout)
    tasks = json.loads((DATA / 'tasks.json').read_text(encoding='utf-8'))
    if args.verify:
        manifest = json.loads((DATA / 'manifest.json').read_text(encoding='utf-8'))
        missing = json.loads((DATA / 'missing.json').read_text(encoding='utf-8'))
        assert json.loads((DATA / 'registry-validation.json').read_text(encoding='utf-8')) == registry_evidence
        expected = {(t['id'], u) for t in tasks for u in t['urls']}
        records = manifest['archives']
        assert {(r['taskId'], r['originalUrl']) for r in records + missing} == expected
        assert len(records) + len(missing) == len(expected)
        assert len(records) == manifest['verifiedArchives']
        assert len({r['taskId'] for r in records}) == manifest['verifiedTasks']
        assert len(missing) == manifest['missingArchives']
        assert sum(r['size'] for r in records) == manifest['totalBytes']
        assert sum({r['sha256']: r['size'] for r in records}.values()) == manifest['distinctBytes']
        expected_tasks = {t['id']: t for t in tasks}
        for group in registry_evidence['byGroup']:
            assert sum(r['group'] == group for r in records) == manifest['verifiedByGroup'][group]
            assert sum(r['group'] == group for r in missing) == manifest['remainingByGroup'][group]
        for record in records + missing:
            task = expected_tasks[record['taskId']]
            assert record['sourceId'] == task['sourceId'] and record['group'] == task['group']
            assert record['repositoryPath'] == repository_path(record['originalUrl'])
        for record in missing:
            assert record['status'] == 'missing' and record['reason']
        tested = {}
        for record in records:
            assert record['status'] == 'verified' and record['sourceKind'] == 'official'
            assert record['actualSource'] == record['originalUrl']
            assert record['attempts'][-1]['tlsVerified'] is True
            assert record['attempts'][-1]['httpStatus'] == 200
            assert record['attempts'][-1]['curlExitCode'] == 0
            file = ROOT / record['repositoryPath']
            assert file.stat().st_size == record['size'], str(file)
            assert sha256(file) == record['sha256'], str(file)
            if record['sha256'] not in tested:
                result = validate(file, record['sha256'], executable, use_cache=False, persist=False)
                assert result == record['validation'], str(file)
                evidence = json.loads((ROOT / result['evidence']).read_text(encoding='utf-8'))
                assert evidence['summary'] == result and evidence['sha256'] == record['sha256']
                assert evidence['size'] == record['size']
                tested[record['sha256']] = result
            assert tested[record['sha256']] == record['validation']
        assert len(tested) == manifest['distinctArchives']
        print(json.dumps({'verifiedTasks': len(records), 'missing': len(missing), 'distinctArchives': len(tested)}))
        return
    write_json(DATA / 'registry-validation.json', registry_evidence)
    results = []
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = [executor.submit(fetch, task, url, executable, args.attempts) for task in tasks for url in task['urls']]
        for future in as_completed(futures):
            record = future.result()
            results.append(record)
            if len(results) % 10 == 0 or record['status'] != 'verified':
                print(f"{len(results)}/{len(futures)} verified={sum(r['status'] == 'verified' for r in results)} last={record['taskId']} {record['status']}", flush=True)
    results.sort(key=lambda r: r['taskId'])
    verified = [r for r in results if r['status'] == 'verified']
    missing = [r for r in results if r['status'] != 'verified']
    release_file = DATA / 'release.json'
    if release_file.is_file():
        release = json.loads(release_file.read_bytes())
        published = {r['sha256']: r['size'] for r in release['archives']}
        for record in verified:
            if published.get(record['sha256']) == record['size']:
                record['storage'] = 'release'
                record['releaseManifest'] = 'data-sources/oge-informatics/release.json'
            else:
                record['storage'] = 'local'
                record.pop('releaseManifest', None)
    manifest_file = DATA / 'manifest.json'
    manifest = json.loads(manifest_file.read_text(encoding='utf-8'))
    manifest.update({'schemaVersion': 2, 'checkedAt': now(), 'requiredArchives': len(results),
                     'verifiedArchives': len(verified), 'verifiedTasks': len({r['taskId'] for r in verified}),
                     'missingArchives': len(missing),
                     'distinctArchives': len({r['sha256'] for r in verified}),
                     'totalBytes': sum(r['size'] for r in verified),
                     'distinctBytes': sum({r['sha256']: r['size'] for r in verified}.values()),
                     'verifiedByGroup': {g: sum(r['group'] == g for r in verified) for g in registry_evidence['byGroup']},
                     'remainingByGroup': {g: sum(r['group'] == g for r in missing) for g in registry_evidence['byGroup']},
                     'registryValidation': 'registry-validation.json',
                     'downloadPolicy': {'workers': args.workers, 'maximumAttemptsPerUrl': args.attempts,
                                        'connectTimeoutSeconds': 15, 'requestTimeoutSeconds': 300,
                                        'tlsVerification': True, 'unconfirmedCopiesAccepted': False},
                     'archives': verified})
    if release_file.is_file():
        local_only = sum(r['storage'] != 'release' for r in verified)
        manifest['storageSummary'] = {
            'method': 'mixed-release-and-local' if local_only else 'github-release-parts',
            'gitLfs': False, 'releasesRequired': True, 'releaseManifest': 'release.json',
            'distinctArchiveBytes': manifest['distinctBytes'], 'restoredBytes': manifest['totalBytes'],
            'chunkBytes': release['chunkBytes'], 'parts': sum(len(a['parts']) for a in release['archives']),
            'localOnlyArchives': local_only,
        }
    write_json(DATA / 'missing.json', missing)
    write_json(manifest_file, manifest)
    print(json.dumps({k: v for k, v in manifest.items() if k not in ('archives', 'solutions')}), flush=True)


if __name__ == '__main__':
    main()
