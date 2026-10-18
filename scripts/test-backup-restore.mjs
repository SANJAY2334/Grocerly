import mongoose from "mongoose";
import fs from "fs";
import path from "path";

const SRC_URI = "mongodb://127.0.0.1:27017/grocerly";
const BACKUP_DIR = path.join(process.cwd(), "tmp_backup_test");
const RESTORE_TARGET_DB = "grocerly_test_restore_verify";

async function runBackupAndRestoreTest() {
  console.log("--- STARTING DATABASE BACKUP AND RESTORE VERIFICATION TEST ---");

  // Step 1: Connect to source DB
  const srcConn = await mongoose.createConnection(SRC_URI).asPromise();
  console.log("1. Connected to source database: grocerly");

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Step 2: Extract snapshot of all collections
  const collections = await srcConn.db.listCollections().toArray();
  const manifest = {};
  console.log(`2. Discovered ${collections.length} collections in source.`);

  for (const col of collections) {
    const colName = col.name;
    if (colName.startsWith("system.")) continue;

    const docs = await srcConn.db.collection(colName).find({}).toArray();
    const dumpPath = path.join(BACKUP_DIR, `${colName}.json`);
    fs.writeFileSync(dumpPath, JSON.stringify(docs, null, 2), "utf8");
    manifest[colName] = docs.length;
    console.log(`   - Exported ${colName}: ${docs.length} documents -> ${colName}.json`);
  }

  await srcConn.close();

  // Step 3: Connect to isolated verification test DB
  const targetUri = `mongodb://127.0.0.1:27017/${RESTORE_TARGET_DB}`;
  const targetConn = await mongoose.createConnection(targetUri).asPromise();
  console.log(`3. Connected to target restore verification database: ${RESTORE_TARGET_DB}`);

  // Drop target test db to ensure sterile restore test
  await targetConn.db.dropDatabase();
  console.log("   - Cleaned target test database before restore.");

  // Step 4: Restore from exported snapshots
  let totalRestored = 0;
  for (const [colName, expectedCount] of Object.entries(manifest)) {
    const dumpPath = path.join(BACKUP_DIR, `${colName}.json`);
    const data = JSON.parse(fs.readFileSync(dumpPath, "utf8"));
    if (data.length > 0) {
      await targetConn.db.collection(colName).insertMany(data);
    }
    const restoredCount = await targetConn.db.collection(colName).countDocuments();
    console.log(`   - Restored ${colName}: expected ${expectedCount}, actual ${restoredCount}`);
    if (restoredCount !== expectedCount) {
      throw new Error(`Data mismatch in restored collection ${colName}: expected ${expectedCount}, got ${restoredCount}`);
    }
    totalRestored += restoredCount;
  }

  console.log(`4. Successfully restored all collections. Total verified documents: ${totalRestored}`);

  // Step 5: Clean up target test DB and backup directory
  await targetConn.db.dropDatabase();
  await targetConn.close();
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
  console.log("5. Cleaned up verification database and temporary backup directory.");
  console.log("--- BACKUP AND RESTORE VERIFICATION TEST COMPLETED SUCCESSFULLY! ---");
}

runBackupAndRestoreTest().catch((err) => {
  console.error("Backup & Restore verification failed:", err);
  process.exit(1);
});
