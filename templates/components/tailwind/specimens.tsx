import * as React from 'react';
import { Button } from './button';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogClose } from './dialog';
import { TextField } from './field';

/**
 * Every library component appears here with its variants and states. The /design-system page renders
 * this list; ui-verify screenshots it in both themes. design-lint warns when a component is missing.
 * Keep this file server-safe (no 'use client', no hooks): demos that need state go in their own client file.
 */
export type Specimen = { name: string; description?: string; render: () => React.ReactNode };

export const specimens: Specimen[] = [
  {
    name: 'Button',
    description: 'Variants, sizes and states.',
    render: () => (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Save changes</Button>
          <Button variant="secondary">Duplicate</Button>
          <Button variant="outline">Export</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Delete project</Button>
          <Button variant="link">View history</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button size="icon" variant="outline" aria-label="Add item">
            <svg viewBox="0 0 16 16" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          </Button>
        </div>
      </div>
    ),
  },
  {
    name: 'Field',
    description: 'TextField = Field + Input with label, description and error.',
    render: () => (
      <div className="grid max-w-md gap-4">
        <TextField name="email" label="Work email" placeholder="ada@example.com" description="We'll send the invite here." />
        <TextField name="slug" label="Workspace URL" defaultValue="acme corp" error="Use lowercase letters, numbers and dashes." />
        <TextField name="disabled" label="Plan" defaultValue="Team" disabled />
      </div>
    ),
  },
  {
    name: 'Dialog',
    description: 'Open it to check backdrop, focus trap and motion.',
    render: () => (
      <Dialog>
        <DialogTrigger render={<Button variant="outline" />}>Rename project</DialogTrigger>
        <DialogContent>
          <DialogTitle>Rename project</DialogTitle>
          <DialogDescription>Links to the old name will redirect for 30 days.</DialogDescription>
          <div className="mt-4">
            <TextField name="project" label="Project name" defaultValue="Northwind" />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <DialogClose render={<Button />}>Rename</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ),
  },
];
