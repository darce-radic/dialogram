"use client";

import type { Editor } from "@tiptap/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { TableIcon } from "lucide-react";

interface TableMenuProps {
  editor: Editor;
}

export function TableMenu({ editor }: TableMenuProps) {
  const isInTable = editor.isActive("table");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-xs">
          <TableIcon className="h-3.5 w-3.5" />
          Table
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onSelect={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          Insert 3x3 Table
        </DropdownMenuItem>
        {isInTable && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().addRowBefore().run()
              }
            >
              Add Row Before
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().addRowAfter().run()
              }
            >
              Add Row After
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().addColumnBefore().run()
              }
            >
              Add Column Before
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().addColumnAfter().run()
              }
            >
              Add Column After
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().deleteRow().run()
              }
              className="text-destructive"
            >
              Delete Row
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().deleteColumn().run()
              }
              className="text-destructive"
            >
              Delete Column
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().deleteTable().run()
              }
              className="text-destructive"
            >
              Delete Table
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
