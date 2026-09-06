# Deploying studmgmt to AWS

Phase 1 gets the existing app running on EKS with no application code
changes — just infrastructure and container packaging. Phase 2 adds the
serverless CSV import pipeline on top of that baseline. Later phases
(assignment/audit event pipelines, unified observability) build further
on both.

## What's verified vs. what isn't

I don't have AWS credentials or a real cluster available in the sandbox
this was built in, so I could not run `terraform apply`, `docker build`,
or `kubectl apply` against real infrastructure. What I *could* and did
verify:

- The backend Dockerfile bug (missing `docs/` folder, causing a boot
  crash) — proven by simulating the exact build context and booting the
  app from it, both before and after the fix.
- Every Kubernetes manifest is valid YAML and has the required
  `apiVersion`/`kind`/`metadata.name` fields.
- Every Terraform file is valid HCL, and every resource/module/variable
  reference across all twelve files resolves to something actually
  defined — no typos or renamed-but-not-updated references.
- The ElastiCache TLS decision — traced the backend's actual rate-limiter
  code to confirm it can't speak TLS before deciding to leave transit
  encryption off, rather than assuming.

What I could *not* verify: that `terraform apply` succeeds against a real
AWS account (module versions, IAM permissions, and account-specific quotas
all matter here), that DocumentDB actually accepts every aggregation
query this app runs, or that the `wget` in the Dockerfile successfully
reaches `truststore.pki.rds.amazonaws.com` (that domain isn't reachable
from the sandbox this was built in — it will be from a normal CI runner
or your own machine). Treat this as a strong first draft to `terraform
plan` and review, not something to `apply` blind.

## Order of operations (phase 1)

1. **Bootstrap Terraform state** (one-time, outside this config): create
   an S3 bucket and DynamoDB table for state locking, then uncomment the
   `backend "s3"` block in `terraform/versions.tf`.

2. **Apply the infrastructure:**
   ```
   cd terraform
   cp terraform.tfvars.example terraform.tfvars   # adjust as needed
   terraform init
   terraform plan
   terraform apply
   ```
   Save the outputs — you'll need `ecr_backend_repository_url`,
   `ecr_frontend_repository_url`, and `backend_irsa_role_arn` in the next
   steps.

3. **Point kubectl at the new cluster:**
   ```
   $(terraform output -raw configure_kubectl)
   ```

4. **Install cluster add-ons** (not managed by this Terraform config —
   both are usually installed via their own Helm charts):
   - [AWS Load Balancer Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/) — required for `k8s/09-ingress.yaml` to get an address
   - [External Secrets Operator](https://external-secrets.io/) — required for `k8s/02b-backend-externalsecret.yaml`

5. **Build and push images:**
   ```
   aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com

   docker build -t <ecr_backend_repository_url>:v1 -f backend/Dockerfile .
   docker push <ecr_backend_repository_url>:v1

   docker build --build-arg VITE_API_BASE_URL=https://<your-domain>/api/v1 \
     --build-arg VITE_IMPORT_UPLOAD_URL=<get_upload_url_function_url output> \
     -t <ecr_frontend_repository_url>:v1 ./frontend-react
   docker push <ecr_frontend_repository_url>:v1
   ```
   Note the frontend needs the real API URL *at build time* — it's baked
   into the JS bundle, not read at container startup. That means your
   domain/Ingress needs to be stable before this build.

6. **Fill in the placeholders** in `k8s/`:
   - `04-backend-deployment.yaml` and `06-frontend-deployment.yaml` — the `REPLACE_WITH_ECR_*_IMAGE:TAG` image references
   - `02c-backend-serviceaccount.yaml` — the `eks.amazonaws.com/role-arn` annotation, from `backend_irsa_role_arn`
   - `09-ingress.yaml` — the ACM certificate ARN

7. **Apply the manifests:**
   ```
   kubectl apply -f k8s/00-namespace.yaml
   kubectl apply -f k8s/01-backend-configmap.yaml
   kubectl apply -f k8s/02b-backend-externalsecret.yaml
   kubectl apply -f k8s/02c-backend-serviceaccount.yaml
   kubectl apply -f k8s/03-backend-pvc.yaml
   kubectl apply -f k8s/04-backend-deployment.yaml
   kubectl apply -f k8s/05-backend-service.yaml
   kubectl apply -f k8s/06-frontend-deployment.yaml
   kubectl apply -f k8s/07-frontend-service.yaml
   kubectl apply -f k8s/08-frontend-hpa.yaml
   kubectl apply -f k8s/09-ingress.yaml
   ```
   Skip `02-backend-secret.example.yaml` entirely — it's a reference
   template, not something to apply.

8. **Verify:**
   ```
   kubectl -n studmgmt get pods
   kubectl -n studmgmt logs deploy/backend
   kubectl -n studmgmt get ingress studmgmt   # wait for an ADDRESS to appear
   ```

## Phase 2: the CSV import pipeline

Adds serverless async CSV import on top of phase 1's baseline: `lambdas/get-upload-url` issues a presigned S3 URL after checking the caller's JWT and role, `lambdas/process-import` validates the uploaded CSV and queues valid rows to SQS, and `backend/src/workers/import-consumer.js` (a second Deployment using the same image) writes them via the exact same `createStudent()` the API uses.

**Before `terraform apply`:** run `./lambdas/build.sh` from the repo root. It stages each Lambda's deployment package in `lambdas/<name>/dist/`, preserving the same relative path to `shared/` that the source code's import statements expect — Terraform's `archive_file` just zips whatever's already staged there, it doesn't build anything itself. Re-run it any time `shared/*.mjs` or a Lambda's `index.mjs` changes, before the next apply.

**New outputs after apply:** `get_upload_url_function_url`, `import_queue_url`, `import_jobs_table_name`, `import_notifications_topic_arn`, `import_worker_irsa_role_arn` — fill these into `k8s/10-import-worker-configmap.yaml` and `k8s/11-import-worker-serviceaccount.yaml`.

**Additional manifests to apply:**
```
kubectl apply -f k8s/10-import-worker-configmap.yaml
kubectl apply -f k8s/11-import-worker-serviceaccount.yaml
kubectl apply -f k8s/12-import-worker-deployment.yaml
```

**Verified this phase:** 33 automated tests total — 22 backend unit tests (including the shared-module refactor and the import-consumer's counting/completion logic with fake AWS clients), 6 for `get-upload-url` (using a real `S3Client` with throwaway credentials, since presigning is pure local signing and needs no network call), 5 for `process-import` (CSV parsing, per-row validation, SQS batch-splitting at 10, the 500-row limit). Also proved, by simulating the exact `/var/task` layout Lambda would produce, that both Lambda packages' `shared/` imports resolve correctly once zipped — this is exactly the class of bug (relative paths that work locally but not once packaged) the Dockerfile's missing `docs/` folder was in phase 1.

**Now done:** the frontend has a "Bulk Import" button alongside the
existing "Import CSV" button — it calls `get_upload_url_function_url`,
PUTs the file directly to S3, and polls `/students/import-jobs/:jobId`
until the job finishes, showing success/failure counts and a download
link for the error report if any rows were rejected. The original
synchronous import (client-side parsing, instant preview) is unchanged
and still the better choice for small files — the two are complementary,
not a replacement of one by the other.

## Known limitations

**Phase 1:**
- Backend is pinned to 1 replica because the uploads PVC is
  `ReadWriteOnce` — resolved once report cards / submissions move to S3.
- ElastiCache transit encryption is off because the hand-rolled Redis
  client doesn't speak TLS — see the comment in `terraform/elasticache.tf`.
- DocumentDB's aggregation-operator subset hasn't been checked against
  this app's actual queries on a real cluster — smoke-test the
  mark-entry and report-card endpoints early after cutover.

**Phase 2:**
- `BackgroundImportModal` and `useBackgroundImport` have no automated tests
  yet — verified only by a successful `vite build` and the existing 40
  frontend tests still passing, not by tests of their own logic.
- `aws_lambda_function_url`'s CORS `allow_origins` is a placeholder
  domain — update it to match `CORS_ORIGINS` once the real domain is known.
- The import-worker's IRSA role reuses the same four Secrets Manager
  entries as the API server's role rather than a narrower subset scoped
  to just `MONGODB_URI` — documented as a deliberate simplification in
  `terraform/iam.tf`, not an oversight, but worth tightening later.
- `get-upload-url`'s `JWT_SECRET` is a plain Lambda environment variable,
  not fetched from Secrets Manager at invocation time like the backend's
  copy is — see the comment in `terraform/lambdas.tf` for the trade-off.

## Notes from the app's own existing docs (worth reading before you deploy)

- `PRODUCTION_DEPLOYMENT.md` distinguishes `/api/v1/health` (process
  liveness) from `/api/v1/ready` (Mongo connectivity) and says not to
  route traffic until `/ready` passes — `04-backend-deployment.yaml`'s
  readinessProbe uses `/ready` for exactly this reason, not `/health`.
- `PRODUCTION_HARDENING.md` confirms the rate limiter falls back to
  per-replica in-memory limiting if `REDIS_URL` is unreachable, and warns
  this must be set in any environment beyond the bundled Compose stack.
  It already is here, end-to-end: `terraform/secrets.tf` →
  `k8s/02b-backend-externalsecret.yaml` → the `backend-secret` Secret's
  `REDIS_URL` key — but it's worth confirming in pod logs after first
  deploy rather than assuming the wiring held.
- `ops/backup/backup-mongodb.sh` and `restore-mongodb.sh` use
  `mongodump`/`mongorestore`, which are wire-protocol compatible with
  DocumentDB — these should keep working with the new `MONGODB_URI`, but
  that's untested against a real DocumentDB cluster from here.

## Phase 3 (partial): assignment submission uploads

Same S3-presigned-upload pattern as the CSV pipeline, applied a second
time: `POST /assignment-submissions/assignment/:id/upload-url` (staff) and
`POST /portal/assignment-submissions/assignment/:id/upload-url` (student,
via the portal) generate a presigned S3 POST. S3's own upload conditions
enforce the 10MB size limit — nothing lands in the bucket oversized in the
first place. `process-submission` (Lambda) then checks the file extension
against an allow-list and queues the result; `submission-consumer.js`
(EKS worker) writes the outcome to the submission record and notifies the
assignment's teacher.

**A real authorization gap this design deliberately avoids:** a portal
student's access can't reuse `getAssignedClassroomIds` (the existing
teacher-scoping helper) — that function treats any non-`"teacher"` role as
unrestricted, which would have given a student access to every
assignment in the school. `assertStudentCanSubmit` checks actual, current
`Enrollment` instead. Covered by
`test/integration/submission-upload-authorization.integration.test.js`
(3 cases: enrolled, enrolled-elsewhere, not-enrolled-at-all) — written and
syntax-checked, but like all integration tests in this repo, not run
against a live database from this sandbox.

**Not done, honestly:**
- **The frontend isn't wired up to this pipeline at all yet** — students
  still submit however the existing UI currently works (check
  `frontend-react/src/components` for the current assignment-submission
  flow before building this). This is a bigger frontend lift than the CSV
  import one was, since it needs a portal-side UI, not just an admin one.
## Phase 3b: audit archival pipeline

**This isn't what was originally planned, and that's a deliberate,
reasoned change, not scope creep.** The original plan was to move
`writeAudit()`'s writes through EventBridge → SQS → an EKS worker,
*replacing* the synchronous Mongo write. Two things killed that plan once
actually tested against the real code:

1. `test/integration/auth-authorization.integration.test.js` (pre-existing,
   not written this session) asserts an audit entry exists in MongoDB
   *immediately* after the triggering request returns. Under a fully async
   design this test can't just be made to wait longer — there's no SQS or
   worker running in the test environment at all (no LocalStack), so the
   entry would never appear, full stop.
2. `AuditLog.create()` is a single fast Mongo insert that already
   swallows its own errors (see the original `writeAudit`, unchanged by
   this session). It was never actually a request-latency problem the way
   PDF generation or CSV parsing were — the original "decouple from
   request latency" framing was a reasonable guess before the codebase
   had been read closely, not something that held up under it.

**What's actually built:** the synchronous Mongo write stays exactly as
it was — same consistency guarantees, same passing tests, zero behavior
change. Alongside it, `writeAudit()` now also publishes the same entry to
EventBridge (`source: studmgmt.audit`), fire-and-forget, never awaited,
wrapped in its own error handling that can never affect the primary
write. `audit-archive-worker.js` (EKS, 2 replicas, no shared state
needed) batches these into NDJSON files in a dedicated S3 bucket, which
transitions to Glacier after 90 days — a real, standard pattern for audit
logs specifically: operational databases don't need to hold years of
compliance history, cheap object storage does.

Tested: `formatBatchAsNdjson` and `flushBatch` (4 unit tests, pure logic
plus a fake S3 client, no database needed). Not tested: the EventBridge
publish → SQS → worker path end to end, same limitation as every other
async pipeline in this repo — needs a real AWS account.

## What's left

Against the original phased plan: phases 1 (containerize/deploy) and 2
(CSV import) are code-complete; phase 2 also has a working frontend.
Phase 3 covers submission uploads and audit archival, both with backend
and frontend now built. Phase 4 (unified observability) and phase 5
(resilience testing) are covered in `observability/README.md` and
`RESILIENCE_TESTING.md` respectively — both are real, verified-as-far-as-
possible code and IaC, not just design documents, but neither has been
exercised against a live AWS account. The CI/CD half of phase 6 (GitHub
Actions currently runs tests only, not build/push/deploy) hasn't been
started. The student/guardian portal — a genuinely separate application
with its own login and auth flow, not a feature addition — also hasn't
been started; every portal-facing backend endpoint built this session
(report card download, notifications, assignment submission) has zero UI
a student could actually use.

None of this — not one line of Terraform, not one Lambda, not the
collector, not an FIS experiment — has been applied or started against a
real AWS account from where it was written. That's the biggest untested
assumption underneath everything in this document, and it hasn't gotten
smaller as the project has grown; if anything each new pipeline adds
another thing that's "correct on paper" but unconfirmed in practice.
