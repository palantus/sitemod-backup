const elementName = 'backup-job-page'

import api from "/system/api.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/field-edit.mjs"
import "/components/field-list.mjs"
import {on, off} from "/system/events.mjs"
import {state} from "/system/core.mjs"
import { confirmDialog } from "../../components/dialog.mjs"


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
    <action-bar-item id="delete-btn">Delete</action-bar-item>
  </action-bar>

  <div id="container">
    <h1>Backup job</h1>

    <field-list labels-pct="20">
      <field-edit type="text" label="Title" id="title"></field-edit>

      <field-edit type="number" id="new-interval" label="Run every"></field-edit>
      <field-edit type="select" id="src-interval-unit" label="Unit">
        <option value="hour">Hour</option>
        <option value="day">Day</option>
        <option value="month">Month</option>
      </field-edit>
    </field-list>

    <br>
    <h2>Source</h2>

    <field-list labels-pct="20">
      <field-edit type="select" label="Type" id="srcType">
        <option value="fs">Local file system</option>
        <option value="db">Database</option>
        <option value="remote-db">Remote database</option>
      </field-edit>

      <field-edit class="src fs" label="Path" id="src-fs-path"></field-edit>
      <field-edit class="src fs" label="Relative path" type="checkbox" id="src-fs-isRelative"></field-edit>
      <field-edit class="src fs" label="Encrypt" type="checkbox" id="src-fs-encrypt"></field-edit>

      <field-edit class="src db" label="Full backup" title="Including blobs" type="checkbox" id="src-db-full"></field-edit>
      <field-edit class="src db" label="Encrypt" type="checkbox" id="src-db-encrypt"></field-edit>
 
      <field-edit class="src remote" type="select" label="Remote" lookup="federation-remote"></field-edit>
    </field-list>

    <br>
    <h2>Destination</h2>
    <field-list labels-pct="20">
      <field-edit type="select" id="destType" label="Type">
        <option value="fs">Local file system</option>
        <option value="db">Database blob</option>
        <option value="remote">Remote server</option>
      </field-edit>
      
      <field-edit label="Path" id="dest-fs-path"></field-edit>
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
    
    this.jobId = /\/backup\/job\/([\d]+)/.exec(state().path)[1]

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

    this.shadowRoot.getElementById("srcType").setAttribute("value", job.src.type);

    this.shadowRoot.querySelectorAll("field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `backup/job/${job.id}`));
    this.refreshView()
  }

  refreshView(){
    let srcType = this.shadowRoot.getElementById("srcType").getValue()
    this.shadowRoot.querySelectorAll(".src.db").forEach(e => e.classList.toggle("hidden", srcType != "db"))
    this.shadowRoot.querySelectorAll(".src.fs").forEach(e => e.classList.toggle("hidden", srcType != "fs"))
    this.shadowRoot.querySelectorAll(".src.remote").forEach(e => e.classList.toggle("hidden", srcType != "remote-db"))
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