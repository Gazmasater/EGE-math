#!/usr/bin/env python3
"""Restore original FIPI archives from this repository's GitHub Release parts."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import ssl
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data-sources/oge-informatics'


class HttpsRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        if not new_url.startswith('https://'):
            raise ValueError('Refusing a redirect outside HTTPS')
        return super().redirect_request(request, fp, code, message, headers, new_url)


def digest(file):
    with file.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def valid(file, record):
    return file.is_file() and file.stat().st_size == record['size'] and digest(file) == record['sha256']


def read_catalog():
    manifest = json.loads((DATA / 'manifest.json').read_bytes())
    release = json.loads((DATA / 'release.json').read_bytes())
    assert release['repository'] == 'Gazmasater/EGE-math'
    assert re.fullmatch(r'[A-Za-z0-9_.-]+', release['tag'])
    originals = {r['sha256']: r['size'] for r in manifest['archives']}
    assert {r['sha256']: r['size'] for r in release['archives']} == originals
    assert len(release['archives']) == len(originals)
    names = set()
    for archive in release['archives']:
        assert re.fullmatch(r'[0-9a-f]{64}', archive['sha256'])
        assert sum(p['size'] for p in archive['parts']) == archive['size']
        for number, part in enumerate(archive['parts'], 1):
            assert part['name'] == f"{archive['sha256']}.part{number:04d}"
            assert part['name'] not in names
            names.add(part['name'])
            assert 0 < part['size'] <= release['chunkBytes']
            assert re.fullmatch(r'[0-9a-f]{64}', part['sha256'])
            assert part['url'] == f"https://github.com/{release['repository']}/releases/download/{release['tag']}/{part['name']}"
    for record in manifest['archives']:
        path = PurePosixPath(record['repositoryPath'])
        assert not path.is_absolute() and '..' not in path.parts and ':' not in str(path)
        assert str(path).startswith('fipi-assets/oge-informatics/docs/')
        assert path.suffix in ('.zip', '.rar')
        assert (ROOT / path).resolve().is_relative_to(ROOT.resolve())
    return manifest, release


def download(part, cache):
    file = cache / 'parts' / part['name']
    if valid(file, part):
        return
    temporary = file.with_suffix(file.suffix + '.download')
    for attempt in range(3):
        try:
            request = urllib.request.Request(part['url'], headers={'User-Agent': 'EGE-math-archive-restore'})
            context = ssl.create_default_context()
            # Some proxies fail TLS 1.3 handshakes. Retrying with verified TLS 1.2
            # keeps certificate/hostname checks enabled and stays within three attempts.
            if attempt:
                context.maximum_version = ssl.TLSVersion.TLSv1_2
            opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=context), HttpsRedirect())
            with opener.open(request, timeout=60) as response, temporary.open('wb') as output:
                if response.status != 200 or not response.url.startswith('https://'):
                    raise ValueError('Expected a successful HTTPS download')
                if 'html' in response.headers.get('Content-Type', '').lower():
                    raise ValueError('HTML response is not an archive part')
                received = 0
                while block := response.read(128 * 1024):
                    received += len(block)
                    if received > part['size']:
                        raise ValueError('Part exceeds its recorded size')
                    output.write(block)
            if not valid(temporary, part):
                raise ValueError('Downloaded part size or SHA-256 mismatch')
            temporary.replace(file)
            return
        except (OSError, urllib.error.URLError, ValueError) as error:
            temporary.unlink(missing_ok=True)
            if attempt == 2:
                raise RuntimeError(f"Cannot obtain {part['name']}: {error}") from error
            time.sleep(2 * (attempt + 1))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workers', type=int, choices=range(1, 5), default=3)
    parser.add_argument('--cache-dir', type=Path, default=ROOT / 'storage/oge-informatics-release')
    parser.add_argument('--cache-only', action='store_true', help='Download and verify all parts and assembled originals without copying to task paths')
    args = parser.parse_args()
    manifest, release = read_catalog()
    cache = args.cache_dir.resolve()
    (cache / 'parts').mkdir(parents=True, exist_ok=True)
    (cache / 'originals').mkdir(exist_ok=True)
    needed = [a for a in release['archives'] if not valid(cache / 'originals' / a['sha256'], a)]
    parts = [p for a in needed for p in a['parts']]
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = [executor.submit(download, part, cache) for part in parts]
        for number, future in enumerate(as_completed(futures), 1):
            future.result()
            if number % 10 == 0 or number == len(parts):
                print(f'Parts verified: {number}/{len(parts)}', flush=True)
    for archive in needed:
        target = cache / 'originals' / archive['sha256']
        temporary = target.with_suffix('.assembling')
        with temporary.open('wb') as output:
            for part in archive['parts']:
                with (cache / 'parts' / part['name']).open('rb') as source:
                    shutil.copyfileobj(source, output)
        if not valid(temporary, archive):
            temporary.unlink()
            raise ValueError('Assembled original failed SHA-256: ' + archive['sha256'])
        temporary.replace(target)
    restored = 0
    if not args.cache_only:
        for record in manifest['archives']:
            target = ROOT / record['repositoryPath']
            if not valid(target, record):
                target.parent.mkdir(parents=True, exist_ok=True)
                temporary = target.with_suffix(target.suffix + '.restoring')
                shutil.copyfile(cache / 'originals' / record['sha256'], temporary)
                if not valid(temporary, record):
                    temporary.unlink()
                    raise ValueError('Restored original failed SHA-256: ' + record['repositoryPath'])
                temporary.replace(target)
            restored += 1
    print(json.dumps({'verifiedDistinctArchives': len(release['archives']),
                      'coveredTasks': manifest['verifiedTasks'], 'restoredPaths': restored,
                      'missingArchives': manifest['missingArchives']}))


if __name__ == '__main__':
    main()
