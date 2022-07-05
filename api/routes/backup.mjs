import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import { noGuest, validateAccess } from "../../../../services/auth.mjs"
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

  route.post('/job/:id/exec', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let job = Job.lookup(req.params.id)
    if (!job) throw "Unknown job"
    job.execute()
       .catch(error => res.json({error, success: false}))
       .then(result => res.json({result, success: true}));

  });

  route.patch('/job/:id', function (req, res, next) {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    let job = Job.lookup(req.params.id)
    if (!job) throw "Unknown job"
    if(typeof req.body.title === "string" && req.body.title) job.title = req.body.title;
    if(typeof req.body.srcType === "string") job.srcType = req.body.srcType || null;
    if(typeof req.body.destType === "string") job.destType = req.body.destType || null;
    res.json(true);
  });
};