const fs = require('fs');
const mammoth = require('mammoth');

async function test() {
  const buf = fs.readFileSync('package.json'); // not a docx, but let's see error
  try {
    await mammoth.extractRawText({ buffer: buf });
  } catch (e) {
    console.log("Mammoth error:", e.message);
  }
}
test();
