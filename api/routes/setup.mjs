import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import { validateAccess } from "../../../../services/auth.mjs"
import Setup from "../../models/setup.mjs";

export default (app) => {

  app.use("/backup", route)

  route.get('/setup', function (req, res, next) {
    if (!validateAccess(req, res, { permission: "backup.setup" })) return;
    res.json(Setup.lookup().toObj());
  });

  route.patch('/setup', function (req, res, next) {
    if (!validateAccess(req, res, { permission: "backup.setup" })) return;

    let setup = Setup.lookup();

    res.json(true);
  });
};