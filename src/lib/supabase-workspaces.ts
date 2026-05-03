import { supabase } from '@/integrations/supabase/client';
import type { Workspace } from '@/contexts/WorkspaceContext';

/**
 * Workspace API functions with full TypeScript support.
 * These functions respect the RLS rules (Admin/Builder/Member).
 */

export const workspaceApi = {
  /**
   * Lists all workspaces accessible to the current authenticated user.
   */
  async list() {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('name');

    if (error) throw error;
    return data as Workspace[];
  },

  /**
   * Retrieves a single workspace by ID.
   */
  async get(id: string) {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Workspace;
  },

  /**
   * Creates a new workspace.
   */
  async create(name: string, description?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User must be authenticated to create a workspace');

    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        name,
        description,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Workspace;
  },

  /**
   * Updates an existing workspace.
   */
  async update(id: string, name: string, description?: string) {
    const { data, error } = await supabase
      .from('workspaces')
      .update({
        name,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Workspace;
  },

  /**
   * Deletes a workspace.
   */
  async delete(id: string) {
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Checks if the current user is a member of the workspace.
   * Utilizes the `is_workspace_member` database function.
   */
  async checkAccess(workspaceId: string) {
    const { data, error } = await (supabase as any).rpc('is_workspace_member', {
      workspace_id: workspaceId
    });

    if (error) throw error;
    return data as boolean;
  }
};
