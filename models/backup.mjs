import Entity, {query} from "entitystorage"
import Remote from "../../../models/remote.mjs";
import { getTimestamp } from "../../../tools/date.mjs"
import Job from "./job.mjs";
import LogEntry from "../../../models/logentry.mjs"
import {createWriteStream} from 'node:fs';
import {unlink} from 'fs';
import {pipeline} from 'node:stream/promises';
import {join} from "path"
import fetch from "node-fetch"
import User from "../../../models/user.mjs";
import {service as userService} from "../../../services/user.mjs"

export default class Backup extends Entity {
  initNew(job) {
    this.timestamp = getTimestamp()

    this.rel(job, "job")
    this.rel(Remote.lookup(job.destRemote), "remote")

    this.tag("backup")
  }

  static lookup(id){
    if(!id) return null;
    return query.type(Backup).tag("backup").id(id).first
  }

  static all(){
    return query.type(Backup).tag("backup").all
  }

  log(text, isError){
    let entry = new LogEntry(isError ? `Error: ${text}` : text, "backup")
    this.rel(entry, "log")
    this.related.job?.rel(entry, "log")
    if(isError) throw text
  }

  done(){
    let job = Job.from(this.related.job)
    if(job){
      job.lastRun = getTimestamp()
      job.calcNextRun()
    }
    this.tag("done")
  }


  async execute(){
    let job = Job.from(this.related.job);
    this.log(`Running backup ${job.id}: ${job.title}`)

    let validateRes = await job.validate()
    if(validateRes) throw validateRes

    let src = null;
    try{
      switch(job.srcType){
        case "fs": 
          //src = await this.getSourceFS(job)
          this.log("fs source not implemented", true)
          break;
        case "db": 
          src = await this.getSourceDB(job)
          break;
        case "remote-db": 
          src = await this.getSourceDBRemote(job)
          break;
        default:
          this.log(`Unknown source type: ${job.srcType}`, true)
          return null;
      }
    } catch(err){
      this.log(`Got error requesting source: ${err}`)
      return null;
    }

    if(!src) this.log("Invalid source data", true)

    this.filename = `backup_${getTimestamp()}.zip`;

    if(job.destType == "fs-local"){
      let path = job.buildPath(job.destFSPath, !!job.destFSIsRelative)
      let filePath = join(path, this.filename)
      if(src.type == "fetch-response"){
        await pipeline(src.res.body, createWriteStream(filePath));
        this.filePath = filePath
        this.log(`Storing backup as: ${filePath}`)
      } else {
        this.log("Unknown source data type", true)
      }

    } else if(job.destType == "db-local"){
      if(src.type == "fetch-response"){
        console.log(src.res.headers)
        console.log(src.res.headers.get("Content-Length"))
        this.setBlob(src.res.body)
        this.log(`Storing backup as blob`)
      } else {
        this.log("Unknown source data type", true)
      }

    } else {
      this.log("Unknown dest type: " + job.destType, true)
    }

    this.log("Finished")
    this.done()
  }

  async getSourceDB(job){
    let path = `system/database/download/${job.srcDatabaseFull ? "full" : "data"}?encrypt=${job.srcEncrypt ? "true" : "false"}`
    try{
      let authToken = userService.getTempAuthToken(User.lookupAdmin())
      let res = await fetch(`${global.sitecore.apiURL}/${path}`, {
        method: "POST",
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${''}:${authToken}`, 'binary').toString('base64'),
          'Content-Type' : "application/json"
        },
        body: JSON.stringify({encrypt: !!job.srcEncrypt, password: job.srcEncryptPassword})
      })
      return {type: "fetch-response", res}
    } catch(err){
      this.log(`Got error when requesting source db from local: ${err}`)
      return null;
    }
  }

  async getSourceDBRemote(job){
    if(!job.srcRemote) this.log("No remote provided", true)
    let remote = Remote.lookup(job.srcRemote);
    if(!remote) this.log(`Unkown source remote: ${job.srcRemote}`, true)
    let path = `system/database/download/${job.srcDatabaseFull ? "full" : "data"}`
    try{
      let res = await remote.post(path, {encrypt: !!job.srcEncrypt, password: job.srcEncryptPassword}, {returnRaw: true})
      return {type: "fetch-response", res}
    } catch(err){
      this.log(`Got error when requesting source db remote: ${err}`)
      return null;
    }
  }

  delete(){
    if(this.isRemote()){

    } else {
      if(this.filePath){
        unlink(this.filePath, () => null)
      }
    }

    super.delete()
  }

  isRemote(){
    return this.related.job?.destType?.includes("remote")
  }

  toObj(){
    return {
      id: this._id,
      timestamp: this.timestamp,
      done: this.tags.includes("done"),
      remote: this.isRemote() ? Remote.from(this.related.remote)?.toObj()||null : null,
      job: Job.from(this.related.job)?.toObj()||null,
      filePath: this.filePath||null,
      remotePath: this.remotePath||null
    }
  }
}