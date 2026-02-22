"use client";

import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { useMemo, useState } from "react";
import type { LiveTableData } from "@/shared/editor-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

export function LiveTableView({ node }: ReactNodeViewProps) {
  const tableData: LiveTableData = useMemo(() => {
    try {
      return JSON.parse(
        (node.attrs.data as string) || '{"columns":[],"rows":[]}'
      );
    } catch {
      return { columns: [], rows: [] };
    }
  }, [node.attrs.data]);

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sortedRows = useMemo(() => {
    if (!sortKey) return tableData.rows;
    return [...tableData.rows].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [tableData.rows, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <NodeViewWrapper className="my-4">
      <div contentEditable={false} className="rounded-lg border bg-card p-4">
        {node.attrs.title && (
          <h3 className="mb-2 text-sm font-semibold">
            {node.attrs.title as string}
          </h3>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              {tableData.columns.map((col) => (
                <TableHead key={col.key}>
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => toggleSort(col.key)}
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row, idx) => (
              <TableRow key={idx}>
                {tableData.columns.map((col) => (
                  <TableCell key={col.key}>
                    {String(row[col.key] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </NodeViewWrapper>
  );
}
