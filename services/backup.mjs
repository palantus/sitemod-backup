import Setup from "../models/setup.mjs";
import LogEntry from "../../../models/logentry.mjs";
import Backup from "../models/backup.mjs";
import Job from "../models/job.mjs";
import { getTimestamp } from "../../../tools/date.mjs";

function log(text){
  return new LogEntry(text, "backup");
}

export function startPeriodicBackupService(){
  periodicBackup()
  periodicCleanup()
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