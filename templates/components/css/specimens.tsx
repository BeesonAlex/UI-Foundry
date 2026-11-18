import * as React from 'react';
import { Button } from './button';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogClose } from './dialog';

/**
 * Every library component appears here with its variants and states. The /design-system page renders
 * this list; ui-verify screenshots it in both themes. design-lint warns when a component is missing.
 * Keep this file server-safe (no 'use client', no hooks): demos that need state go in their own client file.
 */
export type Specimen = { name: string; description?: string; render: () => React.ReactNode };

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3)' };

export const specimens: Specimen[] = [
  {
    name: 'Button',
    description: 'Variants, sizes and states.',
    render: () => (
      <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div style={row}>
          <Button>Save changes</Button>
          <Button variant="secondary">Duplicate</Button>
          <Button variant="outline">Export</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Delete project</Button>
          <Button variant="link">View history</Button>
        </div>
        <div style={row}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
        </div>
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
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <DialogClose render={<Button />}>Rename</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ),
  },
];
