const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/applications/[id]/page.tsx', 'utf8');
const target = `            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Contacts`;
const replacement = `            </CardContent>
          </Card>

          {application.reachedInterviewAt && (
            <InterviewPrepCard applicationId={application.id} />
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                Contacts`;
code = code.replace(target, replacement);
fs.writeFileSync('src/app/(app)/applications/[id]/page.tsx', code);
