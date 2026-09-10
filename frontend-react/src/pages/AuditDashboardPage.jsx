import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, ShieldCheck } from "lucide-react";
import { getAuditLog, getAuditFilterOptions } from "../api/audit";
import { describeActivity, activitySubject } from "../utils/describeActivity";
import EmptyState from "../components/common/EmptyState";
import Pagination from "../components/common/Pagination";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const emptyFilters = { entityType: "", action: "", actorEmail: "", dateFrom: "", dateTo: "" };

export default function AuditDashboardPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);

  const filterOptions = useQuery({
    queryKey: ["audit", "filterOptions"],
    queryFn: getAuditFilterOptions,
    select: (res) => res.data,
  });

  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const log = useQuery({
    queryKey: ["audit", "list", activeFilters, page],
    queryFn: () => getAuditLog({ ...activeFilters, page, limit: 25 }),
    select: (res) => res.data,
  });

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  const entries = log.data?.items ?? [];

  return (
    <div className="page-narrow">
      <section className="form-card">
        <h2>Filters</h2>
        <div className="form-grid">
          <label>
            <span>Entity type</span>
            <select value={filters.entityType} onChange={(e) => updateFilter("entityType", e.target.value)}>
              <option value="">All</option>
              {(filterOptions.data?.entityTypes ?? []).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Action</span>
            <select value={filters.action} onChange={(e) => updateFilter("action", e.target.value)}>
              <option value="">All</option>
              {(filterOptions.data?.actions ?? []).map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Performed by</span>
            <select value={filters.actorEmail} onChange={(e) => updateFilter("actorEmail", e.target.value)}>
              <option value="">Anyone</option>
              {(filterOptions.data?.actorEmails ?? []).map((email) => (
                <option key={email} value={email}>
                  {email}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>From</span>
            <input type="date" value={filters.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={filters.dateTo} onChange={(e) => updateFilter("dateTo", e.target.value)} />
          </label>
        </div>
        {(filters.entityType || filters.action || filters.actorEmail || filters.dateFrom || filters.dateTo) && (
          <button type="button" className="button button-secondary" onClick={() => setFilters(emptyFilters)}>
            Clear filters
          </button>
        )}
      </section>

      <section className="dashboard-card">
        <div className="section-heading">
          <div>
            <h2>Audit log</h2>
            <p>{log.data ? `${log.data.total} matching event(s)` : "Every recorded action across the system."}</p>
          </div>
        </div>

        {log.isLoading && (
          <div className="skeleton-rows">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="skeleton" key={i} style={{ height: 40 }} />
            ))}
          </div>
        )}

        {log.isError && (
          <div className="inline-error">{getApiErrorMessage(log.error, "Unable to load the audit log.")}</div>
        )}

        {!log.isLoading && entries.length === 0 && (
          <EmptyState icon={History} title="No matching events" message="Try widening the filters above." />
        )}

        {entries.length > 0 && (
          <>
            <div className="recent-students-list">
              {entries.map((entry) => {
                const subject = activitySubject(entry);
                const description = describeActivity(entry);
                return (
                  <div key={entry._id} className="recent-student-item" style={{ cursor: "default" }}>
                    <div className="recent-student-item-main">
                      <span className="stat-card-icon" style={{ width: 28, height: 28 }}>
                        <ShieldCheck size={14} aria-hidden="true" />
                      </span>
                      <div>
                        <strong>{entry.actorEmail || "System"}</strong>
                        <span>
                          {description}
                          {subject ? `: ${subject}` : ""}
                          {" · "}
                          {entry.entityType}
                        </span>
                      </div>
                    </div>
                    <time>{formatDate(entry.createdAt)}</time>
                  </div>
                );
              })}
            </div>

            {log.data.totalPages > 1 && (
              <Pagination
                pagination={{
                  page: log.data.page,
                  limit: log.data.limit,
                  totalItems: log.data.total,
                  totalPages: log.data.totalPages,
                  hasPreviousPage: log.data.page > 1,
                  hasNextPage: log.data.page < log.data.totalPages,
                }}
                onPageChange={setPage}
                itemLabel="events"
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
