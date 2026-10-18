"""Read embedded ODF documents without editing archives or running their content."""
import argparse
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET
import zipfile

SPEC = importlib.util.spec_from_file_location('archives', Path(__file__).with_name('download-oge-informatics-archives.py'))
archives = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(archives)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--in-progress', action='store_true', help='Inspect completed download checkpoints; report only in storage')
    parser.add_argument('--write-report', action='store_true', help='Save the final report in data-sources (default: read-only comparison)')
    args = parser.parse_args()
    if args.in_progress:
        records = [json.loads(p.read_text(encoding='utf-8')) for p in (archives.STATE / 'results').glob('*.json')]
        records = [r for r in records if r['status'] == 'verified']
    else:
        records = json.loads((archives.DATA / 'manifest.json').read_text(encoding='utf-8'))['archives']
    unique = {r['sha256']: r for r in records}
    results = []
    executable = archives.seven_zip()
    for digest, record in sorted(unique.items()):
        file = archives.ROOT / record['repositoryPath']
        assert archives.sha256(file) == digest, str(file)
        evidence = json.loads((archives.ROOT / record['validation']['evidence']).read_text(encoding='utf-8'))
        for member in evidence['members']:
            suffix = Path(member['path']).suffix.lower()
            if suffix not in ('.odt', '.ods'):
                continue
            result = subprocess.run([executable, 'x', '-so', '-y', '-spd', '-p', str(file), member['path']],
                                    capture_output=True, timeout=60, check=True)
            payload = result.stdout
            assert len(payload) == member['size'], member['path']
            with zipfile.ZipFile(io.BytesIO(payload)) as document:
                assert document.testzip() is None, member['path']
                mimetype = document.read('mimetype').decode('ascii')
                expected = 'application/vnd.oasis.opendocument.' + ('spreadsheet' if suffix == '.ods' else 'text')
                assert mimetype == expected, member['path']
                xml_files = [name for name in document.namelist() if name.endswith('.xml')]
                for name in xml_files:
                    ET.fromstring(document.read(name))
                content = ET.fromstring(document.read('content.xml'))
                assert content.tag == '{urn:oasis:names:tc:opendocument:xmlns:office:1.0}document-content'
                office_ns = '{urn:oasis:names:tc:opendocument:xmlns:office:1.0}'
                body_kind = 'spreadsheet' if suffix == '.ods' else 'text'
                assert content.find(office_ns + 'body/' + office_ns + body_kind) is not None
                results.append({'archiveSha256': digest, 'member': member['path'], 'size': len(payload),
                                'sha256': hashlib.sha256(payload).hexdigest(), 'mimetype': mimetype,
                                'zipCrc': 'passed', 'xml': 'passed', 'xmlFiles': len(xml_files)})
    report = {'status': 'passed', 'distinctArchives': len(unique), 'documents': len(results),
              'method': '7-Zip extracts exact member bytes; Python zipfile tests all inner CRCs; ElementTree parses every XML part and checks the ODF body type',
              'results': results}
    if args.in_progress:
        archives.write_json(archives.STATE / 'document-validation-in-progress.json', report)
    elif args.write_report:
        archives.write_json(archives.DATA / 'document-validation.json', report)
    else:
        previous = json.loads((archives.DATA / 'document-validation.json').read_text(encoding='utf-8'))
        assert report == previous, 'Document verification report differs'
    print(json.dumps({k: v for k, v in report.items() if k != 'results'}))


if __name__ == '__main__':
    main()
