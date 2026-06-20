import { corsHeaders, getRequestId, jsonResponse } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = getRequestId(req);

  return jsonResponse(
    {
      status: "ok",
      service: "lunch-link",
      timestamp: new Date().toISOString(),
      request_id: requestId,
    },
    200,
    { "x-request-id": requestId },
  );
});
