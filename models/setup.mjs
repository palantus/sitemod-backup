import Entity, { query } from "entitystorage";

export default class Setup extends Entity{
  initNew(){
    this.tag("backupsetup")
  }

  static lookup(){
    return query.type(Setup).tag("backupsetup").first || new Setup()
  }

  toObj(){
    return {
    }
  }
}