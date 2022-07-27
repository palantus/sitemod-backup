import Setup from "../models/setup.mjs";
import LogEntry from "../../../models/logentry.mjs";
import Backup from "../models/backup.mjs";
import Job from "../models/job.mjs";

function log(text){
  return new LogEntry(text, "backup");
}

export function startPeriodicBackupService(){
  periodicBackup()
  periodicCleanup()
  return setInterval(periodicBackup, 10_000_000) // Run every few hours
}

async function periodicBackup(){
  console.log("Backup stub")
}

async function periodicCleanup(){
  for(let backup of Backup.all()){
    let job = Job.from(backup.related.job);
    if(!job){
      log(`Backup ${backup._id} is missing a job. Skipping cleanup.`)
      continue;
    }
    let retentionDays = job.retentionDays || 7;
    let obsDate = new Date()
    obsDate.setDate(obsDate.getDate() - retentionDays)
    if(new Date(backup.timestamp).getTime() >= obsDate.getTime())
      continue;

    log(`Deleting backup from ${backup.timestamp} (${job.title}) due to retension setup`)
    backup.delete()
  }
}