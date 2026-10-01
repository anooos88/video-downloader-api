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

      // استخدام خدمة بديلة وموثوقة لاستخراج تفاصيل الفيديو
      const apiRes = await fetch(`https://co.wuk.sh/api/json`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json', 
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: JSON.stringify({ url: url })
      });

      const responseText = await apiRes.text();
      
      if (!responseText.trim().startsWith('{')) {
        // محاولة الاتصال بخدمة وسيطة ثانية احتياطية إذا توقفت الأولى
        const backupRes = await fetch(`https://api.cobalt.tools/api/json`, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url })
        });
        const backupText = await backupRes.text();
        if (backupText.trim().startsWith('{')) {
          const data = JSON.parse(backupText);
          return formatResponse(data);
        }
        
        return new Response(JSON.stringify({ error: 'عذراً، الخوادم الخارجية محظورة أو متوقفة مؤقتاً لهذا الرابط.' }), { 
          status: 502, 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }

      const data = JSON.parse(responseText);
      return formatResponse(data);

    } catch (e) {
      return new Response(JSON.stringify({ error: 'خطأ في الخادم: ' + e.message }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
      });
    }
  }
};

function formatResponse(data) {
  if (data.status === 'error') {
    return new Response(JSON.stringify({ error: data.text || 'فشل جلب الفيديو.' }), { 
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
        }
