import { getSupabase } from '@/data/supabaseClient';

export interface BackupMetadata {
  id: string;
  name: string;
  createdAt: string;
  size: number;
  notes?: string;
}

export interface BackupResult {
  ok: boolean;
  message?: string;
  error?: string;
  backupId?: string;
  data?: unknown;
}

/**
 * Creates a backup of the user's workspace data to Supabase cloud storage
 */
export async function createCloudBackup(name: string, data: unknown): Promise<BackupResult> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return { ok: false, error: 'Supabase not connected' };
    }

    const dataStr = JSON.stringify(data);
    const timestamp = new Date().toISOString();
    const backupName = `${timestamp}_${name.replace(/[^a-zA-Z0-9-_]/g, '_')}`;

    // Create backup record
    const { data: backup, error: insertError } = await supabase
      .from('workspace_backups')
      .insert({
        name: backupName,
        original_name: name,
        content: dataStr,
        size_bytes: new Blob([dataStr]).size,
        created_at: timestamp,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return {
      ok: true,
      message: `Backup "${name}" created successfully`,
      backupId: backup?.id,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, error };
  }
}

/**
 * Lists all backups for the current user
 */
export async function listCloudBackups(): Promise<BackupMetadata[] | null> {
  try {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('workspace_backups')
      .select('id, name, original_name, created_at, size_bytes')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (
      data?.map((backup) => ({
        id: backup.id,
        name: backup.original_name || backup.name,
        createdAt: backup.created_at,
        size: backup.size_bytes || 0,
      })) ?? []
    );
  } catch (e) {
    console.error('Failed to list backups:', e);
    return null;
  }
}

/**
 * Restores data from a cloud backup
 */
export async function restoreCloudBackup(backupId: string): Promise<BackupResult> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return { ok: false, error: 'Supabase not connected' };
    }

    const { data: backup, error: fetchError } = await supabase
      .from('workspace_backups')
      .select('content, name')
      .eq('id', backupId)
      .single();

    if (fetchError || !backup) {
      throw fetchError || new Error('Backup not found');
    }

    const restoredData = JSON.parse(backup.content);

    return {
      ok: true,
      message: `Restored from backup "${backup.name}"`,
      data: restoredData,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, error };
  }
}

/**
 * Deletes a backup from cloud storage
 */
export async function deleteCloudBackup(backupId: string): Promise<BackupResult> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return { ok: false, error: 'Supabase not connected' };
    }

    const { error } = await supabase
      .from('workspace_backups')
      .delete()
      .eq('id', backupId);

    if (error) throw error;

    return { ok: true, message: 'Backup deleted successfully' };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, error };
  }
}

/**
 * Downloads a backup as JSON file for local storage
 */
export function downloadBackupAsFile(data: unknown, filename: string): void {
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
