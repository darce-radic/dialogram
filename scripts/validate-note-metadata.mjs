#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

function safeExec(command) {
  try {
    return execSync(command, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function getExpectedProjectId() {
  const output = safeExec("node scripts/compute-project-id.mjs --short");
  if (!output) {
    throw new Error("Unable to compute project id");
  }
  return output;
}

function listMarkdownFiles() {
  const rgOutput = safeExec("rg --files -g *.md");
  if (rgOutput) {
    return rgOutput.split(/\r?\n/).filter(Boolean);
  }

  const gitOutput = safeExec("git ls-files *.md **/*.md");
  if (!gitOutput) return [];
  return gitOutput.split(/\r?\n/).filter(Boolean);
}

function isNoteFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  const base = path.posix.basename(normalized);

  if (normalized === "PROJECT_STATE.md") return true;
  if (normalized.startsWith("notes/")) return true;
  if (base === "AGENT_NOTES.md") return true;
  if (/_NOTES\.md$/i.test(base)) return true;
  return false;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;

  const body = match[1];
  const projectIdMatch = body.match(/^project_id:\s*(\S+)\s*$/m);
  const projectId = projectIdMatch ? projectIdMatch[1] : null;

  return { projectId };
}

function main() {
  const expectedProjectId = getExpectedProjectId();
  const markdownFiles = listMarkdownFiles();
  const noteFiles = markdownFiles.filter(isNoteFile);

  const failures = [];

  for (const file of noteFiles) {
    const content = readFileSync(file, "utf8");
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter) {
      failures.push(`${file}: missing YAML frontmatter header`);
      continue;
    }

    if (!frontmatter.projectId) {
      failures.push(`${file}: missing required field project_id`);
      continue;
    }

    if (frontmatter.projectId !== expectedProjectId) {
      failures.push(
        `${file}: project_id mismatch (${frontmatter.projectId} != ${expectedProjectId})`
      );
    }
  }

  if (failures.length > 0) {
    process.stderr.write("Note metadata validation failed:\n");
    for (const failure of failures) {
      process.stderr.write(`- ${failure}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(
    `Note metadata validation passed (${noteFiles.length} file(s)).\n`
  );
}

main();
