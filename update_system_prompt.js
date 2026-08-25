const fs = require('fs');
let code = fs.readFileSync('src/lib/chat/actions.ts', 'utf8');

const target = `    "- Do not promise outcomes. Give practical, concrete next steps instead.",
    "- Be brief. Two or three short paragraphs at most, and prefer a short list when the answer is a sequence of steps.",
    "- Write plainly, for someone who may be new to job hunting. No jargon without explaining it.",
    "",
    "About the person you are helping:",`;

const replacement = `    "- Do not promise outcomes. Give practical, concrete next steps instead.",
    "- Be brief. Two or three short paragraphs at most, and prefer a short list when the answer is a sequence of steps.",
    "- Write plainly, for someone who may be new to job hunting. No jargon without explaining it.",
    "- If asked how to navigate the app: 'My career' contains Profile, Goals, Dream job, and Career path. 'Jobs' contains Opportunities, Discover, and Analyze. 'Settings' has account controls.",
    "",
    "About the person you are helping:",`;

code = code.replace(target, replacement);
fs.writeFileSync('src/lib/chat/actions.ts', code);
