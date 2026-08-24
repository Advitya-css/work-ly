import { BadgeCheck, ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { SourceBadge } from "@/components/career/source-badge";
import { CertificationDialog } from "@/components/career/sections/certification-dialog";
import { DeleteCertificationButton } from "@/components/career/sections/delete-buttons";
import { ConfirmEntityButton } from "@/components/career/sections/confirm-buttons";
import { formatMonthYear } from "@/lib/format";
import type { Certification } from "@/lib/db/types";

export function CertificationSection({ certifications }: { certifications: Certification[] }) {
  return (
    <Card id="certifications">
      <CardHeader>
        <CardTitle>Certifications</CardTitle>
        <CardDescription>Licenses and certifications you hold.</CardDescription>
        <CardAction>
          <CertificationDialog />
        </CardAction>
      </CardHeader>
      <CardContent>
        {certifications.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title="No certifications added yet"
            description="Add a certification, or upload a CV to extract them automatically."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {certifications.map((cert) => (
              <li key={cert.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{cert.name}</p>
                    {cert.credentialUrl && (
                      <a
                        href={cert.credentialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Verify <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  {cert.issuer && <p className="text-sm text-muted-foreground">{cert.issuer}</p>}
                  {(formatMonthYear(cert.issueDate) || formatMonthYear(cert.expiryDate)) && (
                    <p className="text-xs text-muted-foreground">
                      {formatMonthYear(cert.issueDate) ?? "-"}
                      {cert.expiryDate && ` – expires ${formatMonthYear(cert.expiryDate)}`}
                    </p>
                  )}
                  <SourceBadge source={cert.source} isUncertain={cert.isUncertain} className="mt-1" />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {cert.isUncertain && <ConfirmEntityButton id={cert.id} type="certification" />}
                  <CertificationDialog certification={cert} />
                  <DeleteCertificationButton id={cert.id} label={cert.name} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
