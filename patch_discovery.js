const fs = require('fs');

let code = fs.readFileSync('src/components/discovery/discovery-board.tsx', 'utf8');

// 1. Remove the standalone <AddFeedForm /> and the message Alert.
code = code.replace(/      \{\/\* Suppressed expansion: explains an absence, which is otherwise invisible \*\/\}[\s\S]*?<AddFeedForm \/>/, `      {/* Suppressed expansion: explains an absence, which is otherwise invisible */}
      {searchResult.expansion.expandedRoles.length === 0 &&
        searchResult.expansion.suppressed.length > 0 && (
          <Alert>
            <Info className="size-4" />
            <AlertDescription>
              {searchResult.expansion.suppressed[0].reason}
            </AlertDescription>
          </Alert>
        )}`);

// Remove the old message alert block
code = code.replace(/      \{message && \(\n        <Alert>\n          <AlertDescription>\{message\}<\/AlertDescription>\n        <\/Alert>\n      \)\}\n/, '');

// 2. Put AddFeedForm and Message inside the Search flex container
const targetSearchRow = `        <Button type="button" onClick={discover} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Radar />}
          {pending ? "Discovering…" : "Discover"}
        </Button>
      </div>`;

const replaceSearchRow = `        <Button type="button" onClick={discover} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Radar />}
          {pending ? "Discovering…" : "Discover"}
        </Button>
        <AddFeedForm />
      </div>
      
      {message && (
        <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-top-2">
          {message}
        </p>
      )}`;

code = code.replace(targetSearchRow, replaceSearchRow);

fs.writeFileSync('src/components/discovery/discovery-board.tsx', code);
