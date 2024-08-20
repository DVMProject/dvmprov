/*****************************************************************************
 * 
 * Cookie Functions & Variables
 * 
 *****************************************************************************/

var config = {
    lastPage: null
}

function loadConfig() {
    if (!localStorage.getItem("config")) {
        console.warn("No local storage settings found, using defaults");
        localStorage.setItem("config", JSON.stringify(config));
    } else {
        config = JSON.parse(localStorage.getItem("config"));
        console.log("Loaded save config");
    }
}

function saveConfig() {
    localStorage.setItem("config", JSON.stringify(config));
    console.log("Saved config");
}

function clearConfig() {
    localStorage.clear();
    console.warn("Removed all local storage settings");
}

/*****************************************************************************
 * 
 * Global Variables/Constants
 * 
 *****************************************************************************/

const spinnerSmall = document.getElementById("spinner-small");

/*****************************************************************************
 * 
 * Global Functions
 * 
 *****************************************************************************/

function enableTooltips() {
    $('[data-toggle="tooltip"]').tooltip({
        trigger: 'hover'
    });
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
}

function updateVersion(status) {
    $.ajax({
        type: "GET",
        dataType: "json",
        url: "rest/version",
        contentType: "application/json",
        success: function (data) {
            console.log(`Got new FNE version: ${data.version}`)
            $("#fneConnStatus").html(`<code>Connected to ${data.version}</code>`);
            $("#statusSpinner").hide();
        }
    })
}

function filterTable(element) {
    // Get currentl filter value
    const filterVal = $(element).val().toLowerCase();
    // Get table to filter
    const filterTable = $(element).data('filter-table');
    // Check if array
    if (Array.isArray(filterTable)) {
        filterTable.forEach(table => {
            $(table).find("tbody>tr").filter(function () {
                $(this).toggle($(this).text().toLowerCase().indexOf(filterVal) > -1);
            });
        });
    } else {
        // Filter single table rows
        $(filterTable).find("tbody>tr").filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(filterVal) > -1);
        });
    }
}

/*****************************************************************************
 * 
 * Sidebar Navigation Buttons
 * 
 *****************************************************************************/

function page(obj) {
    // Remove active from the side navbar items
    $("#nav-side .nav-link").removeClass("active");
    // Hide all other pages and show the selected page
    $(".page").addClass("d-none").promise().done(function() {
        if (obj.dataset.page) {
            $(`#${obj.dataset.page}`).removeClass("d-none");
        }
    });
    // Make the current button active and hide the tooltip
    $(obj).addClass("active");
    $(obj).tooltip('hide');
    // Set the last page to this one
    config.lastPage = obj.dataset.page;
    saveConfig();
}

function loadLastPage(lastPage) {
    if (!lastPage)
    {
        // We show RID page by default
        $("#pageHome").show();
        return;
    }
    // Remove active from the side navbar items
    $("#nav-side .nav-link").removeClass("active");
    // Hide all other pages and show the selected page
    $(".page").addClass("d-none").promise().done(function() {
        if (lastPage) {
            $(`#${lastPage}`).removeClass("d-none");
        }
    });
    $("#nav-side").find(`[data-page="${lastPage}"]`).addClass("active").tooltip("hide");
}

/*****************************************************************************
 * 
 * Table Sorting Functions
 * https://stackoverflow.com/a/19947532/1842613
 * 
 *****************************************************************************/

function clearSort(table) {
    // Remove the sort property
    table.find('th').attr({
        "data-sort": "none"
    });
    // Reset sort
    table.find('th i').removeClass().addClass("iconoir-sort unsorted");
}

function clickSort(header) {
    // Get the table
    var table = $(header).parents('table').eq(0);
    // Set sort mode
    if (header.dataset.sort == "asc") {
        clearSort(table);
        header.dataset.sort = "desc";
    }
    else {
        clearSort(table);
        header.dataset.sort = "asc";
    }
    // Sort
    sortTable(table, header);
}

function sortTable(table, header) {
    // Sort rows
    var rows = $(table).find('tr:gt(0)').toArray().sort(comparer($(header).index()))

    // Set sort icon
    if (header.dataset.sort == "asc") {
        $(header).find("i").removeClass("iconoir-sort unsorted").addClass("iconoir-sort-up");
    }
    else {
        $(header).find("i").removeClass("iconoir-sort unsorted").addClass("iconoir-sort-down");
    }
    
    // Reorder depending on mode
    if (header.dataset.sort == "desc") {
        rows = rows.reverse()
    }

    // Add the new rows
    for (var i = 0; i < rows.length; i++) {
        table.append(rows[i])
    }
}

function comparer(index) {
    return function(a, b) {
        var valA = getCellValue(a, index), valB = getCellValue(b, index);
        return $.isNumeric(valA) && $.isNumeric(valB) ? valA - valB : valA.toString().localeCompare(valB);
    }
}

function getCellValue(row, index) {
    return $(row).children('td').eq(index).html();
}

/*****************************************************************************
 * 
 * RID Management Page Functions
 * 
 *****************************************************************************/

const ridTable = $("#ut-body");
const ridRowTemplate = $("#utr-template");

// Add a return key listener to the add RID modal that opens a new blank form on submit
$(function() {
    $("#modalRidAdd .modal-content").keypress(function(e) {
        if (e.which == 13) {
            addRidForm(true);
        }
    })
});

// Focus on the RID input when shown
$('#modalRidAdd').on('shown.bs.modal', () => {
    $("#addRidFormRID").focus();
});

// Add table row for RID
function addRidToTable(rid, enabled, alias) {
    const newRow = $(ridRowTemplate.html());
    newRow.find('.ut-rid').html(rid);
    newRow.find('.ut-alias').html(alias);
    //tds[1].textContent = callsign;
    //tds[2].textContent = operator;
    if (enabled)
    {
        newRow.find('.ut-enabled').html('<i class="iconoir-check-circle-solid"></i>');
        newRow.find('.ut-enabled').addClass('text-success');
    }
    else
    {
        newRow.find('.ut-enabled').html('<i class="iconoir-xmark-circle-solid"></i>');
        newRow.find('.ut-enabled').addClass('text-danger');
    }

    ridRowTemplate.before(newRow);
}

var ridUpdating = false;

function updateRidTable() {
    // Check flag so we don't double-dip
    if (ridUpdating) {return}
    ridUpdating = true;
    // Clear table
    $("#ut-body tr").remove();
    // Show loading spinner
    $("#ridSpinnerTable").show();
    // Query
    $.ajax({
        type: "GET",
        url: "rest/rid/query",
        contentType: "application/json",
        success: function (data) {
            if (data.status != 200) {
                console.error("Error updating RID table:")
                console.error(data);
            }
            else {
                console.log("Got new rid data")
                data.rids.forEach(entry => {
                    addRidToTable(entry.id, entry.enabled, entry.alias);
                });
                // Hide the loading spinner
                $("#ridSpinnerTable").hide();
                // Sort
                const table = $("#ut");
                const header = document.querySelectorAll("#ut th")[0];
                sortTable(table, header);
            }
            // Done
            setTimeout(() => {ridUpdating = false;}, 250);
            // Enable the tooltips on the buttons
            enableTooltips();
        }
    })
}

/**
 * Checks if the given RID is present in the RID table
 * @param {int} rid radio ID to check
 * @returns true if the RID is in the table
 */
function checkIfRIDExists(rid) {
    if ( $(`#ut-body tr > td:contains(${rid})`).length > 0 )
    {
        return true
    }
    else
    {
        return false
    }
}

function clearRidForm() {
    // Blank the values
    $("#addRidFormRID").val("");
    $("#addRidFormAlias").val("");
    $("#addRidFormEnabled").prop("checked", false);
    // Reset invalid classes
    $("#addRidFormRID").removeClass("is-invalid");
    $("#addRidFormAlias").removeClass("is-invalid");
    // Reset valid classes
    $("#addRidFormRID").removeClass("is-valid");
    $("#addRidFormAlias").removeClass("is-valid");
    // Enable the RID if disabled
    $("#addRidFormRID").prop("disabled", false);
}

/**
 * Called on success of RID form, shows valid data and closes form
 * @param {bool} newForm whether to open a new form
 */
function ridFormSuccess(newForm) {
    // Clear any invalids
    $("#addRidFormRID").removeClass("is-invalid");
    $("#addRidFormAlias").removeClass("is-invalid");
    // Make everything valid
    $("#addRidFormRID").addClass("is-valid");
    $("#addRidFormAlias").addClass("is-valid");
    setTimeout(() => {
        updateRidTable();
        $("#modalRidAdd").modal('hide');
        clearRidForm();
    }, 300);
    if (newForm) {
        setTimeout(() => {
            console.debug("Displaying new form");
            $("#modalRidAdd").modal('show');
        }, 800);
    }
}

/**
 * Submit the new RID data from the form
 * @param {bool} newForm Whether to open a new form on success of the current one
 */
function addRidForm(newForm) {
    // Get values from form
    const newRID = parseInt($("#addRidFormRID").val());
    const newAlias = $("#addRidFormAlias").val();
    const enabled = $("#addRidFormEnabled").prop("checked");

    postData = {
        rid: newRID,
        alias: newAlias,
        enabled: enabled,
    }

    // Send the data and verify success
    $.ajax({
        type: "PUT",
        url: "rest/rid/add",
        contentType: "application/json",
        data: JSON.stringify(postData),
        success: function (data) {
            if (data.status == 200) {
                console.log(`Successfully added RID ${newRID}`);
                ridCommit();
                ridFormSuccess(newForm);
            } else {
                console.error(`Failed to add RID ${newRID}: ${data.message}`);
                alert(`Failed to add TG ${newRID}: ${data.message}`);
            }
        },
        error: function(xhr, textStatus, thrownError) {
            console.error(`Failed to add RID ${newRID}: ${thrownError}`);
            alert(`Failed to add TG ${newRID}: ${thrownError}`);
        }
    });
    
}

function ridPromptEdit(element) {
    // Get the parameters from the table
    const editRid = $(element).closest("tr").find(".ut-rid").text();
    const editAlias = $(element).closest("tr").find(".ut-alias").text();
    const editEnabled = (($(element).closest("tr").find(".ut-enabled").html().includes("iconoir-check-circle-solid")) ? true : false);
    // Populate the edit modal
    $("#addRidFormRID").val(editRid);
    $("#addRidFormAlias").val(editAlias);
    $("#addRidFormEnabled").prop("checked", editEnabled);
    // Disable RID edit
    $("#addRidFormRID").prop("disabled", true);
    // Show
    $("#modalRidAdd").modal('show');
}

function ridPromptDelete(element) {
    const delRid = $(element).closest("tr").find(".ut-rid").text();
    const delAlias = $(element).closest("tr").find(".ut-alias").text();
    console.log(`Prompting delete for RID ${delRid} (${delAlias})`);
    // Update the delete modal text
    $("#modalRidDelete").find(".modal-body").html(`Delete RID ${delRid} (${delAlias})?`);
    // Update the delete function onclick
    $("#modalRidDelete").find(".btn-danger").off('click').on('click', () => {
        deleteRid(delRid);
    });

    // Show the modal
    $("#modalRidDelete").modal('show');
}

function cancelRidDelete() {
    $("#modalRidDelete").find(".modal-body").html('');
    // Remove the onclicks
    $("#modalRidDelete").find(".btn-danger").off('click');
}

/**
 * Delete the specified RID from the table
 * @param {int} delRid RID to delete
 */
function deleteRid(delRid) {
    const rid = parseInt(delRid);
    if (isNaN(rid)) {
        console.error("RID to delete is NaN: " + delRid);
        return;
    }
    $.ajax({
        type: "PUT",
        url: "rest/rid/delete",
        contentType: "application/json",
        data: JSON.stringify({rid: rid}),
        success: function (data) {
            if (data.status == 200) {
                console.log(`Successfully deleted RID ${delRid}`);
                $("#modalRidDelete").modal('hide');
                ridCommit();
            } else {
                console.error(`Failed to delete RID ${delRid}: ${data.message}`);
                alert(`Failed to delete RID ${delRid}: ${data.message}`);
            }
        },
        error: function(xhr, textStatus, thrownError) {
            console.error(`Failed to delete RID ${delRid}: ${thrownError}`);
            alert(`Failed to delete RID ${delRid}: ${thrownError}`);
        }
    });
}

function ridCommit() {
    $.ajax({
        type: "GET",
        url: "rest/rid/commit",
        success: function (data) {
            if (data.status == 200) {
                console.log("Commited RIDs succesfully");
                updateRidTable();
            } else {
                console.error(`Failed to commit RIDs: ${data.message}`);
                alert(`Failed to commit RIDs: ${data.message}`);
            }
        },
        error: function (xhr, textStatus, thrownError) {
            console.error(`Failed to commit RIDs: ${thrownError}`);
            alert(`Failed to commit RIDs: ${thrownError}`);
        }
    });
}

function ridExportApxUclModalShow() {
    $("#modalRidExportAPX").modal('show');
}

function ridExportApxUclModalClose() {
    $("#modalRidExportAPX").modal('hide');
    $("#ridExportSystemName").val("");
}

function ridExportApxUclUpdateName() {
    // Get the system name
    const system = $("#ridExportSystemName").val();
    // Set the download link
    $("#ridExportApxUclDownload").attr("href", `/contacts/apxucl?system=${system}`);
}

/*****************************************************************************
 * 
 * TG Management Page Functions
 * 
 *****************************************************************************/

const tgTable = $("#tgt-body");
const tgRowTemplate = $("#tgtr-template");

// Add a return key listener to the add RID modal that opens a new blank form on submit
$(function() {
    $("#modalTgAdd .modal-content").keypress(function(e) {
        if (e.which == 13) {
            addTgForm(true);
        }
    })
});

// Focus on the RID input when shown
$('#modalTgAdd').on('shown.bs.modal', () => {
    $("#addTgFormTGID").focus();
});

// Add table row for TG
function addTgToTable(tgid, slot, name, active, affiliated) {
    const newRow = $(tgRowTemplate.html());
    newRow.find('.tgt-tgid').html(tgid);
    newRow.find('.tgt-slot').html(slot);
    newRow.find('.tgt-name').html(name);
    // Active Checkmark
    if (active)
    {
        newRow.find('.tgt-active').html('<i class="iconoir-check-circle-solid"></i>');
        newRow.find('.tgt-active').addClass('text-success');
    }
    else
    {
        newRow.find('.tgt-active').html('<i class="iconoir-xmark-circle-solid"></i>');
        newRow.find('.tgt-active').addClass('text-danger');
    }
    // Affiliated Checkmark
    if (affiliated)
    {
        newRow.find('.tgt-affiliated').html('<i class="iconoir-check-circle-solid"></i>');
        newRow.find('.tgt-affiliated').addClass('text-primary');
    }
    else
    {
        newRow.find('.tgt-affiliated').html('<i class="iconoir-xmark-circle-solid"></i>');
        newRow.find('.tgt-affiliated').addClass('text-secondary');
    }

    tgRowTemplate.before(newRow);
}

var tgUpdating = false;

function updateTgTable() {
    // Check flag
    if (tgUpdating) { return; }
    tgUpdating = true;
    // Clear table
    $("#tgt-body tr").remove();
    // Show loading spinner
    $("#tgSpinnerTable").show();
    // Query
    $.ajax({
        type: "GET",
        dataType: "json",
        url: "rest/tg/query",
        success: function (data) {
            if (data.status != 200) {
                console.error("Error getting new TGs:");
                console.error(data);
            } else {
                console.log("Got new TG data")
                data.tgs.forEach(entry => {
                    addTgToTable(entry.source.tgid, entry.source.slot, entry.name, entry.config.active, entry.config.affiliated);
                });
                // Hide the loading spinner
                $("#tgSpinnerTable").hide();
                // Sort
                var table = $("#tgt");
                var header = document.querySelectorAll("#tgt th")[0];
                sortTable(table, header);
            }
            // Done
            setTimeout(() => {tgUpdating = false;}, 250);
            // Enable the tooltips on the buttons
            enableTooltips();
        }
    })
}

function getTgInfo(tgid, slot) {
    // Show loading spinner
    $("#tgSpinnerInfo").show();
    // Query list of tgs
    $.ajax({
        type: "GET",
        dataType: "json",
        url: "rest/tg/query",
        success: function (data) {
            data.tgs.forEach(entry => {
                // Find the TGID we're looking for
                if (Number(entry.source.tgid) == Number(tgid) && Number(entry.source.slot) == Number(slot)) {
                    // Populate the tg info box
                    $("#tgInfoBox").html(JSON.stringify(entry, null, 2));
                    // Hide the spinner
                    $("#tgSpinnerInfo").hide();
                } 
            });
        }
    })
}

function clearTgInfo() {
    $("#tgInfoBox").html("");
}

function clearTgForm() {
    // Blank the values
    $("#addTgFormTGID").val("");
    $("#addTgFormName").val("");
    $("#addTgFormSlot").val("");
    $("#addTgFormActive").prop("checked", false);
    $("#addTgFormAffiliated").prop("checked", false);
    $("#addTgFormParrot").prop("checked", false);
    $("#addTgFormExclusions").children("div").remove();
    $("#addTgFormInclusions").children("div").remove();
    $("#addTgFormRewrites").children(".rewriteEntry").remove();
    $("#addTgFormPreferred").children("div").remove();
    $("#addTgFormAlwaysSend").children("div").remove();
    // Reset invalid classes
    $("#addTgFormTGID").removeClass("is-invalid");
    $("#addTgFormName").removeClass("is-invalid");
    $("#addTgFormSlot").removeClass("is-invalid");
    $("#addTgFormActive").removeClass("is-invalid");
    $("#addTgFormAffiliated").removeClass("is-invalid");
    $("#addTgFormParrot").removeClass("is-invalid");
    // Reset valid classes
    $("#addTgFormTGID").removeClass("is-valid");
    $("#addTgFormName").removeClass("is-valid");
    $("#addTgFormSlot").removeClass("is-valid");
    $("#addTgFormActive").removeClass("is-valid");
    $("#addTgFormAffiliated").removeClass("is-valid");
    $("#addTgFormParrot").removeClass("is-valid");
    // Enable the TGID and slot fields if disabled
    $("#addTgFormTGID").prop("disabled", false);
    $("#addTgFormSlot").prop("disabled", false);
}

function tgFormSuccess(newForm) {
    // Clear any invalids
    $("#addTgFormTGID").removeClass("is-invalid");
    $("#addTgFormName").removeClass("is-invalid");
    $("#addTgFormSlot").removeClass("is-invalid");
    $("#addTgFormActive").removeClass("is-invalid");
    $("#addTgFormAffiliated").removeClass("is-invalid");
    $("#addTgFormParrot").removeClass("is-invalid");
    $("#addTgFormExclusions").find(".tgPeerEntry").removeClass("is-invalid");
    $("#addTgFormInclusions").find(".tgPeerEntry").removeClass("is-invalid");
    $("#addTgFormRewrites").find("input").removeClass("is-invalid");
    $("#addTgFormPreferred").find(".tgPeerEntry").removeClass("is-invalid");
    $("#addTgFormAlwaysSend").find(".tgPeerEntry").removeClass("is-invalid");
    // Make everything valid
    $("#addTgFormTGID").addClass("is-valid");
    $("#addTgFormName").addClass("is-valid");
    $("#addTgFormSlot").addClass("is-valid");
    $("#addTgFormActive").addClass("is-valid");
    $("#addTgFormAffiliated").addClass("is-valid");
    $("#addTgFormParrot").addClass("is-valid");
    $("#addTgFormExclusions").find(".tgPeerEntry").addClass("is-valid");
    $("#addTgFormInclusions").find(".tgPeerEntry").addClass("is-valid");
    $("#addTgFormRewrites").find("input").addClass("is-valid");
    $("#addTgFormPreferred").find(".tgPeerEntry").addClass("is-valid");
    $("#addTgFormAlwaysSend").find(".tgPeerEntry").addClass("is-valid");
    // Send the form and clear after a delay
    setTimeout(() => {
        updateTgTable();
        $("#modalTgAdd").modal('hide');
        clearTgForm();
    }, 300);
    if (newForm) {
        setTimeout(() => {
            console.debug("Displaying new form");
            $("#modalTgAdd").modal('show');
        }, 800);
    }
}

function addTgForm(newForm) {
    // Get main values from form
    const tgid = parseInt($("#addTgFormTGID").val());
    const name = $("#addTgFormName").val();
    const slot = parseInt($("#addTgFormSlot").val());
    const active = $("#addTgFormActive").prop("checked");
    const affiliated = $("#addTgFormAffiliated").prop("checked");
    const parrot = $("#addTgFormParrot").prop("checked");

    // Get optional lists
    const excludeEntries = $("#addTgFormExclusions").find(".tgPeerEntry");
    const includeEntries = $("#addTgFormInclusions").find(".tgPeerEntry");
    const rewriteEntries = $("#addTgFormRewrites").find(".rewriteEntry");
    const preferredEntries = $("#addTgFormPreferred").find(".tgPeerEntry");
    const alwaysSendEntries = $("#addTgFormAlwaysSend").find(".tgPeerEntry");
    var excludes = [];
    var includes = [];
    var rewrites = [];
    var preferred = [];
    var always = [];

    // Validation flag
    valid = true;

    // Get the include/exclude peer IDs
    if (excludeEntries.length > 0)
    {
        excludeEntries.each((i, element) => {
            if (!excludes.includes($(element).val())) {
                excludes.push(parseInt($(element).val()));
            }
            else {
                $(element).addClass("is-invalid");
                valid = false;
            }
        });
    }
    if (includeEntries.length > 0)
    {
        includeEntries.each((i, element) => {
            if (!includes.includes($(element).val())) {
                includes.push(parseInt($(element).val()));
            }
            else {
                $(element).addClass("is-invalid");
                valid = false;
            }
        });
    }

    // Get the rewrite rules
    if (rewriteEntries.length > 0)
    {
        rewriteEntries.each((i, element) => {
            // Get rewrite values
            const peer = parseInt($(element).find(".tgRwPeer").val());
            const tgid = parseInt($(element).find(".tgRwTgid").val());
            const slot = parseInt($(element).find(".tgRwSlot").val());
            // Validate
            if (isNaN(peer)) {
                $(element).find(".tgRwPeer").addClass("is-invalid");
                valid = false;
            }
            if (isNaN(tgid)) {
                $(element).find(".tgRwTgid").addClass("is-invalid");
                valid = false;
            }
            if (isNaN(slot)) {
                $(element).find(".tgRwSlot").addClass("is-invalid");
                valid = false;
            }
            // Append to the rewrite list
            rewrites.push({
                peerid: peer,
                tgid: tgid,
                slot: slot
            });
        });
    }

    // Get preferred sites
    if (preferredEntries.length > 0)
    {
        preferredEntries.each((i, element) => {
            if (!preferred.includes($(element).val())) {
                preferred.push(parseInt($(element).val()));
            }
            else {
                $(element).addClass("is-invalid");
                valid = false;
            }
        });
    }

    // Get always send sites
    if (alwaysSendEntries.length > 0)
    {
        alwaysSendEntries.each((i, element) => {
            if (!always.includes($(element).val())) {
                always.push(parseInt($(element).val()));
            }
            else {
                $(element).addClass("is-invalid");
                valid = false;
            }
        });
    }
        
    // Validate TGID
    if (isNaN(tgid)) {
        $("#addTgFormTgid").addClass("is-invalid");
        valid = false;
    }

    // Validate the timeslot (1 or 2)
    if (slot > 2 || slot < 1) {
        $("#addTgFormSlot").addClass("is-invalid");
        valid = false;
    }

    // If we had any invalid data, stop
    if (!valid) {
        return;
    }

    postData = {
        name: name,
        config: {
            active: active,
            affiliated: affiliated,
            parrot: parrot,
            inclusion: includes,
            exclusion: excludes,
            rewrite: rewrites,
            preferred: preferred,
            always: always
        },
        source: {
            tgid: tgid,
            slot: slot
        }
    }

    $.ajax({
        type: "PUT",
        url: "rest/tg/add",
        contentType: "application/json",
        data: JSON.stringify(postData),
        success: function (data) {
            if (data.status == 200) {
                console.log(`Successfully added TG ${tgid}`);
                tgCommit();
                tgFormSuccess(newForm);
            } else {
                console.error(`Failed to add TG ${tgid}: ${data.message}`);
                alert(`Failed to add TG ${tgid}: ${data.message}`);
            }
        },
        error: function(xhr, textStatus, thrownError) {
            console.error(`Failed to add TG ${tgid}: ${thrownError}`);
            console.error(xhr);
            console.error(textStatus);
            console.error(thrownError);
            alert(`Failed to add TG ${tgid}`);
        }
    });
}

function addTgPeerEntry(element, peerId)
{
    const peerTemplate = $($("#peerItemTemplate").html());
    peerTemplate.find(".tgPeerEntry").prop("placeholder", peerId);
    $(element).after(peerTemplate);
}

function addRewriteRule()
{
    const rwTemplate = $($("#rewriteItemTemplate").html());
    $("#addTgFormAddRewrite").after(rwTemplate);
}

/**
 * Delete a generic row element from a list
 * @param {element} element 
 */
function delEntry(element)
{
    $(element).closest(".row").remove();
}

function tgPromptEdit(element) {
    // Get the parameters from the table
    const editTgid = parseInt($(element).closest("tr").find(".tgt-tgid").text());
    const editSlot = parseInt($(element).closest("tr").find(".tgt-slot").text());
    // Find the talkgroup in the list of TGs
    $.ajax({
        type: "GET",
        dataType: "json",
        url: "rest/tg/query",
        success: function (data) {
            console.log("Got new TG data")
            data.tgs.forEach(entry => {
                if (entry.source.tgid == editTgid && entry.source.slot == editSlot) {
                    console.log("Found match");
                    console.log(entry);
                    // Populate the normal fields
                    $("#addTgFormTGID").val(editTgid);
                    $("#addTgFormSlot").val(editSlot);
                    $("#addTgFormName").val(entry.name);
                    $("#addTgFormActive").prop("checked", entry.config.active);
                    $("#addTgFormAffiliated").prop("checked", entry.config.affiliated);
                    $("#addTgFormParrot").prop("checked", entry.config.parrot);
                    // Add the inclusions & exclusions
                    entry.config.exclusion.forEach((val) => {
                        const peerItemTemplate = $($("#peerItemTemplate").html());
                        peerItemTemplate.find(".tgPeerEntry").val(val);
                        $("#addTgFormAddExc").after(peerItemTemplate);
                    });
                    entry.config.inclusion.forEach((val) => {
                        const peerItemTemplate = $($("#peerItemTemplate").html());
                        peerItemTemplate.find(".tgPeerEntry").val(val);
                        $("#addTgFormAddInc").after(peerItemTemplate);
                    });
                    // Add the rewrite rules
                    entry.config.rewrite.forEach((rw) => {
                        const rwTemplate = $($("#rewriteItemTemplate").html());
                        rwTemplate.find(".tgRwPeer").val(rw.peerid);
                        rwTemplate.find(".tgRwTgid").val(rw.tgid);
                        rwTemplate.find(".tgRwSlot").val(rw.slot);
                        $("#addTgFormAddRewrite").after(rwTemplate);
                    });
                    // Add the preferred sites
                    if(entry.config.preferred === undefined) {
                        // Migration - if sites missing entirely, add as blank
                        entry.config.preferred = [];
                    }
                    entry.config.preferred.forEach((val) => {
                        const peerItemTemplate = $($("#peerItemTemplate").html());
                        peerItemTemplate.find(".tgPeerEntry").val(val);
                        $("#addTgFormAddPref").after(peerItemTemplate);
                    });
                    // Add the always send sites
                    if(entry.config.always === undefined) {
                        // Migration - if sites missing entirely, add as blank
                        entry.config.always = [];
                    }
                    entry.config.always.forEach((val) => {
                        const peerItemTemplate = $($("#peerItemTemplate").html());
                        peerItemTemplate.find(".tgPeerEntry").val(val);
                        $("#addTgFormAddAlways").after(peerItemTemplate);
                    });
                    // Disable slot & TG edit
                    $("#addTgFormTGID").prop("disabled", true);
                    $("#addTgFormSlot").prop("disabled", true);
                    // Show
                    $("#modalTgAdd").modal('show');
                }
            });
        }
    });
}

function tgPromptDelete(element) {
    const delTgid = $(element).closest("tr").find(".tgt-tgid").text();
    const delName = $(element).closest("tr").find(".tgt-name").text();
    const delSlot = $(element).closest("tr").find(".tgt-slot").text();
    // Update the delete modal text
    $("#modalTgDelete").find(".modal-body").html(`Delete TGID ${delTgid} (${delName})?`);
    // Update the delete function onclick
    $("#modalTgDelete").find(".btn-danger").off('click').on('click', () => {
        deleteTg(delTgid, delSlot);
    });

    // Show the modal
    $("#modalTgDelete").modal('show');
}

function cancelTgDelete() {
    $("#modalTgDelete").find(".modal-body").html('');
    $("#modalTgDelete").find(".btn-danger").off('click');
}

/**
 * Delete the specified RID from the table
 * @param {int} delTgid RID to delete
 */
function deleteTg(delTgid, delSlot) {
    const tgid = parseInt(delTgid);
    const slot = parseInt(delSlot);
    if (isNaN(tgid)) {
        console.error("TG to delete is NaN: " + delTgid);
        return;
    }
    if (isNaN(slot)) {
        console.error("Slot to delete is NaN: " + delSlot);
        return;
    }
    $.ajax({
        type: "PUT",
        url: "rest/tg/delete",
        contentType: "application/json",
        data: JSON.stringify({
            tgid: tgid,
            slot: slot
        }),
        success: function (data) {
            if (data.status == 200) {
                console.log(`Successfully deleted TG ${delTgid}`);
                $("#modalTgDelete").modal('hide');
                tgCommit();
            } else {
                console.error(`Failed to delete TG ${delTgid}: ${data.message}`);
                alert(`Failed to delete TG ${delTgid}: ${data.message}`);
            }
        },
        error: function(xhr, textStatus, thrownError) {
            console.error(`Failed to delete TG ${delTgid}: ${thrownError}`);
            alert(`Failed to delete TG ${delTgid}`);
        }
    });
}

function tgCommit() {
    $.ajax({
        type: "GET",
        url: "rest/tg/commit",
        success: function (data) {
            if (data.status == 200) {
                console.log("Commited TGs succesfully");
                updateTgTable();
            } else {
                console.error(`Failed to update TGs: ${data.message}`);
                alert(`Failed to update TGs: ${data.message}`);
            }
        },
        error: function (xhr, textStatus, thrownError) {
            console.error(`Failed to commit TGs: ${thrownError}`);
            alert(`Failed to commit TGs: ${thrownError}`);
        }
    });
}

function tgPromptInfo(element) {
    const infoTgid = $(element).closest("tr").find(".tgt-tgid").text();
    const infoSlot = $(element).closest("tr").find(".tgt-slot").text();
    getTgInfo(parseInt(infoTgid), parseInt(infoSlot));
    // Show info modal
    $("#modalTgInfo").modal('show');
}

/*****************************************************************************
 * 
 * Peer Management Page Functions
 * 
 *****************************************************************************/

const peerTable = $("#peert-body");
const peerRowTemplate = $("#peertr-template");
const peerAclRowTemplate = $("#peerAcltr-template");

/**
 * Add a peer to the connected peers table
 * @param {int} peerid 
 * @param {string} identity 
 * @param {string} address 
 * @param {int} port 
 * @param {int} lastPing 
 * @param {float} rxFreq 
 * @param {float} txFreq 
 */
function addPeerToTable(peerid, identity, address, port, lastPing, rxFreq, txFreq) {
    // Convert the last ping epoch to a timestamp
    var date = new Date(lastPing);
    const timestamp = date.toLocaleString();
    const newRow = $(peerRowTemplate.html());
    // Convert frequencies to MHz
    const downlink = parseInt(txFreq) / 1e6;
    const uplink = parseInt(rxFreq) / 1e6;
    newRow.find('.peert-peerid').html(peerid);
    newRow.find('.peert-identity').html(identity);
    newRow.find('.peert-address').html(`${address}:${port}`);
    newRow.find('.peert-lastheard').html(timestamp);
    newRow.find('.peert-downlink').html(downlink.toFixed(4));
    newRow.find('.peert-uplink').html(uplink.toFixed(4));

    peerRowTemplate.before(newRow);
}

/**
 * Add a peer to the peer ACL table
 * @param {int} peerid 
 */
function addPeerToACL(peerid) {
    const newRow = $(peerAclRowTemplate.html());
    newRow.find('.peerAclt-peerid').html(peerid);

    peerAclRowTemplate.before(newRow);
}

/**
 * Generate a random 16-byte base64 password for the new peer
 */
function generatePeerPassword() {
    // Generate 16-byte base64 password
    var randomArray = new Uint8Array(16);
    window.crypto.getRandomValues(randomArray);
    const password = btoa(String.fromCharCode.apply(null, randomArray));
    // Fill field
    $("#addPeerAclFormPassword").val(password);
}

/**
 * Clear the add peer ACL entry form
 */
function clearPeerAclForm() {
    $("#addPeerAclFormPeerID").val("");
    $("#addPeerAclFormPassword").val("");
}

/**
 * Submit the add peer ACL form and add a new peer to the ACL list
 */
function addPeerAclForm() {
    // Get peerID and password
    const peerId = parseInt($("#addPeerAclFormPeerID").val());
    const password = $("#addPeerAclFormPassword").val();

    // Validation flag
    valid = true;

    // Validate TGID
    if (isNaN(peerId)) {
        $("#addPeerAclFormPeerID").addClass("is-invalid");
        valid = false;
    }

    // If we had any invalid data, stop
    if (!valid) {
        return;
    }

    // Prepare data
    postData = {
        peerId: peerId,
        password: password
    };

    // Put
    $.ajax({
        type: "PUT",
        url: "rest/peer/add",
        contentType: "application/json",
        data: JSON.stringify(postData),
        success: function (data) {
            if (data.status == 200) {
                console.log(`Successfully added Peer ${peerId}`);
                peerAclCommit();
                peerAclFormSuccess();
            } else {
                console.error(`Failed to add peer ${peerId}: ${data.message}`);
                alert(`Failed to add peer ${peerId}: ${data.message}`);
            }
        },
        error: function(xhr, textStatus, thrownError) {
            console.error(`Failed to add peer ${peerId}: ${thrownError}`);
            console.error(xhr);
            console.error(textStatus);
            console.error(thrownError);
            alert(`Failed to add peer ${peerId}`);
        }
    });
}

function peerAclCommit() {
    $.ajax({
        type: "GET",
        url: "rest/peer/commit",
        success: function (data) {
            if (data.status == 200) {
                console.log("Commited peers succesfully");
                updatePeerTable();
            } else {
                console.error(`Failed to update peers: ${data.message}`);
                alert(`Failed to update peers: ${data.message}`);
            }
        },
        error: function (xhr, textStatus, thrownError) {
            console.error(`Failed to commit peers: ${thrownError}`);
            alert(`Failed to commit peers: ${thrownError}`);
        }
    });
}

function peerAclFormSuccess() {
    // Clear any invalids
    $("#addPeerAclFormPeerID").removeClass("is-invalid");
    $("#addPeerAclFormPassword").removeClass("is-invalid");
    // Make everything valid
    $("#addPeerAclFormPeerID").addClass("is-valid");
    $("#addPeerAclFormPassword").addClass("is-valid");
    // Send the form and clear after a delay
    setTimeout(() => {
        updatePeerTable();
        $("#modalPeerAclAdd").modal('hide');
        clearPeerAclForm();
    }, 300);
}

function peerAclPromptDelete(element) {
    const delPeerId = $(element).closest("tr").find(".peerAclt-peerid").text();
    // Update the delete modal text
    $("#modalPeerAclDelete").find(".modal-body").html(`Delete peer ID ${delPeerId} from ACL?`);
    // Update the delete function onclick
    $("#modalPeerAclDelete").find(".btn-danger").off('click').on('click', () => {
        deletePeerAcl(delPeerId);
    });

    // Show the modal
    $("#modalPeerAclDelete").modal('show');
}

function cancelPeerAclDelete() {
    $("#modalPeerAclDelete").find(".modal-body").html('');
    $("#modalPeerAclDelete").find(".btn-danger").off('click');
}

/**
 * Delete the specified peer from the peer ACL
 * @param {int} peer peer ID to delete
 */
function deletePeerAcl(peer) {
    const peerId = parseInt(peer);
    if (isNaN(peerId)) {
        console.error("Peer ID to delete is NaN: " + peer);
        return;
    }
    $.ajax({
        type: "PUT",
        url: "rest/peer/delete",
        contentType: "application/json",
        data: JSON.stringify({
            peerId: peerId
        }),
        success: function (data) {
            if (data.status == 200) {
                console.log(`Successfully deleted peer ${peer}`);
                $("#modalPeerAclDelete").modal('hide');
                peerAclCommit();
            } else {
                console.error(`Failed to delete peer ${peer}: ${data.message}`);
                alert(`Failed to delete peer ${peer}: ${data.message}`);
            }
        },
        error: function(xhr, textStatus, thrownError) {
            console.error(`Failed to delete peer ${peer}: ${thrownError}`);
            alert(`Failed to delete peer ${peer}`);
        }
    });
}

var peerUpdating = false;
var peerAclUpdating = false;

/**
 * Update the connected peer and peer ACL tables
 */
function updatePeerTable() {
    // Check flag
    if (peerUpdating) { return; }
    peerUpdating = true;
    // Clear table
    $("#peert-body tr").remove();
    // Show loading spinner
    $("#peerSpinnerTable").show();
    // Query connected peers
    $.ajax({
        type: "GET",
        dataType: "json",
        url: "rest/peer/query",
        success: function (data) {
            if (data.status != 200) {
                console.error("Error getting new Peers:");
                console.error(data);
            } else {
                console.log("Got new Peer data")
                data.peers.forEach(entry => {
                    addPeerToTable(entry.peerId, entry.config.identity, entry.address, entry.port, entry.lastPing, entry.config.rxFrequency, entry.config.txFrequency);
                });
                // Hide the loading spinner
                $("#peerSpinnerTable").hide();
                // Sort
                var table = $("#peert");
                var header = document.querySelectorAll("#peert th")[0];
                sortTable(table, header);
            }
            // Done
            setTimeout(() => {peerUpdating = false;}, 250);
        }
    });
    // Do ACL list next
    if (peerAclUpdating) { return; }
    peerAclUpdating = true;
    // Clear table
    $("#peerAclt-body tr").remove();
    // Show loading spinner
    $("#peerAclSpinnerTable").show();
    $.ajax({
        type: "GET",
        dataType: "json",
        url: "rest/peer/list",
        success: function (data) {
            if (data.status != 200) {
                console.error("Error getting peer ACL:");
                console.error(data);
            } else {
                console.log("Got new Peer ACL")
                data.peers.forEach(entry => {
                    addPeerToACL(entry.peerId);
                });
                // Hide the loading spinner
                $("#peerAclSpinnerTable").hide();
                // Sort
                var table = $("#peerAclt");
                var header = document.querySelectorAll("#peerAclt th")[0];
                sortTable(table, header);
            }
            // Done
            setTimeout(() => {peerAclUpdating = false;}, 250);
        }
    });
}

/*****************************************************************************
 * 
 * Window Onload
 * 
 *****************************************************************************/

window.onload = () => {
    // Init Tooltips
    enableTooltips();
    // Load config
    loadConfig();
    loadLastPage(config.lastPage);
    // Load tables
    updateVersion();
    updateRidTable();
    updateTgTable();
    updatePeerTable();
}
