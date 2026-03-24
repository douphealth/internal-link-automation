export type AnalyticsError =
  | { type: 'TRACKING_ERROR'; message: string }
  | { type: 'QUERY_ERROR'; message: string }
  | { type: 'REPORT_ERROR'; message: string };
