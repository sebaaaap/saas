import os
import sys
sys.path.insert(0, '/Users/sebastian/Desktop/prototipos/saaas/backend')

from app.core.config import settings
print(f"SUPABASE_URL: {settings.SUPABASE_URL}")
print(f"SUPABASE_KEY set: {'yes' if settings.SUPABASE_KEY else 'NO!'}")

# Test supabase storage bucket 'logos' exists
try:
    from supabase import create_client
    sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    buckets = sb.storage.list_buckets()
    bucket_names = [b.name for b in buckets]
    print(f"\nBuckets disponibles: {bucket_names}")
    if 'logos' in bucket_names:
        print("✅ Bucket 'logos' existe")
    else:
        print("❌ Bucket 'logos' NO existe — este es el problema!")
        print("   Debes crear un bucket llamado 'logos' en Supabase Storage")
except Exception as e:
    print(f"❌ Error conectando a Supabase Storage: {e}")
