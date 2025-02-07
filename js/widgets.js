
import * as consts from './constants.js';
import * as rules from './rules.js';
import * as config from './config.js'
import RuleData from './model/RuleData.js';
import * as operations from './operations.js'

export function dangerModal(title, confirmCallback) {

    document.getElementById("danger-modal-title").innerText = title;
    document.getElementById("danger-confirm-button").onclick = confirmCallback


}


export function loadModal(message){
    document.getElementById("load-modal-message").innerHTML =
    ` ${message}
    <br>
    <strong>Please, reload this page to proceed.</strong>`;

    $("#loadModal").modal();
}

export function errorModal(title, message) {

    document.getElementById("error-modal-title").innerText = title;
    document.getElementById("error-modal-message").innerText = message;

    $("#errorModal").modal();
}

export function installationModal(buttonCallback) {

    document.getElementById("install-modal-button").onclick = buttonCallback;
   
    $("#installModal").modal();
}

export function raiseInstallationStart( ){
    
    document.getElementById("install-modal-button").disabled = "disabled";

    let status = document.getElementById("install-status");
    status.innerText = "Installing... Please wait.";
    status.style.display = "inline-block";

    let statusIcon = document.getElementById("install-status-icon");
    statusIcon.className = "fa fa-circle-o-notch refresh-anime";
    status.style.display = "inline-block";
}

export function raiseInstallationSuccess( ){
    
    let status = document.getElementById("install-status");
    status.innerText = "Done! Please refresh this page.";
    status.style.display = "inline-block";

    let statusIcon = document.getElementById("install-status-icon");
    statusIcon.className = "fa fa-check";
    status.style.display = "inline-block";
}

export function raiseInstallationError(){
    
    let statusError = document.getElementById("install-error");
    statusError.innerHTML = 
    `Something went wrong. Check the logs file at <a href='#'>${config.getConfiguration().logPath}</a> for details. <br>Refresh this page to try again.` ;
    statusError.style.display = "inline-block";

    let status = document.getElementById("install-status");
    status.style.display = "none";

    let statusIcon = document.getElementById("install-status-icon");
    statusIcon.style.display = "none";

}
export function logModal(contentArr){

    contentArr = contentArr.reverse();
    let log = document.getElementById("log-list");

    let i = 0;

    log.innerHTML = "";
    contentArr.forEach(l => {
        if(l == "") return;

        let el = document.createElement("li");
        el.className = "list-group-item list-group-item-action ";
        el.innerText = l;
        
        if(l.includes("ERR!"))
            el.className += "list-group-item-danger";
        else if(i % 2 == 0)
            el.className += "list-group-item-info";

        i++;
        


        log.appendChild(el);
    });

}   

export function ruleModal(interfaceNames, table, applyCallback, chain, ruleNumber) {
    if (chain == null)
        chain = rules.getActiveChain(table);

    let title;
    if(ruleNumber)
        title = "Insert new rule above #" + ruleNumber;
    else
        title = consts.AddNewRule;

    let ruleWindow;
    if (table == "nat") {
        ruleWindow = document.getElementById("ruleModal");
    }
    else {
        ruleWindow = document.getElementById("filterRuleModal");
    }

    loadRuleModal(title, table, chain, interfaceNames, null, null, null);
    ruleWindow.querySelector("#rule-confirm-button").onclick = applyCallback;
}



export function ruleEditModal(interfaceNames, table, applyCallback, chain, ruleNumber) {
    let jassoo = rules.jsonData;
    //console.log("Table: " + table + " Chain: " + chain + " Rule: " + ruleNumber);
    //console.log("jassoo: " + JSON.stringify(jassoo));

    let rule = jassoo.find(t => t.name == table).chains.find(c => c.name == chain).rules.find(r => r.index == ruleNumber);
    //console.log("Rule to edit: " + JSON.stringify(rule));

    if (chain == null)
        chain = rules.getActiveChain(table);

    let title;
    if(ruleNumber)
        title = "Editing rule #" + ruleNumber;
    else
        title = consts.AddNewRule;

    console.log("callback: " + applyCallback);

    loadRuleModal(title, table, chain, interfaceNames, null, ruleNumber, rule);

    let ruleWindow;
    if (table == "nat") {
        ruleWindow = document.getElementById("ruleModal");
    }
    else {
        ruleWindow = document.getElementById("filterRuleModal");
    }
    console.log("Rule window: " + ruleWindow + ", call back: " + applyCallback);
    ruleWindow.querySelector("#rule-confirm-button").onclick = applyCallback;
}


function loadRuleModal(title, table, chain, interfaces, applyCallback, ruleNumber, ruleDataJson) {

    let interfacesOptionsHTML = "";

    interfaces.forEach(i => {
        if (!i) return;
        interfacesOptionsHTML += `<option value="${i}">${i}</option>`
    });

    let ruleWindow;
    if (table == "nat") {
        table = table.toUpperCase();
        ruleWindow = document.getElementById("ruleModal");
    }
    else {
        table = table.charAt(0).toUpperCase() + table.substring(1);
        ruleWindow = document.getElementById("filterRuleModal");
    }

    ruleWindow.querySelector("#rule-modal-title").innerText = title;
    ruleWindow.querySelector("#badge-table").innerText = "Table: " + table;
    ruleWindow.querySelector("#badge-chain").innerText = "Chain: " + chain;
    ruleWindow.querySelector("#rule-confirm-button").onclick = applyCallback;

    //setInputBehavior(ruleWindow, "input-interface-rule-menu", "input-interface-rule-check", interfacesOptionsHTML);
    //setInputBehavior(ruleWindow, "output-interface-rule-menu", "output-interface-rule-check", interfacesOptionsHTML);
    //setInputBehavior(ruleWindow, "protocol-rule-menu", "protocol-rule-check");
    //setInputBehavior(ruleWindow, "job-rule-menu", "job-rule-check");
    //setInputBehavior(ruleWindow, "source-ip-text", "source-rule-check");
    //setInputBehavior(ruleWindow, "source-port-text", "source-rule-check");
    //setInputBehavior(ruleWindow, "destination-ip-text", "destination-rule-check");
    //setInputBehavior(ruleWindow, "destination-port-text", "destination-rule-check");

    console.log("Rule data: " + JSON.stringify(ruleDataJson));
    if (ruleDataJson) {
        ruleWindow.querySelector("#input-interface-rule-menu").value = ruleDataJson.inputInterface ?? "";
        ruleWindow.querySelector("#output-interface-rule-menu").value = ruleDataJson.outputInterface ?? "";
        ruleWindow.querySelector("#protocol-rule-menu").value = ruleDataJson.protocol ?? "";
        ruleWindow.querySelector("#job-rule-menu").value = ruleDataJson.action ?? "";
        ruleWindow.querySelector("#source-ip-text").value = ruleDataJson.source ?? "";
        ruleWindow.querySelector("#source-port-text").value = ruleDataJson.sourcePort ?? "";
        ruleWindow.querySelector("#destination-ip-text").value = ruleDataJson.destination ?? "";
        ruleWindow.querySelector("#destination-port-text").value = ruleDataJson.destinationPort ?? "";
        //ruleWindow.querySelector("#destination-rule-text").value = ruleDataJson.toDestination ?? "";
        ruleWindow.querySelector("#protocol-rule-opts-text").value = ruleDataJson.protocolOptions ?? "";
        
    }
}

function setInputBehavior(ruleWindow, inputName, inputCheckName, innerHTML) {
    let input = ruleWindow.querySelector(`#${inputName}`);
    if (innerHTML)
        input.innerHTML = innerHTML;

    try {
        input.onmouseup = () => ruleWindow.querySelector(`#${inputCheckName}`).checked = true;
    } catch (error) {
        console.error(`Error setting input behavior for ${inputName}:`, error);
    }
}

export function cancelRuleModal() {
    let modal = document.getElementById("ruleModal");

    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('style', 'display: none');
}

export function settingsModal(){
    
    let autosave = document.getElementById("config-autosave-check");
    let savePath = document.getElementById("config-save-path");
    let logPath = document.getElementById("config-log-path");
    let saveBtn = document.getElementById("config-save-button");
    let loadBtn = document.getElementById("config-load-button");
    let okBtn = document.getElementById("config-confirm-button");
    
    let conf = config.getConfiguration();
    autosave.checked = conf.autoSave;
    savePath.value = conf.savePath;
    logPath.value = conf.logPath;

    saveBtn.onclick = () => {
        config.saveTableState(savePath.value);
    };

    loadBtn.onclick = () => {
        config.loadTableState(savePath.value, true);
    };

    okBtn.onclick = () => {
        
        conf.autoSave = autosave.checked;
        conf.savePath = savePath.value;
        conf.logPath = logPath.value;

        config.saveChanges(conf);
    };

    

}

export function errorMessage(operationTried, message) {

    let div = document.createElement("div");
    div.className = "alert alert-danger alert-dismissible";
    div.innerHTML =
        `
    <span class="pficon pficon-error-circle-o"></span>
    <strong>${consts.FailedTo} ${operationTried}</strong>. ${message} 
    <button type="button" class="btn-close" data-dismiss="alert" aria-label="Close">&times Close</button>
    `;

    let board = document.getElementById("message-board");

    board.appendChild(div);

}


export function okMessage(title, message) {

    let div = document.createElement("div");
    div.className = "alert alert-info alert-dismissible";
    div.innerHTML =
        `
    <span class="fa fa-check"></span>
    <strong>${title}</strong>. ${message} 
    <button type="button" class="btn-close" data-dismiss="alert" aria-label="Close">&times Close</button>
    `;

    let board = document.getElementById("message-board");

    board.appendChild(div);

}

export function tableMessage(table, message) {

    let msg = document.getElementById(table + "-message");

    msg.innerHTML = `<strong>${message}</strong>`;

}

export function hideTableMessage(table) {

    let msg = document.getElementById(table + "-message");

    if (msg != null)
        msg.innerHTML = "";
}