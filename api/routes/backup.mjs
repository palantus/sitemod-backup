import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import { noGuest, validateAccess } from "../../../../services/auth.mjs"
import Backup from "../../models/backup.mjs";
import Job from "../../models/job.mjs"

export default (app) => {

  app.use("/backup", route)

  route.get('/backup', noGuest, (req, res) => {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json({error: "Not implemented"})
  })

  route.post('/job', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    if(typeof req.body.title !== "string") throw "Invalid title"
    let job = new Job(req.body)
    res.json(job.toObj())
  });

  route.get('/job', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(Job.all().map(f => f.toObj()));
  });

  route.delete('/job/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let job = Job.lookup(req.params.id)
    if (!job) throw "Unknown job"
    job.delete();
    res.json({success: true});
  });

  route.get('/job/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let job = Job.lookup(req.params.id)
    if (!job) throw "Unknown job"
    res.json(job.toObj());
  });

  route.get('/job/:id/log', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let job = Job.lookup(req.params.id)
    if (!job) throw "Unknown job"
    res.json(job.rels.log?.map(l => ({timestamp: l.timestamp, text: l.text}))||[]);
  });

  route.post('/job/:id/exec', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let job = Job.lookup(req.params.id)
    if (!job) throw "Unknown job"
    job.execute()
       .catch(error => {
         console.log(error)
         res.json({success: false})
        })
       .then(result => {
          if(res.writableEnded) return;
          res.json({success: true})
       });
  });

  route.get('/job/:id/validate', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let job = Job.lookup(req.params.id)
    if (!job) throw "Unknown job"
    job.validate()
       .then(result => {
          res.json({error: result||null, success: !!!result})
       });
  });

  route.patch('/job/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let job = Job.lookup(req.params.id)
    if (!job) throw "Unknown job"
    if(typeof req.body.title === "string" && req.body.title) job.title = req.body.title;
    if(typeof req.body.enabled === "boolean") job.enabled = req.body.enabled;
    if(typeof req.body.interval === "number") {
      job.interval = req.body.interval;
      job.calcNextRun()
    }
    if(typeof req.body.intervalUnit === "string" && req.body.intervalUnit) {
      job.intervalUnit = req.body.intervalUnit;
      job.calcNextRun()
    }
    if(typeof req.body.retentionDays === "number" && req.body.retentionDays) job.retentionDays = req.body.retentionDays;

    if(typeof req.body.srcType === "string") job.srcType = req.body.srcType || null;

    if(typeof req.body.srcFSPath === "string") job.srcFSPath = req.body.srcFSPath || null;
    if(typeof req.body.srcFSIsRelative === "boolean") job.srcFSIsRelative = req.body.srcFSIsRelative;
    if(typeof req.body.srcEncrypt === "boolean") job.srcEncrypt = req.body.srcEncrypt;
    if(typeof req.body.srcEncryptPassword === "string") job.srcEncryptPassword = req.body.srcEncryptPassword;
    if(typeof req.body.srcRemote === "string") job.srcRemote = req.body.srcRemote || null;
    if(typeof req.body.srcDatabaseFull === "boolean") job.srcDatabaseFull = req.body.srcDatabaseFull;

    if(typeof req.body.destType === "string") job.destType = req.body.destType || null;

    if(typeof req.body.destFSPath === "string") job.destFSPath = req.body.destFSPath || null;
    if(typeof req.body.destFSIsRelative === "boolean") job.destFSIsRelative = req.body.destFSIsRelative;
    if(typeof req.body.destRemote === "string") job.destRemote = req.body.destRemote || null;

    res.json(true);
  });

  route.get('/backups', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json(Backup.all().map(f => f.toObj()));
  });

  route.get('/backup/:id/log', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let backup = Backup.lookup(req.params.id)
    if (!backup) throw "Unknown backup"
    res.json(backup.rels.log?.map(l => ({timestamp: l.timestamp, text: l.text}))||[]);
  });

  route.delete('/backup/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let backup = Backup.lookup(req.params.id)
    if (!backup) throw "Unknown backup"
    backup.delete()
    res.json({success: true});
  });

  route.get('/backup/:id/download', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let backup = Backup.lookup(req.params.id)
    if (!backup) throw "Unknown backup"
    if(backup.related.job.destType == "db-local"){
      res.setHeader('Content-disposition', `attachment; filename=${backup.filename||"backup.zip"}`);
      res.setHeader('Content-Type', "application/zip");
      if(backup.size) res.setHeader('Content-Length', backup.size);
      backup.blob.pipe(res)
    } else if(backup.related.job.destType == "fs-local"){
      if(backup.filePath){
        res.setHeader('Content-disposition', `attachment; filename=${backup.filename||"backup.zip"}`);
        res.setHeader('Content-Type', "application/zip");
        res.sendFile(backup.filePath)
      } else
        res.sendStatus(404);
    } else {
      res.sendStatus(404);
    }
  });
};