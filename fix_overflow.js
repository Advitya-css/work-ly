const fs = require('fs');

function applyFixes(file, fixes) {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  fixes.forEach(({target, replacement}) => {
    code = code.replace(target, replacement);
  });
  fs.writeFileSync(file, code);
}

// 1. Discovery Board
applyFixes('src/components/discovery/discovery-board.tsx', [
  {
    target: '<p className="text-sm font-semibold text-foreground">{job.title}</p>',
    replacement: '<p className="text-sm font-semibold text-foreground line-clamp-2 break-words">{job.title}</p>'
  },
  {
    target: '<div className="min-w-0">',
    replacement: '<div className="min-w-0 flex-1">' // ensure it can shrink
  },
  {
    target: '<p className="text-xs text-muted-foreground">\n              {[job.company, job.location, job.country].filter(Boolean).join(" · ") || "-"}\n            </p>',
    replacement: '<p className="text-xs text-muted-foreground truncate">\n              {[job.company, job.location, job.country].filter(Boolean).join(" · ") || "-"}\n            </p>'
  },
  {
    target: '<span>\n            Source: <span className="text-foreground">{job.sourceName}</span>{" "}\n            <Badge variant="secondary">{SOURCE_KIND_LABEL[job.sourceKind]}</Badge>\n          </span>',
    replacement: '<span className="truncate max-w-[200px] sm:max-w-none">\n            Source: <span className="text-foreground">{job.sourceName}</span>{" "}\n            <Badge variant="secondary" className="whitespace-nowrap">{SOURCE_KIND_LABEL[job.sourceKind]}</Badge>\n          </span>'
  }
]);

// 2. Applications Board
applyFixes('src/components/applications/applications-board.tsx', [
  {
    target: 'className="text-sm font-medium leading-tight text-foreground hover:underline"',
    replacement: 'className="text-sm font-medium leading-tight text-foreground hover:underline line-clamp-2 break-words"'
  },
  {
    target: '<p className="pl-5 text-xs text-muted-foreground">{application.company}</p>',
    replacement: '<p className="pl-5 text-xs text-muted-foreground truncate">{application.company}</p>'
  }
]);

// 3. Opportunity Card (make sure it has break-words)
applyFixes('src/components/opportunities/opportunity-card.tsx', [
  {
    target: 'className="line-clamp-2 text-[15px] leading-snug font-semibold text-foreground transition-colors hover:text-primary"',
    replacement: 'className="line-clamp-2 text-[15px] leading-snug font-semibold text-foreground transition-colors hover:text-primary break-words"'
  }
]);

