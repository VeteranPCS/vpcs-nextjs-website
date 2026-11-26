import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readNativeCaptureScope } from '../verify-salesforce-spam-backstop.mjs';

test('supplies the read-only capture probe as a callable operator expression', async () => {
    const expected = ['Capture', 'synthetic-negative-run'];
    const result = await readNativeCaptureScope({
        async runApex(makeExpression) {
            assert.equal(typeof makeExpression, 'function');
            const expression = makeExpression();
            assert.match(expression, /WebdevOutboundCapture\.mode\(\)/);
            assert.match(expression, /Label\.VPCS_Webdev_Capture_Run_Id/);
            return expected;
        },
    });
    assert.deepEqual(result, expected);
});
