const fs = require('fs');

let code = fs.readFileSync('src/components/dashboard/stale-applications-card.tsx', 'utf8');
code = code.replace(`import { formatDistanceToNow } from "date-fns";`, `function formatDays(date: Date) {
  const days = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return days === 1 ? "1 day" : \`\${days} days\`;
}`);

code = code.replace(`formatDistanceToNow(date)`, `formatDays(date)`);
// Wait, the original code had: {formatDistanceToNow(date)} ago
// Let's replace: {formatDistanceToNow(date)} ago -> {formatDays(date)} ago

fs.writeFileSync('src/components/dashboard/stale-applications-card.tsx', code);
