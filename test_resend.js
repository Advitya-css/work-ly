const fs = require('fs');
require('dotenv').config();

async function test() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromDomain = process.env.RESEND_FROM_DOMAIN || "workly.app";
  
  console.log("Key:", apiKey ? "EXISTS" : "MISSING");
  console.log("Domain:", fromDomain);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${apiKey}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: \`Advitya <advitya@\${fromDomain}>\`,
      to: "test@example.com", // Dummy email
      subject: "Test",
      html: "<p>Test</p>"
    }),
  });

  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}

test();
