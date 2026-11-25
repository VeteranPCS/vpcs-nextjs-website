# One-time WebDev callback canary

This is a temporary test of Salesforce's Account revalidation callback to the protected workflow-test Preview. With the sandbox adapter restored and the website canary window absent, Salesforce captures the callback locally. Approval of the website Preview does not establish that Salesforce reached it.

## Prepare and validate

1. Confirm `test.veteranpcs.com` is assigned to the fresh, reviewed `codex/salesforce-workflow-test` Preview and that an anonymous request is challenged. Confirm the candidate branch has the verified WebDev config, protection attestation, `capture` delivery and Lead writes disabled. Compare the reconciled Agent fixture and its single Colorado license with the local fixture manifest. Confirm WebDev organization `00Djg000000EK8YEAW`, `IsSandbox=true`, **System email only**, and the original capture-only `WebhookHandler`. Review the isolated execution window, current label and any pending trigger work. Leave the rendering Account fields unchanged.
2. Use a private same-project Vercel **Development** OIDC token obtained via an authorized Development pull. Its normal lifetime is 12 hours. The one-time app window does not change the token's expiration or its ability to reach the project's other Previews under the default rules. Review any other resources that trust that Development identity. A controlled test toward the end of the token lifetime minimizes exposure after teardown. Verify issuer, subject, expiration and length privately. Salesforce formula output must fit 1,300 characters. Verify the token grants access to the approved protected Preview using only the Trusted Sources header and no cookies. Keep the raw token off command arguments, terminal output, records, source and logs.
3. Build a disabled validation package and its paired rollback. Paths must be new private directories. For the scheduled window, regenerate with a unique run and a UTC start that leaves time for the deployment. The expiry is exactly 30 minutes after the start. The emitted JSON contains only public run configuration.

   ```sh
   python3 -B salesforce/callback-canary/prepare.py --out /private/tmp/vpcs-callback-validation
   python3 -B salesforce/callback-canary/prepare.py --out /private/tmp/vpcs-callback-run \
     --run <approved-run-id> --start <YYYY-MM-DDTHH:MM:SSZ>
   ```

4. Check the ZIPs and validate in the verified sandbox using `sf project deploy start --dry-run --metadata-dir <canary.zip> --single-package --target-org vpcs-webdev --test-level RunSpecifiedTests --tests WebhookHandlerCanaryTest --tests WebdevOutboundCaptureTest`. These tests must pass. Never use a Production target. Keep the original capture label and both deploy receipts. Tests do not transmit either credential or invoke the protected Preview.
5. Set the nonsecret `VPCS_WEBDEV_SALESFORCE_WEBHOOK_WINDOW` from the JSON and a fresh independent secret `VPCS_WEBDEV_SALESFORCE_WEBHOOK_SECRET` on **Preview, exact workflow-test branch**. Build a fresh protected Preview and require its checks before assigning the alias to it. Keep the application secret available only to the operator and Salesforce's encrypted credential. The canary can be prepared with an empty window. No callback can be accepted in that state.

## Salesforce credential

In WebDev Setup, create a Custom External Credential `VPCS_Webdev_Callback_Auth` with a Named Principal `CanaryOperator`. The principal's encrypted authentication parameters are `VercelDevelopmentOidc` and `WebdevCallbackSecret`. Define these two custom headers on that External Credential.

| Header | Formula |
| --- | --- |
| `x-vercel-trusted-oidc-idp-token` | `{!$Credential.VPCS_Webdev_Callback_Auth.VercelDevelopmentOidc}` |
| `X-Salesforce-Signature` | `{!$Credential.VPCS_Webdev_Callback_Auth.WebdevCallbackSecret}` |

Create a Secured Endpoint Named Credential `VPCS_Webdev_Callback`, fixed URL `https://test.veteranpcs.com` with no path or trailing slash. Connect it to the External Credential. Disable Generate Authorization Header. Enable Allow Formulas in HTTP Header and Enabled for Callouts. Map principal access only to the canary operator via a temporary permission set, with the Salesforce-required User External Credentials access for this Custom Named Principal. Do not grant it to guests, app OAuth users or broad profiles. The worker checks the stored URL through Salesforce Connect API before sending. If the acting user cannot read the exact endpoint metadata, it records a capture instead. Do not widen permissions to force the test.

The OIDC token and application secret are separate. Do not set them as XML values, Named Credential URLs, query parameters, custom labels, cookie settings or CLI arguments. No automation bypass or new OIDC provider is used.

## Native event and evidence

After deploying reviewed `canary.zip` to the verified WebDev only, set the existing capture label to the generated run ID. Reconfirm the org, protection, alias, expiry and current capture settings immediately before sending. Use negative probes with the exact host from an authorized operator. App secret alone must hit Vercel's challenge. OIDC plus the wrong app secret must return application 401. An OIDC-only nonmutating probe of the immutable deployment should pass the edge. Anonymous access should remain challenged.

Run exactly one update of the verified synthetic Colorado Area Assignment for the manifest Agent. The existing AreaAssignmentTrigger passes the assigned Account's `AccountId_15__c`. Preserve business field values and make sure the update targets one synthetic assignment. Do not run bulk writes or replay an ambiguous result. The adapter sends once per eligible native event, including when a downstream error occurs. The run must contain a single operator-serialized fixture update.

Require a Salesforce async receipt with exactly one `VPCS_WEBDEV_CALLBACK status=200 run=<run>` and website evidence showing the matching accepted run and `/colorado` revalidation once, plus no Production request. A Vercel edge challenge, 3xx, 4xx, 5xx or missing receipt is unverified delivery. The sender does not follow redirects or retry. Both sides check the trust context at the time of execution.

## Restore

Disable the Salesforce Named Credential callouts and revoke the temporary principal mapping, clear the two encrypted values, and delete the temporary credential definitions if no longer needed. The issued Development token retains its original expiry independently of Salesforce cleanup. Restore the previous capture label after async work settles. Apply `restore.zip` only in the verified WebDev with `WebdevOutboundCaptureTest`; its pre-destructive manifest removes the temporary test class before restoring the exact capture adapter. Read back the source and run label. Remove the two canary variables from the workflow-test branch and rebuild when appropriate. Confirm anonymous access remains challenged and any callback is captured by the restored adapter.
