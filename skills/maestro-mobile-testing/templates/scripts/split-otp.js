// split-otp.js — split a 6-digit OTP into per-digit outputs for segmented inputs.
// Pass OTP_CODE via runScript `env:`. GraalJS: synchronous, no imports.

var code = String(OTP_CODE).trim();
if (code.length < 6) {
  throw new Error("OTP_CODE shorter than 6 digits: '" + code + "'");
}

var digits = code.split("");
output.OTP_0 = digits[0];
output.OTP_1 = digits[1];
output.OTP_2 = digits[2];
output.OTP_3 = digits[3];
output.OTP_4 = digits[4];
output.OTP_5 = digits[5];
