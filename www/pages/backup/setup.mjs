const elementName = 'backup-setup-page'

import api from "/system/api.mjs"
import "/components/field-edit.mjs"
import "/components/field-list.mjs"
import {on, off} from "/system/events.mjs"
import { promptDialog, confirmDialog, showDialog } from "/components/dialog.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
        padding: 10px;
        position: relative;
    }
    div.group:not(:first-child){
      margin-top: 10px;
    }
    .group input{
      width: 350px;
    }
    field-list{
      width: 600px;
    }
    .hidden{display: none;}
  </style>  

  <div id="container">

    <h1>Backup</h1>
    <field-list labels-pct="30">
    </field-list>
    <br>

    <h2>Backups jobs</h2>
    <table>
      <tbody id="jobs"></tbody>
    </table>
    <br>
    <button class="styled" id="new-btn">Add new</button>
  </div>
  
  <dialog-component title="New job" id="new-dialog">
    <field-component label="Title"><input id="new-title"></input></field-component>
  </dialog-component>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this);
    this.newBackup = this.newBackup.bind(this)
    
    this.shadowRoot.getElementById("new-btn").addEventListener("click", this.newBackup)

    this.refreshData();
  }

  async refreshData(){

    let jobs = await api.get("backup/job")

    this.shadowRoot.getElementById("jobs").innerHTML = jobs.sort((a, b) => a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1).map(j => `
        <tr>
          <td><field-ref ref="/backup/job/${j.id}">${j.title}</field-ref></td>
        </tr>
      `).join("")

    this.shadowRoot.querySelectorAll("field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `backup/setup`));
  }

  async newBackup(){
    let dialog = this.shadowRoot.querySelector("#new-dialog")

    showDialog(dialog, {
      show: () => this.shadowRoot.querySelector("#new-title").focus(),
      ok: async (val) => {
        await api.post("backup/job", val)
        this.refreshData()
      },
      validate: (val) => 
        !val.title ? "Please fill out title"
        : true,
      values: () => {return {
        title: this.shadowRoot.getElementById("new-title").value
      }},
      close: () => {
        this.shadowRoot.querySelectorAll("field-component input").forEach(e => e.value = '')
      }
    })
  }

  connectedCallback() {
    on("changed-page", elementName, this.refreshData)
  }

  disconnectedCallback() {
    off("changed-page", elementName)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}