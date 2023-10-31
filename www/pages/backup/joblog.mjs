const elementName = 'backup-job-log-page'

import api from "../../system/api.mjs"
import "../../components/action-bar.mjs"
import "../../components/action-bar-item.mjs"
import {on, off} from "../../system/events.mjs"
import {state} from "../../system/core.mjs"


const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='../css/global.css'>
  <style>
    #container{
        padding: 10px;
        position: relative;
    }
    h1{position: relative; margin-bottom: 20px;}
    .hidden{display:none;}
    table{border-collapse: collapse;}
    table th{text-align: left;}
    table td:first-child{padding-right: 10px;}
    table thead th{border-bottom: 1px solid white;}
  </style>  

  <action-bar>
    <action-bar-item id="refresh-btn">Refresh</action-bar-item>
  </action-bar>

  <div id="container">
    <h1>Log for job <span id="job-title"></span></h1>

    <table>
      <thead>
        <tr>
          <th>Timestamp</td>
          <th>Text</td>
        </tr>
      </thead>
      <tbody id="log"></tbody>
    </table>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this)
    
    this.jobId = /\/backup\/job\/([\d]+)/.exec(state().path)[1]

    this.shadowRoot.getElementById("refresh-btn").addEventListener("click", this.refreshData)

    this.elementId = `${elementName}-${this.userId}`
  }

  async refreshData(){
    let [job, log] = await Promise.all([api.get(`backup/job/${this.jobId}`), api.get(`backup/job/${this.jobId}/log`)])

    this.shadowRoot.getElementById("job-title").innerText = job.title

    this.shadowRoot.getElementById("log").innerHTML = log.sort((a, b) => a.timestamp > b.timestamp ? -1 : 1).map(b => `
        <tr>
          <td>${b.timestamp.replace("T", ' ').substring(0, 19)}</td>
          <td>${b.text}</td>
        </tr>
      `).join("")
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