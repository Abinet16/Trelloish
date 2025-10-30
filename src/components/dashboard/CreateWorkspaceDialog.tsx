// src/components/dashboard/CreateWorkspaceDialog.tsx
import React, { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CREATE_WORKSPACE_MUTATION, GET_MY_WORKSPACES } from '@/api/graphql';
import { PlusCircle } from 'lucide-react';

export function CreateWorkspaceDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const { toast } = useToast();

  const [createWorkspace, { loading }] = useMutation(CREATE_WORKSPACE_MUTATION, {
    refetchQueries: [{ query: GET_MY_WORKSPACES }], // This is key to updating the UI
    onCompleted: () => {
      toast({
        title: 'Workspace Created',
        description: `Successfully created "${name}".`,
      });
      setIsOpen(false);
      setName('');
    },
    onError: (error:any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    createWorkspace({ variables: { name } });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Workspace
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Workspace</DialogTitle>
          <DialogDescription>
            Give your new workspace a name. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form id="create-workspace-form" onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Q1 Product Launch"
                required
              />
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button
            type="submit"
            form="create-workspace-form"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}