export type Dataset = {
  id: number;
  slug: string;
  name: string;
  description: string;
};

export type MetricHensachiRow = {
  item: { key: string; name: string; meta: Record<string, unknown> };
  value: string;
  hensachi: string;
};

export type MetricHensachiResponse = {
  dataset: string;
  metric: string;
  unit: string;
  count: number;
  mean: string;
  std: string;
  results: MetricHensachiRow[];
};

export type UserMetricHensachiResponse = {
  user_metric: string;
  x: string;
  hensachi: string;
  mean: string;
  std: string;
  count: number;
  unit: string;
};
