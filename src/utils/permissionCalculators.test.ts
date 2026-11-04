import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateUsername,
  validateGroupname,
  isProtectedAccount,
  validateOctal,
  octalToPermissions,
  permissionsToOctal,
  permissionsToSymbolic,
  parseSymbolicClauses,
  explainPermissions,
  sanitizeSandboxPath,
} from './permissionCalculators';

test('validateUsername enforces strict Linux standards', () => {
  assert.equal(validateUsername('john_doe').valid, true);
  assert.equal(validateUsername('devops-01').valid, true);
  assert.equal(validateUsername('_service').valid, true);
  assert.equal(validateUsername('alice').valid, true);

  // Invalid cases
  assert.equal(validateUsername('123user').valid, false); // starts with digit
  assert.equal(validateUsername('JohnDoe').valid, false);  // uppercase
  assert.equal(validateUsername('user;rm').valid, false);  // shell metacharacter
  assert.equal(validateUsername('user$(whoami)').valid, false); // command injection
  assert.equal(validateUsername('verylongusernameexceedingthemaximumallowablelimitof32characters').valid, false);
  assert.equal(validateUsername('').valid, false);
});

test('validateGroupname enforces valid identifiers', () => {
  assert.equal(validateGroupname('developers').valid, true);
  assert.equal(validateGroupname('docker_admins').valid, true);
  assert.equal(validateGroupname('grp-01').valid, true);

  assert.equal(validateGroupname('Developers').valid, false);
  assert.equal(validateGroupname('grp/test').valid, false);
  assert.equal(validateGroupname('').valid, false);
});

test('isProtectedAccount guards system UIDs and critical daemon accounts', () => {
  assert.equal(isProtectedAccount('root', 0), true);
  assert.equal(isProtectedAccount('daemon', 1), true);
  assert.equal(isProtectedAccount('www-data', 33), true);
  assert.equal(isProtectedAccount('nobody', 65534), true);
  assert.equal(isProtectedAccount('sysadmin', 500), true); // UID < 1000
  assert.equal(isProtectedAccount('alice', 1001), false);
  assert.equal(isProtectedAccount('student', 1002), false);
});

test('validateOctal validates 3 and 4 digit permissions', () => {
  assert.equal(validateOctal('755').valid, true);
  assert.equal(validateOctal('755').formatted, '0755');
  assert.equal(validateOctal('0644').valid, true);
  assert.equal(validateOctal('0644').formatted, '0644');
  assert.equal(validateOctal('4755').valid, true);

  assert.equal(validateOctal('888').valid, false); // 8 is invalid in octal
  assert.equal(validateOctal('9999').valid, false);
  assert.equal(validateOctal('abc').valid, false);
  assert.equal(validateOctal('75').valid, false); // too short
});

test('octal and permission conversions are bidirectional', () => {
  const p755 = octalToPermissions('0755');
  assert.equal(p755.owner.read, true);
  assert.equal(p755.owner.write, true);
  assert.equal(p755.owner.execute, true);
  assert.equal(p755.group.read, true);
  assert.equal(p755.group.write, false);
  assert.equal(p755.group.execute, true);
  assert.equal(p755.others.read, true);
  assert.equal(p755.others.write, false);
  assert.equal(p755.others.execute, true);

  assert.equal(permissionsToOctal(p755), '0755');
  assert.equal(permissionsToSymbolic(p755, false), '-rwxr-xr-x');
  assert.equal(permissionsToSymbolic(p755, true), 'drwxr-xr-x');

  const p644 = octalToPermissions('0644');
  assert.equal(permissionsToOctal(p644), '0644');
  assert.equal(permissionsToSymbolic(p644, false), '-rw-r--r--');

  // Test special bits: SUID (4755), SGID (2755), Sticky (1777)
  const p4755 = octalToPermissions('4755');
  assert.equal(p4755.special.suid, true);
  assert.equal(permissionsToSymbolic(p4755, false), '-rwsr-xr-x');

  const p2755 = octalToPermissions('2755');
  assert.equal(p2755.special.sgid, true);
  assert.equal(permissionsToSymbolic(p2755, false), '-rwxr-sr-x');

  const p1777 = octalToPermissions('1777');
  assert.equal(p1777.special.sticky, true);
  assert.equal(permissionsToSymbolic(p1777, true), 'drwxrwxrwt');
});

test('parseSymbolicClauses updates permissions correctly', () => {
  const updated = parseSymbolicClauses('u+x,g-w,o=r', '0644');
  // 0644 is owner rw-, group r--, others r--
  // u+x -> owner rwx
  // g-w -> group r--
  // o=r -> others r--
  assert.equal(permissionsToOctal(updated), '0744');
});

test('explainPermissions produces human-readable academic explanations', () => {
  const exp755 = explainPermissions('0755', false);
  assert.match(exp755.summary, /755/);
  assert.match(exp755.ownerText, /FULL access/);

  const exp777 = explainPermissions('0777', false);
  assert.match(exp777.summary, /World-writable/);

  const exp4755 = explainPermissions('4755', false);
  assert.match(exp4755.securityNote || '', /SUID/);
});

test('sanitizeSandboxPath prevents path traversal attacks', () => {
  const sandbox = '/tmp/linux-mgmt-test';

  const validChild = sanitizeSandboxPath(sandbox, 'projects/script.sh');
  assert.equal(validChild.valid, true);
  assert.equal(validChild.safeFullPath, '/tmp/linux-mgmt-test/projects/script.sh');
  assert.equal(validChild.safeRelativePath, 'projects/script.sh');

  // Traversal attack with ../
  const attack1 = sanitizeSandboxPath(sandbox, '../../etc/passwd');
  assert.equal(attack1.valid, false);
  assert.match(attack1.error || '', /traversal/i);

  // Hidden traversal with nested steps
  const attack2 = sanitizeSandboxPath(sandbox, 'subdir/../../../etc/shadow');
  assert.equal(attack2.valid, false);

  // Invalid characters
  const attack3 = sanitizeSandboxPath(sandbox, 'file|rm -rf.txt');
  assert.equal(attack3.valid, false);
});
