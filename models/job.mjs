import Entity, {query, nextNum} from "entitystorage"

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

  async execute(){
    console.log("execute backup job")
  }

  toObj() {
    return {
      id: this.id,
      title: this.title,
      src: {
        type: this.srcType||null
      },
      dest: {
        type: this.destType||null
      }
    }
  }

}