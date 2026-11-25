#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const salesforceDir = fileURLToPath(new URL('..', import.meta.url));
const baseline = join(salesforceDir, 'retrieved-private/baseline-2026-11-25/unpackaged/unpackaged');
const templates = join(salesforceDir, 'outbound-capture/templates');
export const deployPath = join(salesforceDir, 'retrieved-private/webdev-outbound-capture-deploy');

const baselineHashes = {
    'classes/OpenPhoneClient.cls': 'c8342d5cf892f322e8387dbbae50f44849aa38c3e2e0bc6e5987306d1815d2ed',
    'classes/OpenPhoneClient.cls-meta.xml': 'a61e37b18ba9d57fa759172efbef606598726708e2519b4ceb0ec9791d57b401',
    'classes/SmsMessageQueueBatch.cls': 'b5c9b2e9380d471bbbb2aed83f04b79a13c5e86ade0f9395b87a6da4d313f704',
    'classes/SmsMessageQueueBatch.cls-meta.xml': '356db61093648679fc9b3a801e41d51c94fa51e993380eac65b0bb076a20b6b0',
    'classes/AgentPortalReminderBatch.cls': '0647d728970a7cf4974397b8f8d6c6fbdf31ae159565aba20a8d133fb000f2af',
    'classes/AgentPortalReminderBatch.cls-meta.xml': '356db61093648679fc9b3a801e41d51c94fa51e993380eac65b0bb076a20b6b0',
    'classes/WebhookHandler.cls': 'd65e3d72c8b1306d0a560f1b5bad66f3a78647574278c93c4e45c4dd05163934',
    'classes/WebhookHandler.cls-meta.xml': '3a31d117e3c855b937d340b20754b03ad66c0c156d57b7c64011aa5437437b51',
    'objects/SMS_Message_Queue__c.object': '112e73f8b238a1a067e4a59fe0d95900d296a050471b655fb1e41203d5252cf0',
};

const classNames = [
    'AgentPortalReminderBatch', 'OpenPhoneClient', 'SmsMessageQueueBatch',
    'WebdevOutboundCapture', 'WebdevOutboundCaptureTest', 'WebhookHandler',
];
const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
const metadataNamespace = 'http://soap.sforce.com/2006/04/metadata';
const classMeta = `${xmlHeader}
<ApexClass xmlns="${metadataNamespace}">
    <apiVersion>62.0</apiVersion>
    <status>Active</status>
</ApexClass>
`;

function replaceAnchor(source, anchor, replacement, label) {
    const firstMatch = source.indexOf(anchor);
    if (firstMatch < 0 || source.indexOf(anchor, firstMatch + anchor.length) >= 0) {
        throw new Error(`Expected exactly one reviewed ${label} anchor.`);
    }
    return source.slice(0, firstMatch) + replacement + source.slice(firstMatch + anchor.length);
}

function openPhoneOverlay(source) {
    const getAnchor = '      HttpResponse res = this.get(PHONE_NUMBERS_PATH);';
    const sendAnchor = '      resolveSenderPhoneNumber(req);';
    const modeCheck = `       WebdevOutboundCapture.Mode outboundMode = WebdevOutboundCapture.messagingMode();
       if (outboundMode != WebdevOutboundCapture.Mode.Production) {
          if (outboundMode != WebdevOutboundCapture.Mode.Capture || !'OpenPhone'.equals(this.namedCredentialName)) {
             throw new CalloutException('Outbound delivery blocked by sandbox policy');
          }`;
    const get = replaceAnchor(source, getAnchor, `${modeCheck}
          WebdevOutboundCapture.record(WebdevOutboundCapture.Action.SenderRegistry, 0);
          OpenPhoneGetPhoneNumbersResponse captured = new OpenPhoneGetPhoneNumbersResponse();
          captured.data = new List<OpenPhoneGetPhoneNumbersResponse.PhoneNumberData>();
          return captured;
       }
${getAnchor}`, 'sender enumeration');

    return replaceAnchor(get, sendAnchor, `${modeCheck}
          Integer recipientCount = req.toNumber == null ? 0 : req.toNumber.size();
          WebdevOutboundCapture.record(WebdevOutboundCapture.Action.Sms, recipientCount);
          OpenPhoneSendMessageResponse captured = new OpenPhoneSendMessageResponse();
          captured.data = new OpenPhoneSendMessageResponse.Data();
          captured.data.status = WebdevOutboundCapture.CAPTURED;
          return captured;
       }
${sendAnchor}`, 'SMS send');
}

function queueOverlay(source) {
    const counterAnchor = '    private Integer totalSuccess = 0;';
    const executionAnchor = '        for (SMS_Message_Queue__c queueRecord : claimed) {';
    const serviceAnchor = '                IMessagingService service = String.isBlank(queueRecord.Named_Credential__c)';
    const successAnchor = '                if (result.success) {';
    const summaryAnchor = "            'Success: ' + totalSuccess + ', ' +";
    let changed = replaceAnchor(source, counterAnchor, `${counterAnchor}\n    private Integer totalCaptured = 0;`, 'queue counters');
    changed = replaceAnchor(changed, executionAnchor, `        WebdevOutboundCapture.Mode outboundMode = WebdevOutboundCapture.messagingMode();
${executionAnchor}`, 'queue loop');
    changed = replaceAnchor(changed, serviceAnchor, `                if (outboundMode == WebdevOutboundCapture.Mode.Blocked ||
                    (outboundMode == WebdevOutboundCapture.Mode.Capture && String.isNotBlank(queueRecord.Named_Credential__c))) {
                    queueRecord.Status__c = 'Error';
                    queueRecord.Success__c = false;
                    queueRecord.Message_Id__c = null;
                    queueRecord.Provider_Status__c = WebdevOutboundCapture.BLOCKED;
                    queueRecord.Sent_At__c = null;
                    queueRecord.Error_Message__c = 'Outbound delivery blocked by sandbox policy';
                    totalFailed++;
                    recordsToUpdate.add(queueRecord);
                    continue;
                }

${serviceAnchor}`, 'queue credential selection');
    changed = replaceAnchor(changed, successAnchor, `                if (outboundMode == WebdevOutboundCapture.Mode.Capture &&
                    result.success && result.status == WebdevOutboundCapture.CAPTURED) {
                    queueRecord.Status__c = WebdevOutboundCapture.CAPTURED;
                    queueRecord.Success__c = false;
                    queueRecord.Message_Id__c = null;
                    queueRecord.Provider_Status__c = null;
                    queueRecord.Sent_At__c = null;
                    queueRecord.Error_Message__c = null;
                    totalCaptured++;
                } else if (result.success) {`, 'queue result');
    return replaceAnchor(changed, summaryAnchor, `${summaryAnchor}\n            'Captured: ' + totalCaptured + ', ' +`, 'queue summary');
}

function reminderOverlay(source) {
    const anchor = '            Messaging.sendEmail(emails, false);';
    return replaceAnchor(source, anchor, `            WebdevOutboundCapture.Mode outboundMode = WebdevOutboundCapture.messagingMode();
            if (outboundMode == WebdevOutboundCapture.Mode.Production) {
                Messaging.sendEmail(emails, false);
            } else if (outboundMode == WebdevOutboundCapture.Mode.Capture) {
                WebdevOutboundCapture.record(WebdevOutboundCapture.Action.ReminderEmail, emails.size());
            }`, 'scheduled native email');
}

function queueFieldOverlay(source) {
    const matched = source.match(/<fields>\s*<fullName>Status__c<\/fullName>[\s\S]*?<\/fields>/g);
    if (matched?.length !== 1) throw new Error('Expected exactly one reviewed queue status field.');
    const field = replaceAnchor(matched[0], '            </valueSetDefinition>', `                <value>
                    <fullName>Captured</fullName>
                    <default>false</default>
                    <label>Captured</label>
                </value>
            </valueSetDefinition>`, 'queue status picklist');

    // An MDAPI CustomField member is delivered in its owning object file.
    return `${xmlHeader}\n<CustomObject xmlns="${metadataNamespace}">\n    ${field}\n</CustomObject>\n`;
}

function digest(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

export function buildOutboundCapturePackage(sourceDir = baseline) {
    const inputs = {};
    for (const [path, fingerprint] of Object.entries(baselineHashes)) {
        const data = readFileSync(join(sourceDir, path));
        if (digest(data) !== fingerprint) throw new Error(`Reviewed baseline fingerprint changed for ${path}.`);
        inputs[path] = data.toString('utf8');
    }

    const patch = {
        'classes/OpenPhoneClient.cls': openPhoneOverlay(inputs['classes/OpenPhoneClient.cls']),
        'classes/SmsMessageQueueBatch.cls': queueOverlay(inputs['classes/SmsMessageQueueBatch.cls']),
        'classes/AgentPortalReminderBatch.cls': reminderOverlay(inputs['classes/AgentPortalReminderBatch.cls']),
        'objects/SMS_Message_Queue__c.object': queueFieldOverlay(inputs['objects/SMS_Message_Queue__c.object']),
        'objects/Webdev_Outbound_Capture__c.object': readFileSync(join(templates, 'Webdev_Outbound_Capture__c.object'), 'utf8'),
        'labels/CustomLabels.labels': readFileSync(join(templates, 'CustomLabels.labels'), 'utf8'),
    };
    // The old callback is fingerprinted above, but never copied into the package.
    for (const name of ['WebhookHandler', 'WebdevOutboundCapture', 'WebdevOutboundCaptureTest']) {
        const path = `classes/${name}.cls`;
        patch[path] = readFileSync(join(templates, path), 'utf8');
    }
    for (const name of classNames) {
        const path = `classes/${name}.cls-meta.xml`;
        patch[path] = inputs[path] ?? classMeta;
    }
    const members = {
        ApexClass: classNames,
        CustomField: ['SMS_Message_Queue__c.Status__c'],
        CustomLabel: ['VPCS_Webdev_Capture_Run_Id'],
        CustomObject: ['Webdev_Outbound_Capture__c'],
    };
    patch['package.xml'] = `${xmlHeader}\n<Package xmlns="${metadataNamespace}">\n${Object.entries(members)
        .map(([type, names]) => `  <types>\n${names.map(name => `    <members>${name}</members>`).join('\n')}\n    <name>${type}</name>\n  </types>`)
        .join('\n')}\n  <version>62.0</version>\n</Package>\n`;
    return patch;
}

export function prepareOutboundCapturePackage() {
    const patch = buildOutboundCapturePackage();
    for (const [path, content] of Object.entries(patch)) {
        const target = join(deployPath, path);
        if (existsSync(target) && readFileSync(target, 'utf8') !== content) {
            throw new Error(`Existing overlay differs at ${path}. Set the prior package aside before preparing another.`);
        }
    }
    for (const [path, content] of Object.entries(patch)) {
        const target = join(deployPath, path);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, content, { mode: 0o600 });
    }
    return patch;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    try {
        const patch = prepareOutboundCapturePackage();
        console.log(`Prepared ${Object.keys(patch).length} reviewed WebDev metadata files at ${deployPath}.`);
    } catch (error) {
        process.exitCode = 1;
        console.error(error.message);
    }
}
