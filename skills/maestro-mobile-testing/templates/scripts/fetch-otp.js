// fetch-otp.js — read the latest OTP from a mail-capture service (Mailpit/MailHog).
// GraalJS runtime: synchronous only. Use http.get + json(); NO fetch()/async/await.
// Env vars passed via runScript `env:` are available as bare globals.

var base = typeof EMAIL_SERVICE_URL !== "undefined"
  ? EMAIL_SERVICE_URL
  : "http://localhost:8025";

var res = http.get(base + "/api/v1/messages");
if (!res.ok) {
  throw new Error("Email API request failed: " + res.status);
}

var data = json(res.body);
if (!data.messages || data.messages.length === 0) {
  throw new Error("No emails found in capture service inbox");
}

// Adjust the path to the body for your service's response shape.
// Mailpit: data.messages[0].Snippet / fetch message detail; MailHog: Content.Body.
var body = data.messages[0].Content.Body;
var match = body.match(/(\d{6})/); // first 6-digit sequence
if (!match) {
  throw new Error("No 6-digit OTP found in the latest email");
}

output.OTP_CODE = match[1];
console.log("OTP captured: " + output.OTP_CODE);
