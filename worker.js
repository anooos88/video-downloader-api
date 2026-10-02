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

    // =========================
    // OPTIONS
    // =========================

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // =========================
    // POST فقط
    // =========================

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
      // قراءة الطلب
      // =========================

      let body;

      try {
        body = await request.json();
      } catch {
        return new Response(
          JSON.stringify({
            error: "Invalid JSON"
          }),
          {
            status: 400,
            headers: corsHeaders
          }
        );
      }

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
      // Cobalt request
      // =========================

      const cobaltBody = {
        url: targetUrl,

        videoQuality: quality,

        audioFormat: "best",
        audioBitrate: "128",

        filenameStyle: "pretty",

        downloadMode: "auto",

        disableMetadata: false,

        alwaysProxy: false,

        localProcessing: "disabled",

        // YouTube
        youtubeVideoCodec: "h264",
        youtubeVideoContainer: "mp4",
        youtubeHLS: false,

        // TikTok
        tiktokFullAudio: false,
        allowH265: false,

        // Twitter
        convertGif: true
      };

      // =========================
      // Headers المطلوبة رسميًا
      // =========================

      const cobaltHeaders = {
        "Accept": "application/json",
        "Content-Type": "application/json"
      };

      // API Key اختياري
      if (env.COBALT_API_KEY) {
        cobaltHeaders["Authorization"] =
          `Api-Key ${env.COBALT_API_KEY}`;
      }

      // =========================
      // إرسال الطلب إلى Cobalt
      // =========================

      const cobaltResponse = await fetch(
        COBALT_API_URL,
        {
          method: "POST",
          headers: cobaltHeaders,
          body: JSON.stringify(cobaltBody)
        }
      );

      // =========================
      // قراءة الاستجابة
      // =========================

      const responseText =
        await cobaltResponse.text();

      let cobaltData;

      try {
        cobaltData =
          JSON.parse(responseText);
      } catch {

        return new Response(
          JSON.stringify({
            error: "Cobalt returned invalid JSON",
            cobaltStatus: cobaltResponse.status,
            response: responseText
          }),
          {
            status: 502,
            headers: corsHeaders
          }
        );
      }

      // =========================
      // Cobalt error
      // =========================

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

      // =========================
      // Cobalt status = error
      // =========================

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

      // =========================
      // نجاح
      // =========================

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

      // =========================
      // Worker error
      // =========================

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
