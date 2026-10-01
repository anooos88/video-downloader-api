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
      const body = await request.json();
      const url = body.url;
      
      if (!url || !url.startsWith('http')) {
        return new Response(JSON.stringify({ error: 'الرجاء إدخال رابط صالح يبدأ بـ http أو https' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }

      const res = await fetch('https://co.wuk.sh/api/json', {
        method: 'POST',
        headers: { 
          'Accept': 'application/json', 
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: JSON.stringify({ 
          url: url,
          vQuality: 'max',
          isAudioOnly: false
        })
      });
      
      const data = await res.json();
      
      if (!res.ok || data.status === 'error') {
        return new Response(JSON.stringify({ error: data.text || 'عذراً، لم نتمكن من معالجة هذا الرابط.' }), { 
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
          resolution: i.quality || i.type || 'جودة عالية', 
          url: i.url 
        }));
      }

      return new Response(JSON.stringify({
        title: data.filename || data.title || 'فيديو سوشيال ميديا',
        formats: formats
      }), { 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: 'حدث خطأ تقني في الاتصال بالخادم الداخلي' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
      });
    }
  }
};
