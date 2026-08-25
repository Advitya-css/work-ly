const fs = require('fs');
let code = fs.readFileSync('src/lib/chat/knowledge.ts', 'utf8');

const target = `  {
    id: "accuracy",`;

const replacement = `  {
    id: "how-to-location-salary",
    triggers: ["where do i set my location", "set my location", "change my location", "add location", "where do i set my salary", "set salary", "change salary", "target salary", "preferences"],
    question: "Where do I set my location, salary, and preferences?",
    answer: "Your current 'Home Location' can be set in **My career > Profile**. \\n\\nTo set your **target salary, preferred locations, and work modes** (Remote/Hybrid), go to **My career > Goals** and click 'Add a career goal'. The Priority Engine uses these goals to score jobs for you."
  },
  {
    id: "how-to-delete",
    triggers: ["how do i delete", "delete a job", "remove a job", "delete application"],
    question: "How do I delete a job or application?",
    answer: "Open the specific job or application from the Opportunities or Applications board. On the detailed analysis page, look for the 'Delete' button near the top right of the page header."
  },
  {
    id: "accuracy",`;

code = code.replace(target, replacement);
fs.writeFileSync('src/lib/chat/knowledge.ts', code);
