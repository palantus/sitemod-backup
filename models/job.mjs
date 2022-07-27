import Entity, {query, nextNum} from "entitystorage"
import Remote from "../../../models/remote.mjs"
import {join} from "path"
import {access} from "node:fs/promises"
import Backup from "./backup.mjs"
import { getTimestamp } from "../../../tools/date.mjs"

export default class Job extends Entity {
  initNew({title, apiKey, url} = {}) {
    this.id = nextNum("backupjob")
    this.title = title || "New job"
    this.intervalUnit = "day"
    this.interval = 7
    this.retentionDays = 7;
    this.srcType = "db"
    this.destType = "db-remote",
    this.tag("backupjob")
  }

  static lookup(id){
    if(!id) return null;
    return query.type(Job).tag("backupjob").prop("id", id).first
  }

  static all(){
    return query.type(Job).tag("backupjob").all
  }

  async validate(){
    if(this.srcType == "remote-db"){
      if(!this.srcRemote) return "No source remote provided"
      let remote = Remote.lookup(this.srcRemote);
      if(!remote) return `Unkown source remote: ${this.srcRemote}`
    }

    if(this.srcType == "fs"){
      let path = this.buildPath(this.srcFSPath, !!this.srcFSIsRelative)
      if(!path) return "Source path not provided"
      let exists = await this.pathExists(path)
      if(!exists) return `Source path doesn't exist: ${path}`
    }

    if(this.destType == "db-remote" || this.destType == "drop-remote"){
      if(!this.destRemote) return "No dest remote provided"
      let remote = Remote.lookup(this.destRemote);
      if(!remote) return `Unkown dest remote: ${this.destRemote}`
    }

    if(this.destType == "fs-local"){
      let path = this.buildPath(this.destFSPath, !!this.destFSIsRelative)
      if(!path) return "Dest path not provided"
      let exists = await this.pathExists(path)
      if(!exists) return `Dest path doesn't exist: ${path}`
    }

    return null
  }

  buildPath(path, isRelative){
    if(isRelative){
      return join(global.sitecore.storagePath, path)
    } else {
      return path
    }
  }

  async pathExists(path){
    if(!path) return false;
    try{
      await access(path)
      return true;
    } catch(err){
      return false;
    }
  }

  execute(){
    let backup = new Backup(this)
    return backup.execute()
  }

  calcNextRun(){
    let unit = this.intervalUnit
    let interval = this.interval || 7
    let lastRun = this.lastRun

    if(!lastRun){
      this.nextRun = getTimestamp()
      return;
    }
    
    let runDate = new Date()
    if(unit == "hour"){
      runDate.setHours(runDate.getHours() + interval)
    } else if(unit == "day"){
      runDate.setDate(runDate.getDate() + interval)
    } else if(unit == "month"){
      runDate.setMonth(runDate.getMonth() + interval)
    } else {
      this.nextRun = null;
      return;
    }

    this.nextRun = getTimestamp(runDate.getTime() - new Date().getTime())
  }

  toObj() {
    return {
      id: this.id,
      title: this.title,
      enabled: !!this.enabled,
      interval: this.interval||0,
      intervalUnit: this.intervalUnit||null,
      nextRun: this.nextRun || null,
      retentionDays: this.retentionDays||null,
      src: {
        type: this.srcType||"db",
        remote: this.srcRemote || null,
        fs: {
          path: this.srcFSPath || null,
          isRelative: !!this.srcFSIsRelative,
          encrypt: !!this.srcEncrypt
        },
        db: {
          isFull: !!this.srcDatabaseFull,
          encrypt: !!this.srcEncrypt
        }
      },
      dest: {
        type: this.destType||"db-remote",
        remote: this.destRemote || null,
        fs: {
          path: this.destFSPath || null,
          isRelative: !!this.destFSIsRelative
        }
      }
    }
  }

}