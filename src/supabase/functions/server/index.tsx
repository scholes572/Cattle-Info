import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger(console.log));

// Create Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Storage bucket name
const BUCKET_NAME = 'make-211b61e5-cattle-images';

// Initialize storage bucket
async function initializeBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 5242880, // 5MB
      });
      
      if (error) {
        console.error('Error creating bucket:', error);
      } else {
        console.log('Bucket created successfully');
      }
    }
  } catch (error) {
    console.error('Error initializing bucket:', error);
  }
}

// Initialize bucket on startup
initializeBucket();

// Health check
app.get('/make-server-211b61e5/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== CATTLE ROUTES ====================

// Get all cattle
app.get('/make-server-211b61e5/cattle', async (c) => {
  try {
    const cattle = await kv.getByPrefix('cattle:');
    console.log('Retrieved cattle records:', cattle.length);
    return c.json(cattle);
  } catch (error) {
    console.error('Error fetching cattle records:', error);
    return c.json({ error: 'Failed to fetch cattle records' }, 500);
  }
});

// Add new cattle
app.post('/make-server-211b61e5/cattle', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const cattle = { id, ...body };
    
    await kv.set(`cattle:${id}`, cattle);
    console.log('Added cattle record:', id);
    return c.json(cattle, 201);
  } catch (error) {
    console.error('Error adding cattle record:', error);
    return c.json({ error: 'Failed to add cattle record' }, 500);
  }
});

// Update cattle (breeding info)
app.put('/make-server-211b61e5/cattle/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    // Get existing cattle record
    const existing = await kv.get(`cattle:${id}`);
    if (!existing) {
      return c.json({ error: 'Cattle record not found' }, 404);
    }
    
    // Merge updates into existing record
    const updated = { ...existing, ...body };
    await kv.set(`cattle:${id}`, updated);
    console.log('Updated cattle record:', id);
    return c.json(updated);
  } catch (error) {
    console.error('Error updating cattle record:', error);
    return c.json({ error: 'Failed to update cattle record' }, 500);
  }
});

// Delete cattle
app.delete('/make-server-211b61e5/cattle/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // Get the cattle record to check for image
    const cattle = await kv.get(`cattle:${id}`);
    
    // Delete image from storage if exists
    if (cattle?.imageUrl) {
      const urlParts = cattle.imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0];
      
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([fileName]);
      
      if (deleteError) {
        console.error('Error deleting image from storage:', deleteError);
      }
    }
    
    await kv.del(`cattle:${id}`);
    console.log('Deleted cattle record:', id);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting cattle record:', error);
    return c.json({ error: 'Failed to delete cattle record' }, 500);
  }
});

// ==================== MILK ROUTES ====================

// Get all milk records
app.get('/make-server-211b61e5/milk', async (c) => {
  try {
    const records = await kv.getByPrefix('milk:');
    console.log('Retrieved milk records:', records.length);
    
    // Sort by date (most recent first)
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return c.json(records);
  } catch (error) {
    console.error('Error fetching milk records:', error);
    return c.json({ error: 'Failed to fetch milk records' }, 500);
  }
});

// Add new milk record
app.post('/make-server-211b61e5/milk', async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    
    // Calculate total
    const totalDaily = body.morningAmount + body.eveningAmount;
    
    const record = {
      id,
      cowName: body.cowName,
      date: body.date,
      morningAmount: body.morningAmount,
      eveningAmount: body.eveningAmount,
      totalDaily,
      addedBy: body.addedBy || '',
    };
    
    await kv.set(`milk:${id}`, record);
    console.log('Added milk record:', id);
    return c.json(record, 201);
  } catch (error) {
    console.error('Error adding milk record:', error);
    return c.json({ error: 'Failed to add milk record' }, 500);
  }
});

// Delete milk record
app.delete('/make-server-211b61e5/milk/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`milk:${id}`);
    console.log('Deleted milk record:', id);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting milk record:', error);
    return c.json({ error: 'Failed to delete milk record' }, 500);
  }
});

// ==================== IMAGE UPLOAD ====================

app.post('/make-server-211b61e5/upload-image', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    
    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });
    
    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      return c.json({ error: 'Failed to upload file' }, 500);
    }
    
    // Create signed URL (valid for 10 years)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(fileName, 315360000); // 10 years in seconds
    
    if (urlError) {
      console.error('Error creating signed URL:', urlError);
      return c.json({ error: 'Failed to create signed URL' }, 500);
    }
    
    console.log('Uploaded image:', fileName);
    return c.json({ url: urlData.signedUrl });
  } catch (error) {
    console.error('Error handling image upload:', error);
    return c.json({ error: 'Failed to upload image' }, 500);
  }
});

Deno.serve(app.fetch);
