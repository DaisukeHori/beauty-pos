import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@beauty-pos/api';

type BucketName = 'store-logos' | 'staff-avatars' | 'customer-photos' | 'hairstyle-images' | 'simulation-results';

interface UploadResult {
  url: string;
  path: string;
}

interface UseImageUploadOptions {
  bucket: BucketName;
  companyId: string;
  maxSizeMB?: number;
}

export function useImageUpload({ bucket, companyId, maxSizeMB = 5 }: UseImageUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (
    file: { uri: string; type?: string; name?: string } | Blob,
    fileName?: string
  ): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      // Generate unique file path
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const extension = fileName?.split('.').pop() || 'jpg';
      const filePath = `${companyId}/${timestamp}-${randomStr}.${extension}`;

      // Convert URI to blob if needed (React Native)
      let uploadData: Blob | ArrayBuffer;
      if ('uri' in file) {
        const response = await fetch(file.uri);
        uploadData = await response.blob();

        // Check file size
        if (uploadData.size > maxSizeMB * 1024 * 1024) {
          throw new Error(`ファイルサイズが${maxSizeMB}MBを超えています`);
        }
      } else {
        uploadData = file;
        if (file.size > maxSizeMB * 1024 * 1024) {
          throw new Error(`ファイルサイズが${maxSizeMB}MBを超えています`);
        }
      }

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, uploadData, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setProgress(100);

      return {
        url: publicUrl,
        path: filePath,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'アップロードに失敗しました';
      setError(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [bucket, companyId, maxSizeMB]);

  const remove = useCallback(async (path: string): Promise<boolean> => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '削除に失敗しました';
      setError(message);
      return false;
    }
  }, [bucket]);

  return {
    upload,
    remove,
    isUploading,
    progress,
    error,
    clearError: () => setError(null),
  };
}
