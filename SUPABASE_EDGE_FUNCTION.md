# Supabase Edge Function - Copy This Code

**In Supabase Dashboard → Edge Functions → New Edge Function**

Name: `make-server`

Copy and paste this ENTIRE code:

```typescript
import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const TABLE_NAME = 'kv_store_' + (Deno.env.get('SUPABASE_URL') ?? '').replace('https://', '').split('.')[0];

// KV Store functions inlined
async function get(key: string) {
  const { data } = await supabase.from(TABLE_NAME).select('value').eq('key', key).maybeSingle();
  return data?.value;
}

async function set(key: string, value: any) {
  await supabase.from(TABLE_NAME).upsert({ key, value });
}

async function del(key: string) {
  await supabase.from(TABLE_NAME).delete().eq('key', key);
}

async function getByPrefix(prefix: string) {
  const { data } = await supabase.from(TABLE_NAME).select('key,value').like('key', prefix + '%');
  return data?.map((d: any) => d.value) ?? [];
}

const BUCKET_NAME = 'cattle-images';

async function initializeBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b: any) => b.name === BUCKET_NAME);
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET_NAME, { public: false, fileSizeLimit: 5242880 });
    }
  } catch (e) {
    console.error('Bucket init error:', e);
  }
}
initializeBucket();

// Health
app.get('/health', (c) => c.json({ status: 'ok' }));

// Cattle
app.get('/cattle', async (c) => {
  const cattle = await getByPrefix('cattle:');
  return c.json(cattle);
});

app.post('/cattle', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const cattle = { id, ...body };
  await set(`cattle:${id}`, cattle);
  return c.json(cattle, 201);
});

app.put('/cattle/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const existing = await get(`cattle:${id}`);
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const updated = { ...existing, ...body };
  await set(`cattle:${id}`, updated);
  return c.json(updated);
});

app.delete('/cattle/:id', async (c) => {
  const id = c.req.param('id');
  await del(`cattle:${id}`);
  return c.json({ success: true });
});

// Milk
app.get('/milk', async (c) => {
  const records = await getByPrefix('milk:');
  records.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return c.json(records);
});

app.post('/milk', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  const total = body.morningAmount + body.eveningAmount;
  const record = { id, ...body, totalDaily: total };
  await set(`milk:${id}`, record);
  return c.json(record, 201);
});

app.delete('/milk/:id', async (c) => {
  const id = c.req.param('id');
  await del(`milk:${id}`);
  return c.json({ success: true });
});

// Activities
app.get('/activities', async (c) => {
  const activities = await getByPrefix('activity:');
  activities.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return c.json(activities);
});

app.post('/activities', async (c) => {
  const body = await c.req.json();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const activity = { id, timestamp: new Date().toISOString(), ...body };
  await set(`activity:${id}`, activity);
  return c.json(activity, 201);
});

// Image Upload
app.post('/upload-image', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  if (!file) return c.json({ error: 'No file' }, 400);
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const buffer = new Uint8Array(await file.arrayBuffer());
  
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, buffer, { contentType: file.type, upsert: false });
  
  if (uploadError) return c.json({ error: 'Upload failed' }, 500);
  
  const { data: urlData } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(fileName, 315360000);
  
  return c.json({ url: urlData.signedUrl });
});

Deno.serve(app.fetch);
```

## After Deploying:

1. Go to Supabase **Database → SQL Editor**
2. Run this SQL to create the table:
```sql
CREATE TABLE IF NOT EXISTS kv_store (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL
);
```

3. Deploy the frontend to Vercel
