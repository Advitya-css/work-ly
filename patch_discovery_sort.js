const fs = require('fs');
let code = fs.readFileSync('src/components/discovery/discovery-board.tsx', 'utf8');

// 1. Add Select imports if not present
if (!code.includes('SelectContent')) {
  code = code.replace(
    'import { Input } from "@/components/ui/input";',
    `import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";`
  );
}

// 2. Add sort state
code = code.replace(
  '  const [message, setMessage] = useState<string | null>(null);',
  `  const [message, setMessage] = useState<string | null>(null);
  const [sort, setSort] = useState<"priority" | "fit" | "recent">("priority");`
);

// 3. Apply sort to visible results
const targetVisible = `  const visible = useMemo(() => {
    const results = searchResult.results;
    if (!activeBucket) return results;
    return results.filter((j) => getBucket(j.job).key === activeBucket);
  }, [searchResult, activeBucket]);`;

const replaceVisible = `  const visible = useMemo(() => {
    const results = searchResult.results;
    const bucketed = activeBucket 
      ? results.filter((j) => getBucket(j.job).key === activeBucket)
      : [...results];
      
    switch (sort) {
      case "priority":
        return bucketed.sort((a, b) => (b.job.priorityScore ?? 0) - (a.job.priorityScore ?? 0));
      case "fit":
        return bucketed.sort((a, b) => (b.job.fitScore ?? 0) - (a.job.fitScore ?? 0));
      case "recent":
        return bucketed.sort((a, b) => new Date(b.job.discoveredAt).getTime() - new Date(a.job.discoveredAt).getTime());
      default:
        return bucketed;
    }
  }, [searchResult, activeBucket, sort]);`;

code = code.replace(targetVisible, replaceVisible);

// 4. Add the Sort dropdown UI next to "Show all bands"
const targetSortUI = `        {activeBucket && (
          <button
            type="button"
            onClick={() => setActiveBucket(null)}
            className="mt-2 text-xs text-muted-foreground underline underline-offset-2"
          >
            Show all bands
          </button>
        )}
      </div>`;

const replaceSortUI = `        <div className="mt-2 flex items-center justify-between">
          {activeBucket ? (
            <button
              type="button"
              onClick={() => setActiveBucket(null)}
              className="text-xs text-muted-foreground underline underline-offset-2"
            >
              Show all bands
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort by</span>
            <Select value={sort} onValueChange={(v: any) => setSort(v)}>
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="fit">Fit Score</SelectItem>
                <SelectItem value="recent">Recently Found</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>`;

code = code.replace(targetSortUI, replaceSortUI);

fs.writeFileSync('src/components/discovery/discovery-board.tsx', code);
