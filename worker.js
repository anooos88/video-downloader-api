const COBALT_API_URL = "https://cobalt.anas.blitz.cloud/";

export default {
  async fetch(request, env) {

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Only POST is allowed"
        }),
        {
          status: 405,
          headers: corsHeaders
        }
      );
    }

    try {

      // Read incoming JSON
      const input = await request.json();

      if (!input.url) {
        return new Response(
          JSON.stringify({
            error: "Missing url"
          }),
          {
            status: 400,
            headers: corsHeaders
          }
        );
      }

      const quality =
        input.quality || "720";

      // --------------------------------
      // Minimal Cobalt request
      // --------------------------------

      const cobaltBody = {
        url: input.url,
        videoQuality: quality
      };

      // --------------------------------
      // IMPORTANT:
      // Build Headers explicitly
      // --------------------------------

      const cobaltHeaders = new Headers();

      cobaltHeaders.set(
        "Accept",
        "application/json"
      );

      cobaltHeaders.set(
        "Content-Type",
        "application/json"
      );

      cobaltHeaders.set(
        "User-Agent",
        "Mozilla/5.0"
      );

      // API key only if configured
      if (env.COBALT_API_KEY) {
        cobaltHeaders.set(
          "Authorization",
          `Api-Key ${env.COBALT_API_KEY}`
        );
      }

      // --------------------------------
      // Send request to Cobalt
      // --------------------------------

      const cobaltResponse = await fetch(
        COBALT_API_URL,
        {
          method: "POST",
          headers: cobaltHeaders,
          body: JSON.stringify(cobaltBody)
        }
      );

      // --------------------------------
      // Read Cobalt response
      // --------------------------------

      const raw =
        await cobaltResponse.text();

      let cobaltData;

      try {
        cobaltData = JSON.parse(raw);
      } catch {

        return new Response(
          JSON.stringify({
            error: "Cobalt returned non-JSON",
            httpStatus: cobaltResponse.status,
            raw: raw
          }),
          {
            status: 502,
            headers: corsHeaders
          }
        );
      }

      // --------------------------------
      // Cobalt HTTP error
      // --------------------------------

      if (!cobaltResponse.ok) {

        return new Response(
          JSON.stringify({
            error: "Cobalt API error",
            cobaltStatus: cobaltResponse.status,
            cobaltResponse: cobaltData
          }),
          {
            status: 502,
            headers: corsHeaders
          }
        );
      }

      // --------------------------------
      // Cobalt processing error
      // --------------------------------

      if (cobaltData.status === "error") {

        return new Response(
          JSON.stringify({
            error: "Cobalt processing error",
            cobalt: cobaltData
          }),
          {
            status: 502,
            headers: corsHeaders
          }
        );
      }

      // --------------------------------
      // SUCCESS
      // --------------------------------

      return new Response(
        JSON.stringify({
          success: true,
          cobalt: cobaltData
        }),
        {
          status: 200,
          headers: corsHeaders
        }
      );

    } catch (error) {

      return new Response(
        JSON.stringify({
          error: "Worker exception",
          message: error.message
        }),
        {
          status: 500,
          headers: corsHeaders
        }
      );
    }
  }
};
