const fs = require('fs');
let code = fs.readFileSync('src/components/applications/applications-board.tsx', 'utf8');

// 1. Add sort state
code = code.replace(
  '  const [filters, setFilters] = useState<AnalyticsFilters>({ dateRange: "ALL" });',
  `  const [filters, setFilters] = useState<AnalyticsFilters>({ dateRange: "ALL" });
  const [sort, setSort] = useState<"recent" | "fit">("recent");`
);

// 2. Sort the applications inside the byStatus map
const targetByStatus = `  const byStatus = useMemo(() => {
    const map = new Map<ApplicationStatus, Application[]>();
    for (const column of PIPELINE_COLUMNS) map.set(column, []);
    for (const application of filtered) {
      map.get(application.status)?.push(application);
    }
    return map;
  }, [filtered]);`;

const replaceByStatus = `  const byStatus = useMemo(() => {
    const map = new Map<ApplicationStatus, Application[]>();
    for (const column of PIPELINE_COLUMNS) map.set(column, []);
    
    // Create a sorted copy of filtered
    const sortedFiltered = [...filtered].sort((a, b) => {
      if (sort === "fit") {
        return (b.fitScoreAtApply ?? 0) - (a.fitScoreAtApply ?? 0);
      }
      // default: recent
      const dateA = a.dateApplied ? new Date(a.dateApplied).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.dateApplied ? new Date(b.dateApplied).getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    for (const application of sortedFiltered) {
      map.get(application.status)?.push(application);
    }
    return map;
  }, [filtered, sort]);`;

code = code.replace(targetByStatus, replaceByStatus);

// 3. Add Sort Dropdown UI next to the view toggle (Kanban/Table)
const targetViewToggle = `          <TabsList>
            <TabsTrigger value="kanban" onClick={() => setView("kanban")}>
              <LayoutGrid className="mr-2 size-4" />
              Board
            </TabsTrigger>
            <TabsTrigger value="table" onClick={() => setView("table")}>
              <Table2 className="mr-2 size-4" />
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>`;

const replaceViewToggle = `          <TabsList>
            <TabsTrigger value="kanban" onClick={() => setView("kanban")}>
              <LayoutGrid className="mr-2 size-4" />
              Board
            </TabsTrigger>
            <TabsTrigger value="table" onClick={() => setView("table")}>
              <Table2 className="mr-2 size-4" />
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort by</span>
          <Select value={sort} onValueChange={(v: any) => setSort(v)}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Date Applied</SelectItem>
              <SelectItem value="fit">Fit Score</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>`;

code = code.replace(targetViewToggle, replaceViewToggle);

fs.writeFileSync('src/components/applications/applications-board.tsx', code);
