export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        headers: { 
          'Access-Control-Allow-Origin': '*', 
          'Access-Control-Allow-Methods': 'POST, OPTIONS', 
          'Access-Control-Allow-Headers': 'Content-Type' 
        } 
      });
    }

    try {
      let body;
      try {
        body = await request.json();
      } catch (err) {
        return new Response(JSON.stringify({ error: 'البيانات المرسلة غير صالحة' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }

      const url = body && body.url;
      if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        return new Response(JSON.stringify({ error: 'الرجاء إدخال رابط صالح يبدأ بـ https://' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }

      // تجربة الاتصال بمثيل عام نشط لـ Cobalt
      const cobaltRes = await fetch('https://cobalt.k8s.cappuchino.xyz/api/json', {
        method: 'POST',
        headers: { 
          'Accept': 'application/json', 
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: JSON.stringify({ 
          url: url,
          vQuality: 'max'
        })
      });

      const responseText = await cobaltRes.text();
      
      // التأكد من أن الاستجابة تبدأ بـ { أو [ وليست صفحة HTML (تبدأ بـ <)
      if (!responseText.trim().startsWith('{') && !responseText.trim().startsWith('[')) {
        return new Response(JSON.stringify({ error: 'الخادم الخارجي للتحميل غير متاح حالياً أو يرفض الطلب.' }), { 
          status: 502, 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }

      const data = JSON.parse(responseText);

      if (!cobaltRes.ok || data.status === 'error') {
        return new Response(JSON.stringify({ error: data.text || 'فشل معالجة الرابط، تأكد أنه فيديو عام ومدعوم.' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }

      let formats = [];
      if (data.url) {
        formats.push({ resolution: 'تحميل مباشر (HD)', url: data.url });
      }
      if (data.picker && Array.isArray(data.picker)) {
        formats = data.picker.map(i => ({ 
          resolution: i.quality || 'جودة عالية', 
          url: i.url 
        }));
      }

      return new Response(JSON.stringify({
        title: data.filename || data.title || 'فيديو جاهز للتحميل',
        formats: formats
      }), { 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: 'خطأ في الخادم: ' + e.message }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
      });
    }
  }
};
