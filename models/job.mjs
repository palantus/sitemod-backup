import Entity, {query, nextNum} from "entitystorage"
import LogEntry from "../../../models/logentry.mjs"
import Remote from "../../../models/remote.mjs"
import {join} from "path"
import {access} from "node:fs/promises"
import {createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import { getTimestamp } from "../../../tools/date.mjs"

export default class Job extends Entity {
  initNew({title, apiKey, url} = {}) {
    this.id = nextNum("backupjob")
    this.title = title || "New job"
    this.tag("backupjob")
  }

  static lookup(id){
    if(!id) return null;
    return query.type(Job).tag("backupjob").prop("id", id).first
  }

  static all(){
    return query.type(Job).tag("backupjob").all
  }

  log(text, isError){
    this.rel(new LogEntry(isError ? `Error: ${text}` : text, "backup"), "log")
    if(isError) throw text
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

  async execute(){
    this.log(`Running backup ${this.id}: ${this.title}`)

    let validateRes = await this.validate()
    if(validateRes) throw validateRes

    let src = null;
    try{
      switch(this.srcType){
        case "fs": 
          src = await this.getSourceFS()
          break;
        case "db": 
          src = await this.getSourceDB()
          break;
        case "remote-db": 
          src = await this.getSourceDBRemote()
          break;
        default:
          this.log(`Unknown source type: ${this.srcType}`)
          return null;
      }
    } catch(err){
      this.log(`Got error requesting source: ${err}`)
      return null;
    }

    if(!src) this.log("Invalid source data", true)

    if(this.destType == "fs-local"){
      let path = this.buildPath(this.destFSPath, !!this.destFSIsRelative)

      if(src.type == "fetch-response"){
        await pipeline(src.res.body, createWriteStream(join(path, `backup_${getTimestamp()}.zip`)));
      } else {
        this.log("Unknown source data type", true)
      }
    } else {
      this.log("Unknown dest type", true)
    }

    this.log("Finished")
  }

  async getSourceDBRemote(){
    if(!this.srcRemote) this.log("No remote provided", true)
    let remote = Remote.lookup(this.srcRemote);
    if(!remote) this.log(`Unkown source remote: ${this.srcRemote}`, true)
    try{
      let res = await remote.get("system/database/download/data", {returnRaw: true})
      return {type: "fetch-response", res}
    } catch(err){
      this.log(`Got error when requesting source db remote: ${err}`)
      return null;
    }
  }

  toObj() {
    return {
      id: this.id,
      title: this.title,
      enabled: !!this.enabled,
      interval: this.interval||0,
      intervalUnit: this.intervalUnit||null,
      nextRun: this.nextRun || null,
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