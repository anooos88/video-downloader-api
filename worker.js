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

      // استخدام بديل مجاني ومستقر لمعالجة روابط السوشيال ميديا
      const apiRes = await fetch('https://api.alltubedownload.net/v1/info', {
        method: 'POST',
        headers: { 
          'Accept': 'application/json', 
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        body: JSON.stringify({ url: url })
      });

      // إذا لم تنجح الاستجابة، نجرب نقطة نهاية بديلة مجانية شائعة
      if (!apiRes.ok) {
        return new Response(JSON.stringify({ error: 'عذراً، الخادم الخارجي لا يستجيب حالياً لهذا الرابط.' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }

      const data = await apiRes.json();
      
      let formats = [];
      if (data.formats && Array.isArray(data.formats)) {
        formats = data.formats.map(f => ({
          resolution: f.quality || f.resolution || 'HD',
          url: f.url
        }));
      } else if (data.url) {
        formats.push({ resolution: 'تحميل مباشر', url: data.url });
      }

      if (formats.length === 0) {
        return new Response(JSON.stringify({ error: 'لم يتم العثور على روابط تحميل متاحة لهذا الفيديو.' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }

      return new Response(JSON.stringify({
        title: data.title || 'فيديو سوشيال ميديا',
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
