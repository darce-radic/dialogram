#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const ALGORITHM = "dialogram-project-id-v1";

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

function normalizeRemote(rawRemote) {
  if (!rawRemote) return "";

  let remote = rawRemote.trim();
  if (!remote) return "";

  // Normalize SSH short form: git@host:owner/repo(.git)
  const sshMatch = remote.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    remote = `https://${sshMatch[1]}/${sshMatch[2]}`;
  }

  remote = remote.replace(/\.git$/i, "");
  remote = remote.replace(/\/+$/g, "");
  return remote.toLowerCase();
}

function getPackageName() {
  try {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    return typeof pkg.name === "string" ? pkg.name.trim() : "";
  } catch {
    return "";
  }
}

function buildIdentityInput() {
  const cwd = process.cwd();
  const repoName = path.basename(cwd).toLowerCase();
  const gitRoot = safeExec("git rev-parse --show-toplevel");
  const gitRemote = normalizeRemote(safeExec("git remote get-url origin"));
  const packageName = getPackageName().toLowerCase();

  // Stable preference order:
  // 1) Git remote (best cross-machine identity)
  // 2) package.json name
  // 3) git root path
  // 4) cwd
  const sourceKey =
    gitRemote ||
    (packageName ? `npm:${packageName}` : "") ||
    gitRoot.toLowerCase() ||
    cwd.toLowerCase();

  return {
    algorithm: ALGORITHM,
    source_key: sourceKey,
    repo_name: repoName,
    package_name: packageName,
  };
}

function computeProjectId(identity) {
  const canonical = JSON.stringify(identity);
  const digest = createHash("sha256").update(canonical).digest("hex");
  return {
    project_id: `dlgprj_${digest.slice(0, 16)}`,
    fingerprint_sha256: digest,
    canonical_input: identity,
  };
}

const shortMode = process.argv.includes("--short");
const identity = buildIdentityInput();
const result = computeProjectId(identity);

if (shortMode) {
  process.stdout.write(`${result.project_id}\n`);
} else {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

