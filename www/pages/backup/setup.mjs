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

    <h1>Backup setup</h1>
    <field-list labels-pct="30">
    </field-list>
    <br>

    <button class="styled" id="new-btn">New backup</button>
  </div>
  
  <dialog-component title="New backup" id="new-dialog">
    <field-component label="Title"><input id="new-title"></input></field-component>
    <field-component label="Run every ">
      <input type="number" id="new-interval"></input>
      <select id="src-interval-unit">
        <option value="hour">Hour</option>
        <option value="day">Day</option>
        <option value="month">Month</option>
      </select>
    </field-component>
    <br>
    <h2>Source:</h2>
    <field-component label="Type">
      <select id="src-type">
        <option value="fs">Local file system</option>
        <option value="db">Database</option>
        <option value="remote-db">Remote database</option>
      </select>
    </field-component>
    <div id="src-fs-setup">
      <field-component label="Path"><input id="src-fs-path"></input></field-component>
      <field-component label="Relative path"><input type="checkbox" id="src-fs-isRelative"></input></field-component>
      <field-component label="Encrypt"><input type="checkbox" id="src-fs-encrypt"></input></field-component>
    </div>
    <div id="src-db-setup">
      <field-component label="Full backup" title="Including blobs"><input type="checkbox" id="src-db-full"></input></field-component>
      <field-component label="Encrypt"><input type="checkbox" id="src-db-encrypt"></input></field-component>
    </div>
    <div id="src-remote-setup">
      <field-component label="Remote">
        <field-edit type="select" lookup="federation-remote"></field-edit>
      </field-component>
    </div>
    <br>

    <h2>Destination;</h2>
    <field-component label="Type">
      <select id="dest-type">
        <option value="fs">Local file system</option>
        <option value="db">Database blob</option>
        <option value="remote">Remote server</option>
      </select>
    </field-component>
    <div id="dest-fs-setup">
      <field-component label="Path"><input id="dest-fs-path"></input></field-component>
    </div>
    <br>
    
    
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

    let setup = await api.get("backup/setup")


    this.shadowRoot.querySelectorAll("field-edit:not([disabled])").forEach(e => e.setAttribute("patch", `backup/setup`));
  }

  async newBackup(){
    let dialog = this.shadowRoot.querySelector("#new-dialog")

    showDialog(dialog, {
      show: () => this.shadowRoot.querySelector("#new-title").focus(),
      ok: async (val) => {
        
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