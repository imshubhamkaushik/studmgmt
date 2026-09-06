// Loaded via `node --import ./src/telemetry.js src/server.js` (see
// package.json's start script, Dockerfile's CMD, and every worker
// Deployment's command in k8s/) — NOT imported normally inside
// server.js. OpenTelemetry's auto-instrumentation works by patching
// modules (express, mongoose, http) at the moment they're first
// required; if this ran as a regular import after those modules were
// already loaded elsewhere in the import graph, the patching would be
// too late and nothing would actually get traced.
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

// Same collector endpoint every workload in the cluster sends to (see
// k8s/19-otel-collector.yaml) — this is what makes the resulting traces
// "unified" rather than per-service: every EKS pod and every Lambda
// (via the ADOT layer, see terraform/lambdas.tf) exports to one place.
const COLLECTOR_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://otel-collector.studmgmt.svc.cluster.local:4318";

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "studmgmt-backend",
    [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || "unknown",
  }),
  traceExporter: new OTLPTraceExporter({ url: `${COLLECTOR_ENDPOINT}/v1/traces` }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: `${COLLECTOR_ENDPOINT}/v1/metrics` }),
    exportIntervalMillis: 15000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Every filesystem read/write (multer, report-card PDF writes)
      // would otherwise generate a span — noisy and not useful for
      // understanding request behavior.
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
  ],
});

sdk.start();

// Flushes any spans/metrics still buffered before the process actually
// exits — without this, telemetry from the last few seconds before a
// pod terminates (e.g. during a rolling deploy) is silently dropped.
process.on("SIGTERM", () => {
  sdk.shutdown().catch((error) => console.error("Error shutting down OpenTelemetry SDK:", error));
});
