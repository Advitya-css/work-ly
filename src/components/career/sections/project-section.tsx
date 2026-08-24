import { FolderGit2, ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { SourceBadge } from "@/components/career/source-badge";
import { ProjectDialog } from "@/components/career/sections/project-dialog";
import { DeleteProjectButton } from "@/components/career/sections/delete-buttons";
import { ConfirmEntityButton } from "@/components/career/sections/confirm-buttons";
import { formatDateRange } from "@/lib/format";
import type { Project } from "@/lib/db/types";

export function ProjectSection({ projects }: { projects: Project[] }) {
  return (
    <Card id="projects">
      <CardHeader>
        <CardTitle>Projects</CardTitle>
        <CardDescription>Things you&apos;ve built, on the side or otherwise.</CardDescription>
        <CardAction>
          <ProjectDialog />
        </CardAction>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderGit2}
            title="No projects added yet"
            description="Add a project, or upload a CV to extract them automatically."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {projects.map((project) => (
              <li key={project.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{project.name}</p>
                    {project.url && (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  {project.role && <p className="text-sm text-muted-foreground">{project.role}</p>}
                  {formatDateRange(project.startDate, project.endDate) && (
                    <p className="text-xs text-muted-foreground">
                      {formatDateRange(project.startDate, project.endDate)}
                    </p>
                  )}
                  {project.description && (
                    <p className="mt-1 whitespace-pre-line text-sm text-foreground/80">{project.description}</p>
                  )}
                  <SourceBadge source={project.source} isUncertain={project.isUncertain} className="mt-1" />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {project.isUncertain && <ConfirmEntityButton id={project.id} type="project" />}
                  <ProjectDialog project={project} />
                  <DeleteProjectButton id={project.id} label={project.name} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
