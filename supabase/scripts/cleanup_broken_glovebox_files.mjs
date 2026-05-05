#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const APPLY = process.argv.includes("--apply");
const DELETE_ALL = process.argv.includes("--delete-all");
const BUCKET = "glovebox-files";
const ENV_PATH = path.resolve(process.cwd(), ".env.local");

function readEnvFile(filePath) {
  const env = {};
  const contents = fs.readFileSync(filePath, "utf8");

  for (const line of contents.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex);
    const rawValue = trimmed.slice(separatorIndex + 1);
    env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }

  return env;
}

function failureReason(error, expectedBytes, actualBytes) {
  if (error) {
    const message = error.message || JSON.stringify(error);
    return message && message !== "{}" ? message : "Storage download failed";
  }
  return `Byte count mismatch. Expected ${expectedBytes}, got ${actualBytes}.`;
}

async function downloadStatus(supabase, file) {
  const { data, error } = await supabase.storage.from(BUCKET).download(file.storage_path);
  if (error) {
    return { ok: false, actualBytes: 0, reason: failureReason(error, file.size_bytes, 0) };
  }

  const actualBytes = Buffer.from(await data.arrayBuffer()).length;
  return {
    ok: actualBytes === Number(file.size_bytes),
    actualBytes,
    reason:
      actualBytes === Number(file.size_bytes)
        ? null
        : failureReason(null, file.size_bytes, actualBytes),
  };
}

async function softDeleteFile(supabase, file, reason) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("glovebox_files")
    .update({
      is_deleted: true,
      deleted_at: now,
      updated_at: now,
      extraction_status: "failed",
      extraction_error: `Original file unavailable in Storage: ${reason}`.slice(0, 500),
    })
    .eq("id", file.id);

  if (error) throw error;
}

async function removeStorageArtefacts(supabase, file) {
  const paths = [file.storage_path, file.extracted_text_path, file.preview_image_path].filter(Boolean);
  if (paths.length === 0) return null;

  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  return error ? error.message || JSON.stringify(error) : null;
}

async function main() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(`Missing ${ENV_PATH}`);
  }

  const env = readEnvFile(ENV_PATH);
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: files, error } = await supabase
    .from("glovebox_files")
    .select(
      "id,user_id,title,storage_path,extracted_text_path,preview_image_path,original_filename,mime_type,size_bytes,source,is_deleted"
    )
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const deleteCandidates = [];
  const kept = [];
  const actions = [];

  for (const file of files ?? []) {
    const status = await downloadStatus(supabase, file);
    const record = {
      id: file.id,
      user_id: file.user_id,
      title: file.title,
      filename: file.original_filename,
      source: file.source,
      storage_path: file.storage_path,
      expected_bytes: Number(file.size_bytes),
      actual_bytes: status.actualBytes,
      reason: status.reason,
    };

    if (status.ok && !DELETE_ALL) {
      kept.push(record);
      continue;
    }

    deleteCandidates.push({
      ...record,
      reason: DELETE_ALL ? "Beta Glovebox reset requested" : record.reason,
    });

    if (APPLY) {
      await softDeleteFile(
        supabase,
        file,
        DELETE_ALL ? "Beta Glovebox reset requested" : status.reason
      );
      const storageRemoveError = await removeStorageArtefacts(supabase, file);
      actions.push({
        id: file.id,
        title: file.title,
        soft_deleted: true,
        storage_remove_error: storageRemoveError,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? "apply" : "dry-run",
        delete_all: DELETE_ALL,
        checked: files?.length ?? 0,
        kept_count: kept.length,
        delete_count: deleteCandidates.length,
        delete_candidates: deleteCandidates,
        actions,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
