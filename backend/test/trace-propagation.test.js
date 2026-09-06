import test, { before } from "node:test";
import assert from "node:assert/strict";
import { trace, context as otelContext, propagation } from "@opentelemetry/api";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { AsyncHooksContextManager } from "@opentelemetry/context-async-hooks";
import { withExtractedTraceContext } from "../src/workers/import-consumer.js";

// In production, telemetry.js's NodeSDK.start() (loaded via --import
// before any worker file, see package.json's start script and every
// worker Deployment's command in k8s/) registers both a propagator and a
// context manager automatically. Registering only the propagator isn't
// enough — context.with()/context.active() silently don't track
// anything without a context manager too, which is exactly the failure
// this test caught the first time it was written without one. This
// simulates exactly what production already does, rather than testing
// against a configuration no real deployment would run with.
before(() => {
  propagation.setGlobalPropagator(new W3CTraceContextPropagator());
  otelContext.setGlobalContextManager(new AsyncHooksContextManager().enable());
});

test("calls fn() and returns its result when the message has no traceparent", async () => {
  const message = { MessageAttributes: {} };
  const result = await withExtractedTraceContext(message, async () => "processed");
  assert.equal(result, "processed");
});

test("calls fn() and returns its result when the message has no MessageAttributes at all", async () => {
  const result = await withExtractedTraceContext({}, async () => "processed");
  assert.equal(result, "processed");
});

test("a valid traceparent puts an active span in context during fn(), unlike the no-traceparent case", async () => {
  // A syntactically valid W3C traceparent: version-traceId-spanId-flags.
  const traceparent = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
  const message = { MessageAttributes: { traceparent: { StringValue: traceparent } } };

  let spanDuringNoTraceparent;
  await withExtractedTraceContext({ MessageAttributes: {} }, async () => {
    spanDuringNoTraceparent = trace.getSpan(otelContext.active());
  });
  assert.equal(spanDuringNoTraceparent, undefined, "no traceparent means no span should be active");

  let spanDuringTraceparent;
  let traceIdSeen;
  await withExtractedTraceContext(message, async () => {
    spanDuringTraceparent = trace.getSpan(otelContext.active());
    traceIdSeen = spanDuringTraceparent?.spanContext().traceId;
  });
  assert.ok(spanDuringTraceparent, "a valid traceparent should put an active span in context");
  assert.equal(traceIdSeen, "4bf92f3577b34da6a3ce929d0e0e4736", "the span should belong to the trace ID from the incoming traceparent, proving it's linked, not a fresh unrelated trace");
});

test("an error inside fn() still propagates out, it isn't swallowed by the tracing wrapper", async () => {
  await assert.rejects(
    () => withExtractedTraceContext({ MessageAttributes: {} }, async () => { throw new Error("boom"); }),
    /boom/,
  );
});
