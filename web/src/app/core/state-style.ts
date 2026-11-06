// CSS class of the colored badge for each state label (see .st-* in styles.css)
const STATE_CLASSES: Record<string, string> = {
  'En stock': 'st-stock',
  'En service': 'st-service',
  'En maintenance': 'st-maintenance',
  'Cédé': 'st-cede',
  'Réformé': 'st-reforme',
  'Perdu': 'st-perdu',
};

export function stateClass(label: string): string {
  return STATE_CLASSES[label] ?? 'st-default';
}
