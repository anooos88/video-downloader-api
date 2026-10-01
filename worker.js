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
      
      if (!url) {
        return new Response(JSON.stringify({ error: 'الرجاء إدخال الرابط' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }

      const res = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: { 
          'Accept': 'application/json', 
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        body: JSON.stringify({ url: url })
      });
      
      const data = await res.json();
      
      // إذا رجعت الـ API خطأ، نقوم بإظهاره للمستخدم
      if (!res.ok || data.status === 'error') {
        return new Response(JSON.stringify({ error: data.text || 'عذراً، لم نتمكن من جلب الفيديو. تأكد من صحة الرابط.' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
        });
      }

      return new Response(JSON.stringify({
        title: data.filename || data.title || 'فيديو تحميل',
        formats: data.url ? [{ resolution: 'تحميل مباشر', url: data.url }] : (data.picker || []).map(i => ({ resolution: i.quality || 'HD', url: i.url }))
      }), { 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: 'حدث خطأ في الاتصال بالخادم' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
      });
    }
  }
};
