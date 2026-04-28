import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspace, Workspace } from '@/contexts/WorkspaceContext';
import { useToast } from '@/hooks/use-toast';

interface WorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace?: Workspace | null;
}

export const WorkspaceDialog: React.FC<WorkspaceDialogProps> = ({
  open,
  onOpenChange,
  workspace,
}) => {
  const { createWorkspace, updateWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: workspace?.name || '',
    description: workspace?.description || '',
  });

  React.useEffect(() => {
    if (workspace) {
      setFormData({
        name: workspace.name,
        description: workspace.description || '',
      });
    } else {
      setFormData({ name: '', description: '' });
    }
  }, [workspace, open]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Workspace name is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    let result;
    if (workspace) {
      result = await updateWorkspace(workspace.id, formData.name, formData.description);
    } else {
      result = await createWorkspace(formData.name, formData.description);
    }
    setLoading(false);

    if (result) {
      toast({
        title: 'Success',
        description: `Workspace ${workspace ? 'updated' : 'created'} successfully`,
      });
      if (!workspace) setFormData({ name: '', description: '' });
      onOpenChange(false);
    } else {
      toast({
        title: 'Error',
        description: `Failed to ${workspace ? 'update' : 'create'} workspace`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{workspace ? 'Edit' : 'Create'} Workspace</DialogTitle>
          <DialogDescription>
            {workspace 
              ? 'Update your workspace details.' 
              : 'Create a new workspace to organize your agents and workflows.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="My Workspace"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe your workspace..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (workspace ? 'Updating...' : 'Creating...') : (workspace ? 'Update' : 'Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
