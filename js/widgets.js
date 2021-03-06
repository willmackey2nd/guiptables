
import * as consts from './constants.js';
import * as rules from './rules.js';

export function dangerModal(title, confirmCallback) {

    document.getElementById("danger-modal-title").innerText = title;
    document.getElementById("danger-confirm-button").onclick = confirmCallback


}

export function errorModal(title, message) {

    document.getElementById("error-modal-title").innerText = title;
    document.getElementById("error-modal-message").innerText = message;

    $("#errorModal").modal();
}

export function ruleModal(interfaceNames, table, applyCallback, chain = null) {


    if (chain == null)
        chain = rules.getActiveChain(table);



    loadRuleModal(consts.AddNewRule, table, chain, interfaceNames, null);

    document.getElementById("rule-confirm-button").onclick = applyCallback;


}

function loadRuleModal(title, table, chain, interfaces, applyCallback) {

    let interfacesOptionsHTML = "";

    interfaces.forEach(i => {

        if (!i) return;

        interfacesOptionsHTML +=
            `
        <option value="${i}">${i}</option>
        `
    });

    if (table == "nat")
        table = table.toUpperCase();
    else
        table = table.charAt(0).toUpperCase() + table.substring(1);

    document.getElementById("rule-modal-title").innerText = title;
    document.getElementById("badge-table").innerText = "Table: " + table;
    document.getElementById("badge-chain").innerText = "Chain: " + chain;
    document.getElementById("rule-confirm-button").onclick = applyCallback;

    setInputBehavior("input-interface-rule-menu", "input-interface-rule-check", interfacesOptionsHTML);
    setInputBehavior("output-interface-rule-menu", "output-interface-rule-check", interfacesOptionsHTML);
    setInputBehavior("protocol-rule-menu", "protocol-rule-check");
    setInputBehavior("job-rule-menu", "job-rule-check");
    setInputBehavior("source-rule-text", "source-rule-check");
    setInputBehavior("destination-rule-text", "destination-rule-check");


}

function setInputBehavior(inputName, inputCheckName, innerHTML) {
    let input = document.getElementById(inputName);
    if (innerHTML)
        input.innerHTML = innerHTML;

    input.onmouseup = () => document.getElementById(inputCheckName).checked = true;
}

export function cancelRuleModal() {
    let modal = document.getElementById("ruleModal");

    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('style', 'display: none');
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

export function tableMessage(table, message) {

    let msg = document.getElementById(table + "-message");

    msg.innerHTML = `<strong>${message}</strong>`;

}

export function hideTableMessage(table) {

    let msg = document.getElementById(table + "-message");

    if (msg != null)
        msg.innerHTML = "";
}