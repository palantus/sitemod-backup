import Setup from "../models/setup.mjs";
import LogEntry from "../../../models/logentry.mjs";
import Backup from "../models/backup.mjs";
import Job from "../models/job.mjs";
import { getTimestamp } from "../../../tools/date.mjs";

function log(text){
  return new LogEntry(text, "backup");
}

export function startPeriodicBackupService(){
  setInterval(periodicCleanup, 10_500_000) // Run every few hours
  return setInterval(periodicBackup, 2_000_000) // Run 1-2 times per hour
}


async function periodicBackup(){
  let nowTimestamp = getTimestamp()
  for(let job of Job.all()){
    if(!job.enabled) continue;
    if(!job.nextRun) continue;
    if(nowTimestamp < job.nextRun) continue;

    log(`Running backup "${job.title}" due to interval settings`)
    job.execute()
  }
}

async function periodicCleanup(){
  for(let backup of Backup.all()){
    let job = Job.from(backup.related.job);
    let retentionDays = job?.retentionDays || 8; // Default to 8 days, in case a backup is from a deleted job
    let obsDate = new Date()
    obsDate.setDate(obsDate.getDate() - retentionDays)
    if(new Date(backup.timestamp).getTime() >= obsDate.getTime())
      continue;

    log(`Deleting backup from ${backup.timestamp} (${job?.title||"UNKNOWN_JOB"}) due to retension setup`)
    backup.delete()
  }
}