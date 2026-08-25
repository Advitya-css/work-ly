const fs = require('fs');

let code = fs.readFileSync('src/components/dashboard/getting-started-card.tsx', 'utf8');

const target = `      <CardHeader>
        <CardTitle>Welcome to Workly! Let's get you set up.</CardTitle>
        <CardDescription>
          Complete these {steps.length} steps to unlock the full power of the Fit Algorithm and Priority Engine.
        </CardDescription>
      </CardHeader>`;

const replacement = `      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Welcome to Workly! Let's get you set up.</CardTitle>
            <CardDescription>
              Complete these {steps.length} steps to unlock the full power of the Fit Algorithm and Priority Engine.
            </CardDescription>
          </div>
          <Button asChild variant="secondary" size="sm" className="shrink-0">
            <Link href="/guide">
              <Sparkles className="mr-2 size-4" />
              Read the full Guide
            </Link>
          </Button>
        </div>
      </CardHeader>`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/dashboard/getting-started-card.tsx', code);
