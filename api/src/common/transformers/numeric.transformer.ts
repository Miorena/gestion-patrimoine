import { ValueTransformer } from 'typeorm';

// PostgreSQL renvoie NUMERIC sous forme de chaîne : on la convertit en nombre JS
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? value : Number(value)),
};
