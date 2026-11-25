#!/usr/bin/env python3
"""Build reviewable sandbox-only Metadata API ZIPs without secrets or network access."""

import argparse
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import re
from zipfile import ZipFile

HERE = Path(__file__).resolve().parent
SF = HERE.parent
API_VERSION = '62.0'
NAMESPACE = 'http://soap.sforce.com/2006/04/metadata'


def package(members: tuple[str, ...]) -> str:
    types = ''
    if members:
        members_xml = ''.join(f'<members>{member}</members>' for member in members)
        types = f'<types>{members_xml}<name>ApexClass</name></types>'
    return f'<?xml version="1.0" encoding="UTF-8"?><Package xmlns="{NAMESPACE}">{types}<version>{API_VERSION}</version></Package>\n'


def write_package(path: Path, classes: dict[str, str], remove_canary_test: bool = False) -> None:
    metadata = (f'<?xml version="1.0" encoding="UTF-8"?><ApexClass xmlns="{NAMESPACE}">'
                f'<apiVersion>{API_VERSION}</apiVersion><status>Active</status></ApexClass>\n')
    with ZipFile(path, 'x') as archive:
        archive.writestr('package.xml', package(tuple(classes)))
        if remove_canary_test:
            archive.writestr('destructiveChangesPre.xml', package(('WebhookHandlerCanaryTest',)))
        for name, source in classes.items():
            archive.writestr(f'classes/{name}.cls', source)
            archive.writestr(f'classes/{name}.cls-meta.xml', metadata)
    path.chmod(0o600)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True, type=Path, help='new private output directory')
    parser.add_argument('--run', help='exact capture label for the canary')
    parser.add_argument('--start', help='UTC start as YYYY-MM-DDTHH:MM:SSZ')
    args = parser.parse_args()

    if (args.run is None) != (args.start is None):
        parser.error('--run and --start must be supplied together, or both omitted for a disabled package')
    run_id, start_ms, end_ms = '', 0, 0
    if args.run is not None:
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,64}', args.run):
            parser.error('invalid run ID')
        try:
            start = datetime.strptime(args.start, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)
        except ValueError:
            parser.error('use YYYY-MM-DDTHH:MM:SSZ')
        if start.strftime('%Y-%m-%dT%H:%M:%SZ') != args.start:
            parser.error('use canonical YYYY-MM-DDTHH:MM:SSZ')
        end = start + timedelta(minutes=30)
        if end <= datetime.now(timezone.utc):
            parser.error('canary window has already expired')
        run_id, start_ms, end_ms = args.run, int(start.timestamp()) * 1000, int(end.timestamp()) * 1000

    fixtures = json.loads((SF.parent / 'config/salesforce/webdev-fixtures.json').read_text())
    handler = (HERE / 'WebhookHandler.cls').read_text()
    test = (HERE / 'WebhookHandlerCanaryTest.cls').read_text()
    fixture_id, = fixtures['accountIds']['agents']
    if fixtures['orgId'] != '00Djg000000EK8YEAW' or not re.fullmatch(r'001[A-Za-z0-9]{15}', fixture_id):
        raise ValueError('expected the single verified WebDev Agent fixture')
    if f"FIXTURE_ID = '{fixture_id[:15]}'" not in handler or f"ACCOUNT_ID = '{fixture_id[:15]}'" not in test:
        raise ValueError('sandbox callback fixture changed; review both Apex files before preparing this package')

    settings = {
        "String RUN_ID = '';": f"String RUN_ID = '{run_id}';",
        'Long START_MS = 0L;': f'Long START_MS = {start_ms}L;',
        'Long END_MS = 0L;': f'Long END_MS = {end_ms}L;',
    }
    for old, new in settings.items():
        if handler.count(old) != 1:
            raise ValueError('Apex canary template does not match the expected default-off state')
        handler = handler.replace(old, new)

    capture_handler = (SF / 'outbound-capture/templates/classes/WebhookHandler.cls').read_text()
    args.out.mkdir(mode=0o700)
    write_package(args.out / 'canary.zip', {'WebhookHandler': handler, 'WebhookHandlerCanaryTest': test})
    write_package(args.out / 'restore.zip', {'WebhookHandler': capture_handler}, remove_canary_test=True)
    setup = {
        'target': 'vpcs-webdev',
        'orgId': fixtures['orgId'],
        'fixtureAccountId15': fixture_id[:15],
        'namedCredentialOrigin': 'https://test.veteranpcs.com',
        'mode': 'canary' if run_id else 'disabled',
        'captureLabel': run_id or None,
        'VPCS_WEBDEV_SALESFORCE_WEBHOOK_WINDOW': f'{run_id}:{start_ms}:{end_ms}' if run_id else None,
    }
    setup_file = args.out / 'nonsecret-setup.json'
    setup_file.write_text(json.dumps(setup, indent=2) + '\n')
    setup_file.chmod(0o600)
    print(f"Prepared {setup['mode']} and capture restoration packages in {args.out}")


if __name__ == '__main__':
    main()
