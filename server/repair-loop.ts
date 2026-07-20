type Inspection = { validation: { valid: boolean; errors: string[] } };

export async function repairUntilValid<TInspection extends Inspection>(input: {
  initialHtml: string;
  inspect: (html: string) => TInspection;
  repair: (html: string, errors: string[], attempt: number) => Promise<string>;
  maxAttempts: number;
}) {
  let html = input.initialHtml;
  let inspection = input.inspect(html);
  let attempts = 0;
  while (!inspection.validation.valid && attempts < input.maxAttempts) {
    attempts += 1;
    html = await input.repair(html, inspection.validation.errors, attempts);
    inspection = input.inspect(html);
  }
  return { html, inspection, attempts };
}
