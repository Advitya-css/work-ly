const mammoth = require("mammoth");
console.log(typeof mammoth.extractRawText);

import("mammoth").then(m => {
  console.log("m.extractRawText:", typeof m.extractRawText);
  console.log("m.default.extractRawText:", m.default ? typeof m.default.extractRawText : undefined);
});
