import assert from 'node:assert/strict';
import { test } from 'node:test';
import { archiveJobRoot } from '../server/lpbfArchivePaths';

test('same-host absolute roots and shared WSL drives map explicitly', () => {
  assert.equal(archiveJobRoot('C:\\project space\\.lpbf-jobs', 'win32', 'win32'), 'C:\\project space\\.lpbf-jobs');
  assert.equal(archiveJobRoot('/work/jobs', 'linux', 'linux'), '/work/jobs');
  assert.equal(archiveJobRoot('/mnt/c/project space/.lpbf-jobs', 'linux', 'win32'), 'C:\\project space\\.lpbf-jobs');
});
test('ambiguous or non-shared roots fail instead of reading another folder', () => {
  for (const root of ['/home/user/jobs', '/mnt/cc/jobs', '/mnt/c/../d/jobs', '/mnt/c/jobs\\other', 'relative', 'C:jobs', '/mnt/c/jobs\0'])
    assert.throws(() => archiveJobRoot(root, 'linux', 'win32'));
  assert.throws(() => archiveJobRoot('relative', 'linux', 'linux'));
  assert.throws(() => archiveJobRoot('C:relative', 'win32', 'win32'));
  assert.throws(() => archiveJobRoot('/jobs', 'unknown', 'linux'));
});
