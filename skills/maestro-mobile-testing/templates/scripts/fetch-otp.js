// fetch-otp.js: read the newest 6-digit code sent to EMAIL from Mailpit.
// GraalJS is synchronous: use http.* + json(), never fetch()/async. runScript `env:` values are bare globals.
// Sets output.OTP_CODE, or "" if the mail hasn't arrived. It doesn't throw for that case because a
// script error fails the flow even inside `retry:` or with `optional: true`. See templates/auth-otp.yaml for polling.

const base = typeof EMAIL_SERVICE_URL !== "undefined" ? EMAIL_SERVICE_URL : "http://localhost:8025";

function getJson(url) {
  const res = http.get(url);
  if (!res.ok) {
    throw new Error("Mail API " + url + " returned " + res.status);
  }
  return json(res.body);
}

output.OTP_CODE = "";
const messages = getJson(base + "/api/v1/search?query=" + encodeURIComponent("to:" + EMAIL)).messages;
if (messages.length > 0) {
  // Mailpit fills Text from the HTML part when a mail has no plain-text part.
  const text = getJson(base + "/api/v1/message/" + messages[0].ID).Text;
  // Prefer the number after a "code" label so an order or reference number can't win.
  const match = text.match(/(?:code|otp|passcode)\D{0,20}(\d{6})\b/i) || text.match(/\b(\d{6})\b/);
  if (!match) {
    throw new Error("No 6-digit code in the latest mail to " + EMAIL);
  }
  output.OTP_CODE = match[1];
}
