"""Regression checks for rejecting HTML, broken archives and unreadable members."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile

SPEC = importlib.util.spec_from_file_location('archives', Path(__file__).with_name('download-oge-informatics-archives.py'))
archives = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(archives)


class ArchiveValidation(unittest.TestCase):
    def setUp(self):
        archives.STATE.mkdir(parents=True, exist_ok=True)
        self.temporary = tempfile.TemporaryDirectory(dir=archives.STATE)
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.old_data = archives.DATA
        archives.DATA = self.directory
        self.addCleanup(setattr, archives, 'DATA', self.old_data)
        self.executable = archives.seven_zip()

    def validate(self, file):
        return archives.validate(file, archives.sha256(file), self.executable, use_cache=False)

    def make_zip(self, name='readable.txt'):
        file = self.directory / 'test.zip'
        with zipfile.ZipFile(file, 'w', compression=zipfile.ZIP_STORED) as archive:
            archive.writestr(name, b'original source bytes')
        return file

    def test_valid_unicode_members(self):
        file = self.make_zip('Каталог/данные.txt')
        result = self.validate(file)
        self.assertEqual(result['files'], 1)
        self.assertTrue(result['readable'])
        self.assertEqual(result['uncompressedBytes'], 21)

    def test_html_is_not_an_archive(self):
        file = self.directory / 'error.zip'
        file.write_bytes(b'<html><body>503 unavailable</body></html>')
        with self.assertRaisesRegex(ValueError, 'Not a ZIP/RAR'):
            self.validate(file)

    def test_corrupted_member_crc(self):
        file = self.make_zip()
        file.write_bytes(file.read_bytes().replace(b'original source bytes', b'corrupt! source bytes'))
        with self.assertRaisesRegex(ValueError, 'integrity/readability'):
            self.validate(file)

    def test_truncated_archive(self):
        file = self.make_zip()
        file.write_bytes(file.read_bytes()[:40])
        with self.assertRaisesRegex(ValueError, 'integrity/readability'):
            self.validate(file)

    def test_unsafe_member(self):
        with self.assertRaisesRegex(ValueError, 'Unsafe member path'):
            self.validate(self.make_zip('../outside.txt'))

    def test_empty_archive(self):
        file = self.directory / 'empty.zip'
        with zipfile.ZipFile(file, 'w'):
            pass
        with self.assertRaises(ValueError):
            self.validate(file)

    def test_only_official_source_paths(self):
        for url in ['https://example.org/docs/archive.zip', 'https://oge.fipi.ru/docs/../file.zip',
                    'http://oge.fipi.ru/docs/archive.zip']:
            with self.assertRaises(ValueError):
                archives.repository_path(url)

    def test_verification_does_not_write_evidence(self):
        file = self.make_zip()
        archives.validate(file, archives.sha256(file), self.executable, use_cache=False, persist=False)
        self.assertFalse((self.directory / 'validation').exists())


if __name__ == '__main__':
    unittest.main()
