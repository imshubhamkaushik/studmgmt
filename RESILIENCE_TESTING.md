# Resilience testing

## What "tested" means here, honestly

Two different kinds of claim live in this document, and they're not
equally strong:

1. **Verified from this sandbox** — a real, automated test proving a
   specific failure-handling property of the actual code, with no live
   AWS account involved. These are trustworthy the same way the rest of
   this project's unit tests are.
2. **A designed experiment, not yet run** — an AWS FIS experiment
   template exists and is syntactically valid, but nobody (including me)
   has started it against a real cluster and watched what actually
   happens. Treat these as a test plan, not a result.

## Verified: message-level failure handling (`test/resilience.test.js`)

Three tests directly exercise `handleOneMessage` (extracted from
`import-consumer.js`'s polling loop specifically to make this testable):

- A successfully processed message is deleted from the queue.
- **A simulated DynamoDB throttling error leaves the message on the
  queue** — proven by asserting `DeleteMessageCommand` is never called,
  not just that the function didn't throw. This is the property the
  whole at-least-once delivery design depends on: if this were wrong, a
  transient AWS blip could silently and permanently lose a student
  record.
- A malformed message body (bad JSON) fails safely the same way, rather
  than crashing the worker's loop.

`submission-consumer.js` and `audit-archive-worker.js` share the same
try/catch-around-delete shape but weren't independently refactored and
tested the same way in this pass — same design, same expected behavior,
just not re-verified per-worker. That's worth doing before trusting it
equally.

## Verified: trace context survives the Lambda → SQS → worker boundary

Covered above in `observability/README.md`, not repeated here, but it's
as much a resilience property as an observability one: if a message
fails and gets redelivered, does the retry still carry a
correctly-linked trace? `test/trace-propagation.test.js` proves the
extraction mechanics work; it doesn't prove this specifically for a
*redelivered* message, since ADOT (not this repo's code) controls
whether a redelivered SQS message still carries its original
`MessageAttributes`. Worth confirming empirically once there's a real
queue to redeliver from.

## A real gap this exercise found and fixed, not just flagged

Neither `process-import`'s nor `process-submission`'s EventBridge target
had a `dead_letter_config`. If EventBridge fails to invoke the Lambda
after retrying (the Lambda erroring, throttling, or timing out), the
triggering S3 event was silently dropped — no DLQ, no log, no way to
know a CSV upload or assignment submission just vanished. This is a
**different failure mode** from each pipeline's own SQS DLQ, which only
catches failures *after* the Lambda already ran successfully. Fixed in
`terraform/lambdas.tf` and `terraform/assignment-submissions.tf` — both
targets now have a `dead_letter_config` pointing at a shared
`eventbridge_target_dlq`, plus a `retry_policy` bounding how long
EventBridge keeps retrying before giving up. `eventbridge_target_dlq_url`
is a Terraform output specifically so this can be wired into a "should
always be empty" CloudWatch alarm later — not done yet, flagged as a
follow-up.

## Designed, not yet run: AWS FIS experiments (`terraform/resilience-testing.tf`)

**Experiment 1 — kill an import-worker pod mid-processing.**
Hypothesis: with 2 replicas and no shared state, killing one pod causes
zero message loss. To actually observe this:
1. Start a large-ish CSV import so processing takes long enough to catch
   mid-flight.
2. Start the experiment (`aws fis start-experiment`) while it's running.
3. Watch `kubectl -n studmgmt get pods -l app=import-worker -w` — one
   pod should terminate and a replacement appear.
4. Confirm the import still completes with the correct final counts
   (`GET /students/import-jobs/:jobId`) — not just that it *eventually*
   finishes, but that `successCount + failureCount + errorCount` still
   adds up to the original row count. A silent gap here would mean a
   message was lost, not just delayed.

**Experiment 2 — force `process-import` to error on every invocation for
5 minutes.** This is designed specifically to test the gap described
above. Expected result *after* the dead-letter-queue fix: failed
invocations land in `eventbridge_target_dlq` and are visible via
`aws sqs get-queue-attributes --attribute-names ApproximateNumberOfMessages`.
Before the fix, the expected (bad) result would have been: nothing
visible anywhere, the uploaded file just never gets processed and there
is no signal that anything went wrong. Worth literally re-running this
experiment against the *old* config in a scratch environment if you want
to see the gap reproduce, before trusting that the fix actually closes it.

**Honest caveat repeated from the Terraform file:** the exact FIS action
IDs and parameter names (`aws:eks:pod-delete`, `aws:lambda:invocation-error`)
reflect my best understanding, not a verified-against-current-docs
confirmation — this sandbox can't reach FIS's API reference. Run
`aws fis list-actions` and cross-check the parameter schema before
starting either experiment for real.

## Not attempted at all

- Chaos-testing DocumentDB/ElastiCache failover (would need FIS's RDS
  actions or a manual failover trigger).
- Load testing to find the actual breaking point of any pipeline —
  everything here is about *correctness under failure*, not *capacity*.
- Testing the audit-archive-worker's batching logic under a killed pod
  specifically — the in-memory batch (`test/audit-archive-worker.test.js`
  covers the formatting, not this) would be lost if a pod dies between
  receiving messages and flushing, though since messages aren't deleted
  until after a successful flush (see `audit-archive-worker.js`), this
  should self-heal via redelivery the same way the other workers do —
  reasoned through, not verified with a dedicated test.
