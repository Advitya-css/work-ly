const fs = require('fs');

let code = fs.readFileSync('src/components/discovery/add-feed-form.tsx', 'utf8');
code = code.replace(
  `variant="outline" size="sm" onClick={() => setIsOpen(true)} className="w-full mt-4"`,
  `variant="ghost" size="sm" onClick={() => setIsOpen(true)} className="text-muted-foreground"`
);
code = code.replace(
  `className="mt-4 flex flex-col gap-2 rounded-lg border p-3"`,
  `className="absolute top-12 right-0 z-50 w-[300px] flex flex-col gap-2 rounded-lg border bg-popover shadow-md p-3"`
);

// We need to wrap it in a relative container so absolute works, but since it's used inside the flex row, let's just make it relative itself.
code = code.replace(
  `  if (!isOpen) {`,
  `  return (
    <div className="relative">
      {!isOpen ? (
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)} className="text-muted-foreground" title="Add RSS Feed">
          <Plus className="size-4" />
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="absolute top-10 right-0 z-50 w-[300px] flex flex-col gap-2 rounded-lg border bg-popover shadow-md p-3">
          <h4 className="text-sm font-medium">Add Public RSS Feed</h4>
          <Input
            placeholder="https://example.com/jobs/rss"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={pending}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending || !url.trim()}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Source
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
`
);

// Now remove the old returns
code = code.replace(/  if \(\!isOpen\) \{[\s\S]*?Cancel\n        <\/Button>\n      <\/div>\n    <\/form>\n  \);\n\}/, '}');

fs.writeFileSync('src/components/discovery/add-feed-form.tsx', code);
