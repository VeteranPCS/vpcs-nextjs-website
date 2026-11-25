import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const zipProgram = `
import io
import json
import sys
import zipfile

entries = json.load(sys.stdin)
buffer = io.BytesIO()
with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_STORED, allowZip64=False) as archive:
    for name, content in entries:
        info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
        info.create_system = 3
        info.external_attr = 0o100600 << 16
        archive.writestr(info, content.encode('utf-8'))
sys.stdout.buffer.write(buffer.getvalue())
`;

function sha256(data) {
    return createHash('sha256').update(data).digest('hex');
}

export function verifyReviewedArchive({ path, digest }) {
    const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
        const stat = fstatSync(fd);
        if (!stat.isFile() || stat.nlink !== 1 || (stat.mode & 0o222) !== 0 || sha256(readFileSync(fd)) !== digest) {
            throw new Error('The reviewed metadata ZIP differs, is writable, or is linked.');
        }
    } finally {
        closeSync(fd);
    }
}

export function createReviewedArchive(files, directory) {
    const entries = Object.entries(files).sort(([a], [b]) => a < b ? -1 : a === b ? 0 : 1);
    if (!Object.hasOwn(files, 'package.xml') || entries.some(([name, content]) =>
        typeof content !== 'string' || !name.split('/').every(part =>
            /^[A-Za-z0-9_.-]+$/.test(part) && part !== '.' && part !== '..'))) {
        throw new Error('The reviewed metadata must contain a root manifest and safe regular file entries.');
    }

    const zipped = spawnSync('python3', ['-I', '-c', zipProgram], {
        input: JSON.stringify(entries), maxBuffer: 8 * 1024 * 1024,
    });
    if (zipped.error || zipped.status !== 0 || !zipped.stdout?.length) {
        throw new Error('Python 3 could not build the reviewed metadata ZIP.');
    }

    // Build from reviewed bytes, not an on-disk tree. No ignored, stale, or linked entries can enter the archive.
    if (!lstatSync(dirname(directory)).isDirectory()) throw new Error('The private archive parent must be a directory.');
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (!lstatSync(directory).isDirectory()) throw new Error('The private archive directory cannot be a link.');
    const digest = sha256(zipped.stdout);
    const path = join(directory, `metadata-${digest}.zip`);
    try {
        writeFileSync(path, zipped.stdout, { mode: 0o400, flag: 'wx' });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
    }
    const archive = Object.freeze({ path, digest });
    verifyReviewedArchive(archive);
    return archive;
}
