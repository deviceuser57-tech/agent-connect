import { supabase } from '@/integrations/supabase/client';

/**
 * Snapshot Engine (B3)
 * Implements Versioned Snapshots and SHA-256 Hashing
 */

// Helper: Deep Recursive Canonical Serializer
const canonicalStringify = (obj: any): string => {
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalStringify).join(',')}]`;
  }
  if (obj !== null && typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    const props = keys.map(key => `"${key}":${canonicalStringify(obj[key])}`).join(',');
    return `{${props}}`;
  }
  return JSON.stringify(obj);
};

const generateHash = async (data: any): Promise<string> => {
  const canonicalString = canonicalStringify(data);
  const msgBuffer = new TextEncoder().encode(canonicalString);
  const hashBuffer = await Uint8Array.from(
    await window.crypto.subtle.digest('SHA-256', msgBuffer)
  );
  return Array.from(hashBuffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const createSnapshot = async (sessionId: string, stateData: any) => {
  const hash = await generateHash(stateData);
  
  const { data, error } = await supabase
    .from('snapshots')
    .insert({
      session_id: sessionId,
      state_data: stateData,
      hash: hash,
      version: new Date().getTime()
    })
    .select()
    .single();

  if (error) throw new Error(`Snapshot Creation Failed: ${error.message}`);
  
  return data;
};

export const restoreFromSnapshot = async (snapshotId: string) => {
  const { data: snapshot, error: fetchError } = await supabase
    .from('snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single();

  if (fetchError || !snapshot) {
    throw new Error('Snapshot Restoration Failed: Snapshot not found');
  }

  // RBL logic would be called here via orchestrator
  return snapshot.state_data;
};
