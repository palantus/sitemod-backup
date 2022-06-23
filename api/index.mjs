import setup from "./routes/setup.mjs"
import backup from "./routes/backup.mjs"

export default (app) => {
  
  setup(app)
  backup(app)
	
  return app
}