# WebDev controlled SMS delivery

This overlay admits one live attempt per reviewed WebDev queue row, up to four rows in a window of at most 30 minutes. It leaves other SMS in capture mode. It never changes sender enumeration, email, the named credential, or Production routing metadata.

The approved browser fixture supplies `VPCS WebDev synthetic location` in both Current Base and Destination Base. The WebDev overlay checks both persisted Lead values for that exact, case-sensitive pair. Service fixtures may leave both values null. Mixed pairs or any other value fail the delivery gate. These checks apply only to the sandbox delivery overlay. Public form validation stays unchanged.

1. Verify the exact WebDev Organization and outbound containment, including System email only and the Tech-only recipient policy. Pause both regional dispatch flags. Run the approved website routing fixture launcher in website capture mode and verify all four marked synthetic Leads and their unclaimed queue rows. Do not reuse queue rows from earlier tests.
2. Save a private JSON configuration with `orgId`, `isSandbox`, `runId`, UTC `issuedAt` and `expiresAt`, and `slots`. Each slot includes `scenario`, `submissionId`, `lastName`, `leadId`, `partnerId`, `queueId`, and the exact `eventKey` from the launcher. Use the same run ID as the WebDev capture label and the marked Lead descriptions. Review the generator output privately.
3. Generate the activation and restoration packages from the exact deployed WebDev capture `OpenPhoneClient.cls` and updated regional `VpcsRegionalSmsWorker.cls` and their accompanying `-meta.xml` files.

```sh
python3 salesforce/outbound-capture/controlled-delivery/generate.py \
  --config /private/path/approval.json \
  --openphone /private/path/classes/OpenPhoneClient.cls \
  --worker /private/path/classes/VpcsRegionalSmsWorker.cls \
  --output /private/path/webdev-live-overlay \
  --restore /private/path/webdev-capture-restore
```

4. Validate the exact activation package in the verified WebDev org, including `WebdevControlledSmsTest` and `WebdevControlledSmsNativeTest`, existing capture and regional worker tests, and required Apex coverage. If the approved slot window will expire before activation and receipt checks, prepare a fresh reviewed window. Deploy in WebDev only, verify the capture run label, then resume regional dispatch and wake only the reviewed `New`, unclaimed queue IDs. Existing `Held` rows stay held.
5. The worker commits a reservation before any permitted provider call. For each approved row, verify the reservation, one provider message ID, the persisted sender, and actual Tech handset receipt with the synthetic prefix. A provider receipt alone does not establish delivery. If the outcome is uncertain, keep the row held and reconcile the provider receipt. The reservation is permanent for that queue row.
6. Pause dispatch, restore the two original capture classes using the generated restoration package, and restore the capture label and prior dispatch flags. Verify capture again and recheck that the approved window and temporary grants are closed.

Keep generated packages, fixture exports, and provider evidence private. The complete overlay and restoration package are separate from the Production routing release. [Salesforce asynchronous callouts](https://developer.salesforce.com/docs/platform/apex-dev/references/apex-dev/apex-callouts-timeouts.html)
