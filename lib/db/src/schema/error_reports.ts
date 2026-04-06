import { pgTable, text, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const sourceAppEnum = pgEnum("error_source_app", [
  "customer", "rider", "vendor", "admin", "api",
]);

export const errorTypeEnum = pgEnum("error_type", [
  "frontend_crash", "api_error", "db_error", "route_error", "ui_error", "unhandled_exception",
]);

export const errorSeverityEnum = pgEnum("error_severity", [
  "critical", "medium", "minor",
]);

export const errorStatusEnum = pgEnum("error_status", [
  "new", "acknowledged", "in_progress", "resolved",
]);

export const errorReportsTable = pgTable("error_reports", {
  id:             text("id").primaryKey(),
  timestamp:      timestamp("timestamp").defaultNow().notNull(),
  sourceApp:      sourceAppEnum("source_app").notNull(),
  errorType:      errorTypeEnum("error_type").notNull(),
  severity:       errorSeverityEnum("severity").notNull(),
  status:         errorStatusEnum("status").default("new").notNull(),
  functionName:   text("function_name"),
  moduleName:     text("module_name"),
  componentName:  text("component_name"),
  errorMessage:   text("error_message").notNull(),
  shortImpact:    text("short_impact"),
  stackTrace:     text("stack_trace"),
  metadata:       jsonb("metadata"),
  resolvedAt:     timestamp("resolved_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
});

export type ErrorReport = typeof errorReportsTable.$inferSelect;
export type NewErrorReport = typeof errorReportsTable.$inferInsert;
