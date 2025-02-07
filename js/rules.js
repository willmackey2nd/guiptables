import * as operations from './operations.js'
import * as widgets from './widgets.js'
import * as consts from './constants.js'
import * as config from './config.js'
import RuleData from './model/RuleData.js';
import RuleRecord from './model/RuleRecord.js';
import FilterRuleRecord from './model/FilterRuleRecord.js';
import Chain from './model/Chain.js';
import Table from './model/Table.js';

let activeChains = {"filter" : "Show all", "nat": "Show all"};
let dynChainsList = {};


export let jsonData ;
for(let key in consts.chainsList)
    dynChainsList[key] = new Set(consts.chainsList[key]);

export function getActiveChain(table){
    return activeChains[table];
}


export function setActiveChain(table, chain){
    activeChains[table] = chain;
}


// Import from iptables-save file format
export async function importRules() {
    
    let path = '/data/rules.save';
    
    // create list object named tables, in which each table contains a list of chains
    let tables = [];
    let fileContent = '';
    // load iptables save file
    //console.log('Reading file: ' + path);
    await cockpit.file(path).read()
        .then((content) => fileContent = content)
        .catch((error) => {
            console.log('Error reading file: ' + error);
        }); 
    //console.log('File content: ' + fileContent);
        
    let lines = fileContent.split('\n');
    let rule;
    let ruleString;
    let currentTable;
    let currentChain;
    let ruleIndex = 1;
    for (let i = 0; i < lines.length; i++) {
        rule = lines[i].split(' ');
        ruleString = lines[i]; 
        
        // If line starts with asterisk, it's a table name. Extract the table name by getting everything after asterisk
        //if (rule[0] == '*nat' || rule[0] == '*filter') {
        if (rule[0].startsWith('*')) {
            let newTableName = rule[0].substring(1);
            // add table to tables list if it doesn't exists
            if (!tables.some(table => table.name == newTableName)) {
                let newTable = new Table();
                newTable.name = newTableName;
                newTable.chains = [];
                tables.push(newTable);
                currentTable = tables.find(table => table.name == newTable.name);
            }
        }

        


        if (rule[0] == '-A' || rule[0] == '-I') {
            let record = new FilterRuleRecord();
            record.table = currentTable.name;
            record.chain = rule[1];
            // Check if tables contains Chain object that has Chain.name equal to record.chain, add if not 

            if (!currentTable.chains.some(chain => chain.name == record.chain)) {
                let chain = new Chain();
                chain.name = record.chain;
                chain.rules = [];
                currentTable.chains.push(chain);
                ruleIndex = 1; // reset rule index when new chain is added
                currentChain = currentTable.chains.find(chain => chain.name == record.chain);
            }
    
            record.index = ruleIndex;
            ruleIndex++;

            await findArgs(ruleString, rule, ['-i', '--in-interface']).then(value => {
                record.inputInterface = value;
                }),
            await findArgs(ruleString, rule, ['-o', '--out-interface']).then(value => {
                record.outputInterface = value;
            }),
            await findArgs(ruleString, rule, ['-s', '--source', '--src-range']).then(value => {
                record.source = value;
            }),
            await findArgs(ruleString, rule, ['-d', '--destination', '--dst-range']).then(value => {
                record.destination = value;
            }),
            await findArgs(ruleString, rule, ['--to-source']).then(value => {
                record.toSource = value;
            }),
            await findArgs(ruleString, rule, ['--to-destination']).then(value => {
                record.toDestination = value;
            }),
            await findArgs(ruleString, rule, ['--src-type']).then(value => {
                record.sourceType = value;
            }),
            await findArgs(ruleString, rule, ['--dst-type']).then(value => {
                record.destinationType = value;
            }),
            await findArgs(ruleString, rule, ['--dport', '--destination-port']).then(value => {
                record.destinationPort = value;
                if (record.destinationPort) record.destinationPort = record.destinationPort.replace(/:/g, '-');
            }),
            await findArgs(ruleString, rule, ['--sport', '--source-port']).then(value => {
                record.sourcePort = value;
                if (record.sourcePort) record.sourcePort = record.sourcePort.replace(/:/g, '-');
            }),
            await findArgs(ruleString, rule, ['--ctstate', '--state']).then(value => {
                record.state = value;
            }),
            await findArgs(ruleString, rule, ['-p', '--protocol']).then(value => {
                record.protocol = value;
            }),
            await findArgs(ruleString, rule, ['-j', '--jump']).then(value => {
                record.action = value;
            })
            

            currentChain.rules.push(record);
        }
    }


    exportRules(tables);
    return tables;

}

function findArgs(ruleString, ruleStringArray, args) {
    return new Promise((resolve, reject) => {
        args.forEach(arg => {
            if (ruleString.includes(arg + ' ')) {
                //console.log('found arg: ' + arg);
                //console.log('found arg value: ' + ruleStringArray[ruleStringArray.indexOf(arg) + 1]);

                // Check if previous arg is an exclamation character, if so, add it to the value
                if (ruleStringArray[ruleStringArray.indexOf(arg) - 1] == '!') {
                    resolve('!' + ruleStringArray[ruleStringArray.indexOf(arg) + 1]);
                } else {
                    resolve(ruleStringArray[ruleStringArray.indexOf(arg) + 1]);
                }
            }
        });
        resolve(null);
    });
}

// function that parses rule json back to iptables-save format
export async function exportRules(ruleJson) {
    let path = '/data/rule-export-test.save';
    let tables = ruleJson;

    //console.log("Exporting rules: " + JSON.stringify(tables));
    let content = '';
    tables.forEach(table => {
        content += '*' + table.name + '\n';
        table.chains.forEach(chain => {
            chain.rules.forEach(rule => {
                content += '-A ' + chain.name + ' ';

                if (rule.inputInterface) content += buildIptablesOptions(rule.inputInterface, '--in-interface')
               
                if (rule.outputInterface) content += buildIptablesOptions(rule.outputInterface, '--out-interface');

                if (rule.protocol) content += buildIptablesOptions(rule.protocol, '--protocol');

                if (rule.source) {
                    if (rule.source.includes('-')) {
                        content += buildIptablesOptions(rule.source, '-m iprange --src-range');
                    } else {
                        content += buildIptablesOptions(rule.source, '--source');
                    }
                }
                if (rule.destination) {
                    if (rule.destination.includes('-')) {
                        content += buildIptablesOptions(rule.destination, '-m iprange --dst-range');
                    } else {
                        content += buildIptablesOptions(rule.destination, '--destination');
                    }
                }

                if (rule.sourceType) content += buildIptablesOptions(rule.sourceType, '-m addrtype --src-type');
                if (rule.destinationType) content += buildIptablesOptions(rule.destinationType, '-m addrtype --dst-type');
                
                if (rule.sourcePort) content += buildIptablesOptions(rule.sourcePort, '--sport');
                if (rule.destinationPort) content += buildIptablesOptions(rule.destinationPort, '--dport');

                if (rule.state) content += buildIptablesOptions(rule.state, '-m conntrack --ctstate');
                
                // Action (jump)
                content += '--jump ' + rule.action + ' ';

                // SNAT / DNAT
                if (rule.toSource) content += buildIptablesOptions(rule.toSource, '--to-source');
                if (rule.toDestination) content += buildIptablesOptions(rule.toDestination, '--to-destination');
                content += '\n';
            });
        });
        content += 'COMMIT\n';
    });

    cockpit.file(path).replace(content)
        .then(() => {
            console.log('File saved');
        })
        .catch((error) => {
            console.log('Error saving file: ' + error);
        });
}

function buildIptablesOptions(optionValue, optionFlag) {
    // Handle negation of option
    if (optionValue.charAt(0) == '!') {
        return '! ' + optionFlag + ' ' + optionValue.substring(1) + ' ';
    } else {
        return optionFlag + ' ' + optionValue + ' ';
    }
}



/**Runs 'iptables -t [table] -L -v' and fills the HTML table with the response
 * With this command is possible to fetch general info of the 
 * rules set on each iptables layer.
 */
export async function addRulesInTable() {
    jsonData = await importRules();
    fillTableWithRules('filter', jsonData);
    fillTableWithRules('nat', jsonData);

    //let prom1 = loadTableRules(consts.nat);
    //let prom2 = loadTableRules(consts.filter);
    //return Promise.all([prom1, prom2]);
}


// parse rule json (check iptables_json.json) generated by importRules() and create rules in the UI
function fillTableWithRules(tableName, rulesJson, chainName) {
    // json format is [ {"name": "nat", "chains": [{"name": "PREROUTING","rules": [{}]}]}]
    // go through all root list elements with name matching table
    let tableJson = rulesJson.find(t => t.name == tableName);

    if (chainName == consts.showAll)
        chainName = null;
    
    //Access the HTML tag
    let tableRow = document.getElementById(tableName + "-rules-table");

    // go through all chains in the table
    tableJson.chains.forEach(chain => {

        // Optional chain name filter
        if (chainName && chain.name != chainName) return;
               
        // go through all rules in the chain
        chain.rules.forEach(rule => {
            let cols = ""; 
            //Create the row tag itself
            let tr = document.createElement("tr");
            tr.className = operations.buildIdOrClassName('row', tableName, 'ketju')
            cols += `<td></td>`; // reserve for add button
            cols += `<td>${formatColumn(rule.index)}</td>`;
            cols += `<td>${formatColumn(rule.chain)}</td>`;
            cols += `<td>${formatColumn(rule.action)}</td>`;
            cols += `<td>${formatColumn(rule.inputInterface)}</td>`;
            cols += `<td>${formatColumn(rule.outputInterface)}</td>`;
            cols += `<td>${formatColumn(rule.protocol)}</td>`;
            cols += `<td>${formatColumn(rule.source + ':' + rule.sourcePort)}</td>`;
            cols += `<td>${formatColumn(rule.destination + ':'+ rule.destinationPort)}</td>`;
            cols += `<td>${formatColumn(rule.protocolOptions)}</td>`;
            //Insert the content of the columns into the row
            tr.innerHTML = `<tr>${cols}</tr>`

            //Add the edit button
            tr.appendChild(createEditButton(tableName, rule.chain, rule.index));

            //Insert the row into the HTML
            tableRow.appendChild(tr);
        });
    });
    
}


/**Runs 'iptables -t [table] -F' which deletes all table rows then
 * reloads the table HTML.
 */
export function flushTable(table) {
    operations.flush(table, () => reloadTableRules(table));
}

function loadTableRules(table, chainFilter) {
    if (chainFilter == consts.showAll)
        chainFilter = null;

    return cockpit.spawn(["iptables", "-t", table, "-n", "-L", "-v"], { superuser: "required" })
        .then(res => processResponse(res, table, chainFilter))
        .catch(err => widgets.errorMessage("load " + table + " table"));

}

export function reloadTableRules(table, chainFilter) {

    //Destroying rules
    let rules = document.getElementById(table + "-rules-table");

    console.log("RELOADING TABLE: " + table);

    let children = rules.childNodes;

    for (let i = children.length - 1; i >= 0; i--)
        children[i].remove();

    fillTableWithRules(table, jsonData, chainFilter);
    //loadTableRules(table, chainFilter);
    
}



export function applyRuleCallback(table, chain = null, ruleBelow = null) {
    console.log("WRONG CALLBACK");
    if(chain == null)
        chain = getActiveChain(table);

    let record = new RuleRecord();

    record.chain = chain;
    record.table = table;
    record.ruleBelow = ruleBelow;

    let checkBox = document.getElementById("input-interface-rule-check");
    if (checkBox.checked)
        record.inputInterface = document.getElementById("input-interface-rule-menu").value;


    checkBox = document.getElementById("output-interface-rule-check");
    if (checkBox.checked)
        record.outputInterface = document.getElementById("output-interface-rule-menu").value;

    checkBox = document.getElementById("protocol-rule-check");
    if (checkBox.checked) {
        record.protocol = document.getElementById("protocol-rule-menu").value;
        record.protocolOptions = document.getElementById("protocol-rule-opts-text").value;
    }
    checkBox = document.getElementById("source-rule-check");
    if (checkBox.checked)
        record.source = document.getElementById("source-rule-text").value;

    checkBox = document.getElementById("destination-rule-check");
    if (checkBox.checked)
        record.destination = document.getElementById("destination-rule-text").value;

    checkBox = document.getElementById("job-rule-check");
    if (checkBox.checked)
        record.action = document.getElementById("job-rule-menu").value;

    let settings = config.getConfiguration();
    operations.applyRule(record, 
        () => reloadTableRules(table, getActiveChain(table)),
        settings.autoSave ? settings.savePath : null)
}



export function applyFilterRuleCallback(table, chain, index) {
    console.log("APPLY FILTER RULE CALLBACK");

    if(chain == null)
        chain = getActiveChain(table);
    
    let record = new FilterRuleRecord();

    record.chain = chain;
    record.table = table;
    record.index = index;

    let value;

    value = document.getElementById("input-interface-rule-menu").value;
    record.inputInterface = (value == consts.any) ? null : value;

    value = document.getElementById("output-interface-rule-menu").value;
    record.inputInterface = (value == consts.any) ? null : value;

    value = document.getElementById("protocol-rule-menu").value;
    record.protocol = (value == consts.any) ? null : value;

    value = document.getElementById("protocol-rule-opts-text").value;
    record.protocolOptions = (value == consts.any) ? null : value;

    value = document.getElementById("source-ip-text").value;
    record.source = (value == consts.any) ? null : value;

    value = document.getElementById("source-port-text").value;
    record.sourcePort = (value == consts.any) ? null : value;

    value = document.getElementById("destination-ip-text").value;
    record.destination = (value == consts.any) ? null : value;

    value = document.getElementById("destination-port-text").value;
    record.destinationPort = (value == consts.any) ? null : value;

    value = document.getElementById("job-rule-menu").value;
    record.action = (value == consts.any) ? null : value;

    
    if (index == null) {
        // add new record to jsonData
        record.index = jsonData.find(t => t.name == table).chains.find(c => c.name == chain).rules.length + 1;
        jsonData.find(t => t.name == table).chains.find(c => c.name == chain).rules.push(record);
    } else {
        // update record in jsonData
        jsonData.find(t => t.name == table).chains.find(c => c.name == chain).rules[index-1] = record;
    }

    reloadTableRules(table, getActiveChain(table));
    
}

function splitChainName(element) {
    return element.split(" ")[1];
}

function processResponse(data, table, chainFilter) {

    let text = data.split("\n");

    let hasContent = false;

    let i = 0;

    let chainName;

    //Setting rows
    text.forEach(element => {

        if (element.startsWith("Chain")) {
            chainName = splitChainName(element);
            dynChainsList[table].add(chainName);
            return;
        }

        if (chainFilter && chainName != chainFilter)
            return;

        if (element.startsWith(" pkts"))
            return;

        if (!element)
            return;

        hasContent = true;

        splitRowAndSetRule(element, table, chainName, i + 1)
        

        i++;


    });

    if (!hasContent) {
        fillEmptyTable(table)
    }

}   


export function setChainMenu(table) {
    let menu = document.getElementById(table + "-chain-menu");
    menu.innerHTML = "";

    let chains = dynChainsList[table];
    chains.forEach(c => {
        menu.innerHTML +=
            `
        <option value="${c}">${c}</option>
        `
    });
}




function splitRowAndSetRule(rule, table, chainName, ruleNumber) {

    // A row with rules becomes an array
    let text = rule.trim().split(/[ ,]+/);

    text = checkMissingColumns(text);

    //Access the HTML tag
    let tableRow = document.getElementById(table + "-rules-table");

    //Initialize the row with the first column, the rule number
    let cols = `<td>${ruleNumber}</td>`;

    let i = 0;

    let destination = ""

    //Create the columns of a row
    text.forEach(element => {

        // Constructing the 'Destination' column which sometimes consists 
        // of multiple words and may have been split into fragments
        if (i >= 8) {
            destination += formatColumn(element);
            destination += "      ";
        }

        else {
            //Inserting a column
            cols +=
                `
                <td>
                    ${formatColumn(element)}
                </td>
            `;
        }

        i++;

        //Inserting the Chain column
        if (i == 2) {
            cols +=
                `
                <td>
                    ${chainName}
                </td>
            `;
        }


    });

    //Add the 'Destination' column at the end
    cols += `<td>${destination}</td>`


    //Create the row tag itself
    let tr = document.createElement("tr");

    tr.className = operations.buildIdOrClassName('row', table, chainName)


    //Insert the content of the columns into the row
    tr.innerHTML =

        `
            <tr>
                ${cols}
            </tr>
        `

    //Add the insert button
    tr.insertBefore(createAddButton(table, chainName, ruleNumber), tr.firstChild);
    
    //Add the edit button
    tr.appendChild(createEditButton(table, chainName, ruleNumber));

    //Add the delete button
    tr.appendChild(createDeleteButton(table, chainName, ruleNumber));

    //Insert the row into the HTML
    tableRow.appendChild(tr);
}

function createAddButton(table, chainName, ruleNumber) {
   
    let td = document.createElement("td");
    td.id = operations.buildIdOrClassName('add', table, chainName, ruleNumber);

    let icon = document.createElement("i");
    
    let span = document.createElement("span");
    span.innerHTML = "&nbsp;Add rule";
    span.className = "plus-btn";
    icon.appendChild(span);

    if(activeChains[table] == consts.showAll){
        icon.className = "fa fa-plus-circle grey-plus";
        td.appendChild(icon);
        
        icon.onclick = () =>{
            widgets.tableMessage(table, consts.selectChainMsg);
        };
         
        return td;
    }
    
    
    icon.className = "fa fa-plus-circle";

    let dataToogle = document.createAttribute("data-toggle");
    dataToogle.value = "modal";


    let dataTarget = document.createAttribute("data-target");
    dataTarget.value = "#ruleModal";

    icon.setAttributeNode(dataToogle);
    icon.setAttributeNode(dataTarget);

    icon.addEventListener("click", () =>

        widgets.ruleModal(operations.getInterfaceNames(),
         table, 
         () => applyFilterRuleCallback(table, chainName, ruleNumber),
         chainName,
         ruleNumber)
    );

    td.appendChild(icon);

    return td;

}



function createDeleteButton(table, chainName, ruleNumber) {

    let td = document.createElement("td");
    td.id = operations.buildIdOrClassName('delete', table, chainName, ruleNumber);;

    let icon = document.createElement("i");
    icon.className = "fa fa-trash fa-trash-red";


    let dataToogle = document.createAttribute("data-toggle");
    dataToogle.value = "modal";


    let dataTarget = document.createAttribute("data-target");
    dataTarget.value = "#dangerModal";

    icon.setAttributeNode(dataToogle);
    icon.setAttributeNode(dataTarget);

    icon.addEventListener("click", () =>
        widgets.dangerModal(consts.DeleteRule, () => deleteButtonListener(td.id, chainName)));

    td.appendChild(icon);

    return td;
}


function createEditButton(table, chainName, ruleNumber) {
 
    let td = document.createElement("td");
    td.id = operations.buildIdOrClassName('edit', table, chainName, ruleNumber);;

    let icon = document.createElement("i");
    icon.className = "fa fa-edit";


    let dataToogle = document.createAttribute("data-toggle");
    dataToogle.value = "modal";


    let dataTarget = document.createAttribute("data-target");
    if (table == consts.filter) {
        dataTarget.value = "#filterRuleModal";
        console.log("Target modal is filterRuleModal");
    } else {
        dataTarget.value = "#ruleModal";
        console.log("Target modal is ruleModal");
    }

    icon.setAttributeNode(dataToogle);
    icon.setAttributeNode(dataTarget);

    icon.addEventListener("click", () =>

        widgets.ruleEditModal(operations.getInterfaceNames(),
         table, 
         () => applyFilterRuleCallback(table, chainName, ruleNumber),
         chainName,
         ruleNumber)
    );

    td.appendChild(icon);

    return td;
}

/**Intended to execute when user clicks on a trash can icon */
function deleteButtonListener(id, chainName) {

    console.log ("ID: " + id);

    let rule = extractRuleFromId(id);


    console.log("RULE: " + rule.ruleTable + " " + rule.ruleChain + " " + rule.ruleNumber);

    operations.deleteRule(rule);
    reloadTableRules(rule.ruleTable, chainName);
}


function extractRuleFromId(id) {

    let rule = new RuleData();

    let data = id.split(consts.idSeparator);

    rule.ruleTable = data[1];
    rule.ruleChain = data[2];
    rule.ruleNumber = data[3];
    rule.ruleIndexInChain = operations.getRuleIndex(rule.ruleTable, rule.ruleChain, rule.ruleNumber);
    console.log("AAAAAAA: " + rule.ruleTable + " " + rule.ruleChain + " " + rule.ruleNumber + " " + rule.ruleIndexInChain);
    return rule;
}

function checkMissingColumns(arr) {


    ///
    ///Checking if target is missing
    let copy = arr.slice(0, 3);

    if (copy[2] == consts.all || copy[2] == consts.tcp 
        || copy[2] == consts.udp || copy[2] == consts.icmp)
        arr.splice(2, 0, "--");

    ///
    ///

    return arr;

}

function formatColumn(element) {
    // print the type of element variable
    //console.log("ELEMENT: " + element + "type: " + typeof element);
    

    if (element == "*" || !element || (typeof element === "string" && element.includes("null")))
        return consts.any

    if (element == consts.zeroAddr)
        return consts.anywhere;

    return element;

}

function fillEmptyTable(table) {

    //Access the HTML tag
    let tableRow = document.getElementById(table + "-rules-table");

    let tr = document.createElement("tr");

    //Insert the content of the columns into the row
    tr.innerHTML =

        `
            <tr>
               <td colspan="13">No active rules</td>
            </tr>
        `

    tableRow.appendChild(tr);

}