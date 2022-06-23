import Setup from "../models/setup.mjs";

export function startPeriodicBackupService(){
  periodicBackup()
  return setInterval(periodicBackup, 10_000_000) // Run every few hours
}

async function periodicBackup(){
  console.log("Backup stub")
}