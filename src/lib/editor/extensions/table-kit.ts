import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";

export const configuredTable = Table.configure({
  resizable: true,
  HTMLAttributes: {
    class: "border-collapse table-auto w-full",
  },
});

export const tableExtensions = [
  configuredTable,
  TableRow,
  TableCell,
  TableHeader,
];
