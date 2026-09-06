# Unified observability

## What "unified" means here concretely

Every EKS workload (backend API, all three workers) and every Lambda
sends telemetry to the same place: the OTel Collector
(`k8s/19-21-otel-collector-*.yaml`). Traces go to AWS X-Ray, metrics go
to AWS Managed Prometheus. AWS Managed Grafana queries both as data
sources in one dashboard (`grafana-dashboard.json`) — the actual point
of "unified" isn't a single vendor, it's not needing to context-switch
between the Lambda console and a separate EKS dashboard to understand
one request's full path.

## The trace propagation is the genuinely interesting part

A CSV import's trace, if everything is wired correctly, looks like one
continuous trace spanning: the browser's request to `get-upload-url` →
the S3 upload → `process-import`'s Lambda invocation → the SQS message →
`import-consumer.js` writing to MongoDB. That last hop — Lambda through
a queue into a completely different process — doesn't happen
automatically. `process-import`'s Lambda explicitly injects a
`traceparent` message attribute before sending to SQS
(`lambdas/process-import/index.mjs`), and `import-consumer.js` explicitly
extracts it and continues the same trace
(`backend/src/workers/import-consumer.js`'s `withExtractedTraceContext`).
Same pattern for assignment submissions.

**A real gotcha hit and fixed while building this:** registering only an
OpenTelemetry *propagator* isn't enough for `context.with()` /
`context.active()` to actually track anything — a *context manager*
needs to be registered too. `telemetry.js`'s `NodeSDK.start()` handles
both automatically in production, but the first version of
`test/trace-propagation.test.js` only simulated the propagator and the
"is a span actually active" assertion failed. Fixed by registering
`AsyncHooksContextManager` in the test too, matching what production
actually does — see the comment at the top of that test file.

## What's verified vs. not

**Verified:** `telemetry.js` actually boots the full app without
throwing (`node --import ./src/telemetry.js` then importing `app.js`).
Trace injection actually produces a valid W3C `traceparent` when a
propagator is registered (proven, not assumed — see the debugging
session in this session's history where injection initially produced an
empty carrier with no propagator registered, which is exactly what a
misconfigured Lambda would look like too). Trace extraction actually
places the correct trace ID into an active span, confirmed via
`test/trace-propagation.test.js`'s 4 tests. All 3 Lambdas' existing test
suites still pass with tracing code added.

**Not verified, because it needs a real AWS account:** that traces
actually arrive in X-Ray, that metrics actually arrive in AMP, that the
ADOT Lambda layer ARN in `terraform/variables.tf` is still the current
published version for your region (that file has a comment flagging
this — AWS updates it periodically and this sandbox can't reach the docs
to confirm), and that the dashboard JSON's PromQL/CloudWatch queries are
exactly right against real metric names (Prometheus metric names
depend on the OTel semantic conventions version in use, which drifts
between SDK versions).

## To actually see this working

1. `terraform apply` (provisions AMP, AMG, the IRSA roles, attaches
   X-Ray write access to every Lambda).
2. Deploy the OTel Collector manifests, then the backend/workers with
   their updated `--import ./src/telemetry.js` commands.
3. In the AMG console: complete the manual AWS SSO user assignment (not
   automatable via Terraform, see the comment in
   `terraform/observability.tf`), add Prometheus and CloudWatch as data
   sources pointing at the AMP workspace and your account respectively,
   then import `grafana-dashboard.json` and replace the
   `${AMP_DATASOURCE_UID}` / `${CLOUDWATCH_DATASOURCE_UID}` placeholders
   with the actual data source UIDs Grafana assigns.
4. Generate some traffic (upload a CSV) and check X-Ray's trace map for
   one trace spanning the Lambda and the worker.
