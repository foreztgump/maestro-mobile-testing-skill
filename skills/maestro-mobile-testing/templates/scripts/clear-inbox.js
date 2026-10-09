// clear-inbox.js: delete Mailpit mail addressed to EMAIL so fetch-otp.js can't read a code from an earlier run.
// Run it before the step that sends the code. Same env as fetch-otp.js.

const base = typeof EMAIL_SERVICE_URL !== "undefined" ? EMAIL_SERVICE_URL : "http://localhost:8025";

const res = http.delete(base + "/api/v1/search?query=" + encodeURIComponent("to:" + EMAIL));
if (!res.ok) {
  throw new Error("Mail API delete returned " + res.status);
}
