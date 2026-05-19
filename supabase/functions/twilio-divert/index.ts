// Public Twilio voice webhook: returns TwiML to forward the call.
// Configured on Twilio number +447476942068 → dials +447474997046.
const FORWARD_TO = "+447474997046";

Deno.serve(() => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial answerOnBridge="true" callerId="+447476942068" timeout="25">${FORWARD_TO}</Dial>
</Response>`;
  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
});
