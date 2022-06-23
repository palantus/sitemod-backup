import express from "express"
const { Router, Request, Response } = express;
const route = Router();
import { noGuest, validateAccess } from "../../../../services/auth.mjs"

export default (app) => {

  app.use("/backup", route)

  route.get('/backup', noGuestm, (req, res) => {
    if(!validateAccess(req, res, {permission: "admin"})) return;
    res.json({error: "Not implemented"})
  })
};