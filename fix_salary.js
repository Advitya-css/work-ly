const fs = require('fs');
let code = fs.readFileSync('src/lib/format.ts', 'utf8');

const target = `export function formatSalaryRange(min: number | null, max: number | null, currency: string | null): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) => \`\${currency ?? "USD"} \${n.toLocaleString()}\`;
  if (min != null && max != null) return \`\${fmt(min)} – \${fmt(max)}\`;
  return fmt((min ?? max)!);
}`;

const replacement = `export function formatSalaryRange(min: number | null, max: number | null, currency: string | null): string | null {
  if (min == null && max == null) return null;
  const determineSuffix = (val: number) => {
    if (val < 200) return "/hr";
    if (val < 10000) return "/mo";
    return "/yr";
  };
  const fmt = (n: number) => \`\${currency ?? "USD"} \${n.toLocaleString()}\${determineSuffix(n)}\`;
  
  if (min != null && max != null) {
    const minSuffix = determineSuffix(min);
    const maxSuffix = determineSuffix(max);
    if (minSuffix === maxSuffix) {
      return \`\${currency ?? "USD"} \${min.toLocaleString()} – \${max.toLocaleString()}\${minSuffix}\`;
    }
    return \`\${fmt(min)} – \${fmt(max)}\`;
  }
  return fmt((min ?? max)!);
}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/lib/format.ts', code);
