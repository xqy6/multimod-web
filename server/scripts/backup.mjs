import { promises as fs, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Writable } from "node:stream";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(currentDir, "..", "data");
const backupRoot = path.resolve(currentDir, "..", "backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(backupRoot, stamp);

const {
  BACKUP_S3_ENDPOINT = "",
  BACKUP_S3_REGION = "auto",
  BACKUP_S3_BUCKET = "",
  BACKUP_S3_PREFIX = "netdisk",
  BACKUP_S3_ACCESS_KEY = "",
  BACKUP_S3_SECRET_KEY = "",
  BACKUP_WEBHOOK_URL = "",
  BACKUP_KEEP_DAYS = "7",
} = process.env;

async function createLocalBackup() {
  await fs.mkdir(backupRoot, { recursive: true });
  await fs.cp(dataDir, target, { recursive: true, force: true });
  console.log(`backup ok: ${target}`);
  return target;
}

function listFiles(dir) {
  const files = [];
  const entries = existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
    : [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function uploadToS3(backupDir) {
  if (!BACKUP_S3_BUCKET) {
    console.log("S3 upload skipped (BACKUP_S3_BUCKET not set)");
    return;
  }
  const client = new S3Client({
    endpoint: BACKUP_S3_ENDPOINT || undefined,
    region: BACKUP_S3_REGION,
    credentials: {
      accessKeyId: BACKUP_S3_ACCESS_KEY,
      secretAccessKey: BACKUP_S3_SECRET_KEY,
    },
  });
  const prefix = `${BACKUP_S3_PREFIX}/${stamp}/`;
  const files = listFiles(backupDir);
  if (files.length === 0) {
    console.log("S3 upload skipped (empty backup)");
    return;
  }
  for (const file of files) {
    const key = prefix + path.relative(backupDir, file).replaceAll("\\", "/");
    const body = await fs.readFile(file);
    await client.send(
      new PutObjectCommand({
        Bucket: BACKUP_S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: "application/octet-stream",
      }),
    );
  }
  console.log(`S3 upload ok: s3://${BACKUP_S3_BUCKET}/${prefix} (${files.length} files)`);
}

async function zipDirectory(sourceDir) {
  const { default: archiver } = await import("archiver");
  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks = [];
  archive.pipe(
    new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    }),
  );
  archive.directory(sourceDir, false);
  await archive.finalize();
  return Buffer.concat(chunks);
}

async function sendWebhook(backupDir) {
  if (!BACKUP_WEBHOOK_URL) {
    console.log("Webhook upload skipped (BACKUP_WEBHOOK_URL not set)");
    return;
  }
  const zip = await zipDirectory(backupDir);
  const form = new FormData();
  form.append(
    "backup",
    new Blob([zip], { type: "application/zip" }),
    `netdisk-${stamp}.zip`,
  );
  const response = await fetch(BACKUP_WEBHOOK_URL, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`webhook backup failed: ${response.status}`);
  }
  console.log(`Webhook upload ok: netdisk-${stamp}.zip (${zip.length} bytes)`);
}

async function cleanOldBackups() {
  const keepDays = Math.max(Number(BACKUP_KEEP_DAYS) || 7, 1);
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  const entries = existsSync(backupRoot)
    ? await fs.readdir(backupRoot, { withFileTypes: true })
    : [];
  let removed = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dirPath = path.join(backupRoot, entry.name);
    const stat = await fs.stat(dirPath);
    if (stat.mtimeMs < cutoff) {
      await fs.rm(dirPath, { recursive: true, force: true });
      removed += 1;
    }
  }
  if (removed > 0) {
    console.log(`removed ${removed} old backup(s) older than ${keepDays} day(s)`);
  }
}

const backupDir = await createLocalBackup();
await uploadToS3(backupDir);
await sendWebhook(backupDir);
await cleanOldBackups();
