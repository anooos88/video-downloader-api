const COBALT_API_URL = "https://cobalt.anas.blitz.cloud/";

export default {
  async fetch(request, env) {

    // =========================
    // CORS
    // =========================

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };

    // OPTIONS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // نسمح فقط بـ POST
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Only POST requests are allowed"
        }),
        {
          status: 405,
          headers: corsHeaders
        }
      );
    }

    try {

      // =========================
      // قراءة البيانات
      // =========================

      const body = await request.json();

      const targetUrl = body.url;
      const quality = body.quality || "720";

      if (!targetUrl) {
        return new Response(
          JSON.stringify({
            error: "Missing video URL"
          }),
          {
            status: 400,
            headers: corsHeaders
          }
        );
      }

      // =========================
      // طلب Cobalt
      // =========================

      const cobaltBody = {
        url: targetUrl,

        videoQuality: quality,

        audioFormat: "best",
        audioBitrate: "128",

        filenameStyle: "pretty",

        downloadMode: "auto",

        youtubeVideoCodec: "h264",

        alwaysProxy: false,

        disableMetadata: false,

        tiktokFullAudio: false,

        tiktokH265: false,

        twitterGif: true,

        youtubeHLS: false
      };

      const headers = {
        "Content-Type": "application/json"
      };

      // إذا أضفت API Key مستقبلًا
      if (env.COBALT_API_KEY) {
        headers["Authorization"] =
          `Api-Key ${env.COBALT_API_KEY}`;
      }

      // =========================
      // إرسال الطلب إلى Cobalt
      // =========================

      const cobaltResponse = await fetch(
        COBALT_API_URL,
        {
          method: "POST",
          headers,
          body: JSON.stringify(cobaltBody)
        }
      );

      // =========================
      // قراءة استجابة Cobalt
      // =========================

      const text = await cobaltResponse.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch {
        return new Response(
          JSON.stringify({
            error: "Cobalt returned invalid JSON",
            status: cobaltResponse.status,
            response: text
          }),
          {
            status: 502,
            headers: corsHeaders
          }
        );
      }

      // =========================
      // أخطاء Cobalt
      // =========================

      if (!cobaltResponse.ok) {

        return new Response(
          JSON.stringify({
            error: "Cobalt API error",
            cobaltStatus: cobaltResponse.status,
            cobaltResponse: data
          }),
          {
            status: 502,
            headers: corsHeaders
          }
        );
      }

      if (data.status === "error") {

        return new Response(
          JSON.stringify({
            error: "Cobalt processing error",
            cobalt: data
          }),
          {
            status: 502,
            headers: corsHeaders
          }
        );
      }

      // =========================
      // نجاح
      // =========================

      return new Response(
        JSON.stringify({
          success: true,
          cobalt: data
        }),
        {
          status: 200,
          headers: corsHeaders
        }
      );

    } catch (error) {

      return new Response(
        JSON.stringify({
          error: "Worker error",
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
