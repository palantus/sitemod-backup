import Role from "../../models/role.mjs"
import { startPeriodicBackupService } from "./services/checker.mjs"

export default async () => {
  // init
  Role.lookupOrCreate("admin").addPermission(["backup.setup"], true)

  return {
    backupService: startPeriodicBackupService()
  }
}