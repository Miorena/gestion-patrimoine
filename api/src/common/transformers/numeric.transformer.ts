import { ValueTransformer } from 'typeorm';

// PostgreSQL returns NUMERIC as a string: convert it to a JS number
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? value : Number(value)),
};
