const elementName = 'backup-job-page'

import api from "/system/api.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/field-edit.mjs"
import "/components/field-list.mjs"
import {on, off} from "/system/events.mjs"
import {state} from "/system/core.mjs"
import { confirmDialog, alertDialog } from "../../components/dialog.mjs"


const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
        padding: 10px;
        position: relative;
    }
    field-list{
      width: 500px;
    }
    h1{position: relative; margin-bottom: 20px;}
    #user-id-container{
      font-size: 10pt; 
      color: gray; 
      position: absolute;
      left: 0px;
      top: calc(100% - 5px);
    }
    .hidden{display:none;}
  </style>  

  <action-bar>
    <action-bar-item id="exec-btn">Run now</action-bar-item>
    <action-bar-item id="validate-btn">Validate</action-bar-item>
    <action-bar-item id="delete-btn">Delete</action-bar-item>
  </action-bar>

  <div id="container">
    <h1>Backup job</h1>

    <field-list labels-pct="20">
      <field-edit type="text" label="Title" id="title"></field-edit>
      <field-edit label="Enabled" type="checkbox" id="enabled"></field-edit>

      <field-edit type="number" id="interval" label="Run every"></field-edit>
      <field-edit type="select" id="intervalUnit" label="Unit">
        <option value="hour">Hour</option>
        <option value="day">Day</option>
        <option value="month">Month</option>
      </field-edit>
      <field-edit type="text" label="Next run" id="nextRun" disabled></field-edit>
    </field-list>

    <br>
    <h2>Source</h2>

    <field-list labels-pct="20">
      <field-edit type="select" label="Type" id="srcType">
        <option value="fs">Local file system</option>
        <option value="db">Database</option>
        <option value="remote-db">Remote database</option>
      </field-edit>

      <field-edit class="src fs" label="Path" type="text" id="srcFSPath"></field-edit>
      <field-edit class="src fs" label="Relative path" type="checkbox" id="srcFSIsRelative"></field-edit>
      <field-edit class="src fs" label="Encrypt" type="checkbox" id="srcEncrypt"></field-edit>

      <field-edit class="src remote" type="select" label="Remote" lookup="federation-remote" id="srcRemote"></field-edit>

      <field-edit class="src db" label="Full backup" title="Including blobs" type="checkbox" id="srcDatabaseFull"></field-edit>
      <field-edit class="src db" label="Encrypt" type="checkbox" id="srcDBEncrypt" field="srcEncrypt"></field-edit>
    </field-list>

    <br>
    <h2>Destination</h2>
    <field-list labels-pct="20">
      <field-edit type="select" id="destType" label="Type">
        <option value="db-local">Database (local)</option>
        <option value="db-remote">Database (remote)</option>
        <option value="drop-local">File drop (local)</option>
        <option value="drop-remote">File drop (remote)</option>
        <option value="fs-local">File system (local)</option>
      </field-edit>
      
      <field-edit class="dest fs" label="Path" type="text" id="destFSPath"></field-edit>
      <field-edit class="dest fs" label="Relative path" type="checkbox" id="destFSIsRelative"></field-edit>

      <field-edit class="dest remote" type="select" label="Remote" lookup="federation-remote" id="destRemote"></field-edit>
    </field-list>

  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this)
    this.refreshView = this.refreshView.bind(this)
    this.execNow = this.execNow.bind(this)
    
    this.jobId = /\/backup\/job\/([\d]+)/.exec(state().path)[1]

    this.shadowRoot.getElementById("exec-btn").addEventListener("click", this.execNow)
    this.shadowRoot.getElementById("validate-btn").addEventListener("click", () => api.get(`backup/job/${this.jobId}/validate`).then(res => alertDialog(res.error ? `Validation failed with error: ${res.error}` : "Validation successful!")))

    this.shadowRoot.getElementById("delete-btn").addEventListener("click", 
          () => confirmDialog(`Are you sure that you want to delete this backup?`)
                      .then(response => 
                        response ? api.del(`backup/job/${this.jobId}`).then(() => window.history.back()) 
                                  : null))

    this.shadowRoot.querySelectorAll("field-edit").forEach(e => {
      e.addEventListener("value-changed", this.refreshView);
    })

    this.elementId = `${elementName}-${this.userId}`
  }

  async refreshData(){
    let job = this.job = await api.get(`backup/job/${this.jobId}`)

    this.shadowRoot.getElementById("title").setAttribute("value", job.title);
    this.shadowRoot.getElementById("enabled").setAttribute("value", !!job.enabled);
    this.shadowRoot.getElementById("interval").setAttribute("value", job.interval||0);
    this.shadowRoot.getElementById("intervalUnit").setAttribute("value", job.intervalUnit||"");
    this.shadowRoot.getElementById("nextRun").setAttribute("value", job.nextRun||"");

    this.shadowRoot.getElementById("srcType").setAttribute("value", job.src.type||"");

    this.shadowRoot.getElementById("srcFSPath").setAttribute("value", job.src.fs.path||"");
    this.shadowRoot.getElementById("srcFSIsRelative").setAttribute("value", job.src.fs.isRelative);
    this.shadowRoot.getElementById("srcEncrypt").setAttribute("value", job.src.fs.encrypt);
    this.shadowRoot.getElementById("srcRemote").setAttribute("value", job.src.remote);
    this.shadowRoot.getElementById("srcDatabaseFull").setAttribute("value", job.src.db.isFull);
    this.shadowRoot.getElementById("srcDBEncrypt").setAttribute("value", job.src.db.encrypt);

    this.shadowRoot.getElementById("destType").setAttribute("value", job.dest.type||"");

    this.shadowRoot.getElementById("destFSPath").setAttribute("value", job.dest.fs.path||"");
    this.shadowRoot.getElementById("destFSIsRelative").setAttribute("value", job.dest.fs.isRelative);
    this.shadowRoot.getElementById("destRemote").setAttribute("value", job.dest.remote||"");

    this.shadowRoot.querySelectorAll("field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `backup/job/${job.id}`));
    this.refreshView()
  }

  refreshView(){
    let srcType = this.shadowRoot.getElementById("srcType").getValue()
    this.shadowRoot.querySelectorAll(".src.db").forEach(e => e.classList.toggle("hidden", srcType != "db" && srcType != "remote-db"))
    this.shadowRoot.querySelectorAll(".src.fs").forEach(e => e.classList.toggle("hidden", srcType != "fs"))
    this.shadowRoot.querySelectorAll(".src.remote").forEach(e => e.classList.toggle("hidden", srcType != "remote-db"))

    let destType = this.shadowRoot.getElementById("destType").getValue()
    this.shadowRoot.querySelectorAll(".dest.remote").forEach(e => e.classList.toggle("hidden", !destType.includes("remote")))
    this.shadowRoot.querySelectorAll(".dest.remote").forEach(e => e.classList.toggle("hidden", !destType.includes("remote")))
    this.shadowRoot.querySelectorAll(".dest.fs").forEach(e => e.classList.toggle("hidden", destType != "fs-local"))
  }

  async execNow(){
    if(!(await confirmDialog("Are you sure that you want to run this job right now?"))) return;
    api.post(`backup/job/${this.jobId}/exec`)
  }

  connectedCallback() {
    on("changed-page", this.elementI, this.refreshData)
  }

  disconnectedCallback() {
    off("changed-page", this.elementI)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}