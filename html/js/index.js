/*******************************************************
 * Cookie Functions & Variables
 *******************************************************/

var config = {
    fneAddress: null,
    lastPage: "pageHome"
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

/*******************************************************
 * Global Variables/Constants
 *******************************************************/

const spinnerSmall = document.getElementById("spinner-small");

/*******************************************************
 * Global Functions
 *******************************************************/

function enableTooltips() {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerE1 => new bootstrap.Tooltip(tooltipTriggerE1));
}

/*******************************************************
 * FNE Communication Functions
 *******************************************************/

function connectFne() {
    console.log(`Connecting to FNE at address ${config.fneAddress}`);
}

/*******************************************************
 * Sidebar Navigation Buttons
 *******************************************************/

function page(obj) {
    // Remove active from the side navbar items
    $("#nav-side .nav-link").removeClass("active");
    // Hide all other pages and show the selected page
    $(".page").fadeOut(150).promise().done(function() {
        if (obj.dataset.page) {
            $(`#${obj.dataset.page}`).fadeIn(150);
        }
    });
    // Make the current button active and hide the tooltip
    $(obj).addClass("active");
    $(obj).tooltip('hide');
}

/*******************************************************
 * RID Management Page Functions
 *******************************************************/

const ridTable = $("#ut-body");
const ridRowTemplate = $("#utr-template");

// Add table row for RID
function addRidToTable(rid, enabled) {
    const newRow = $(ridRowTemplate.html());
    newRow.find('.ut-rid').html(rid);
    //tds[1].textContent = callsign;
    //tds[2].textContent = operator;
    if (enabled)
    {
        newRow.find('.ut-enabled').html('<ion-icon name="checkmark-circle-sharp"></ion-icon>');
        newRow.find('.ut-enabled').addClass('text-success');
    }
    else
    {
        newRow.find('.ut-enabled').html('<ion-icon name="close-circle-sharp"></ion-icon>');
        newRow.find('.ut-enabled').addClass('text-danger');
    }

    ridRowTemplate.before(newRow);

    // Enable the tooltips on the buttons
    enableTooltips();
}

function updateRidTable() {
    // Clear table
    $("#ut-body td").remove();
    // Show loading spinner
    $("#spinnerTable").show();
    // Query
    $.ajax({
        type: "GET",
        dataType: "json",
        url: "php/ridGet.php",
        success: function (data) {
            console.log("Got new rid data")
            data.rids.forEach(entry => {
                addRidToTable(entry.id, entry.enabled);
            });
            // Hide the loading spinner
            $("#spinnerTable").hide();
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

function ridFormSuccess() {
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
    }, 1000);
}

function addRidForm() {
    // Get values from form
    const newRID = parseInt($("#addRidFormRID").val());
    const newAlias = $("#addRidFormAlias").val();
    const enabled = $("#addRidFormEnabled").prop("checked");

    postData = {
        rid: newRID,
        alias: newAlias,
        enabled: enabled,
    }

    console.log(postData);

    // Send the data and verify success
    $.post("php/ridAdd.php",
    postData,
    function(data, status) {
        switch (data.status)
        {
            case 200:
                // Clear & close the form
                console.log("Successfully added new RID!");
                ridFormSuccess();
                break;
            default:
                console.error("Failed to add RID: " + data.status);
                break;
        }
    });
    
}

function ridPromptEdit(element) {
    // Get the parameters from the table
    const editRid = $(element).closest("tr").find(".ut-rid").text();
    const editAlias = $(element).closest("tr").find(".ut-alias").text();
    const editEnabled = (($(element).closest("tr").find(".ut-enabled").html().includes("checkmark-circle-sharp")) ? true : false);
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
    // Update the delete modal text
    $("#modalRidDelete").find(".modal-body").html(`Delete RID ${delRid}?`);
    // Update the delete function onclick
    $("#modalRidDelete").find(".btn-danger").click(() => {
        deleteRid(delRid);
    });

    // Show the modal
    $("#modalRidDelete").modal('show');
}

function cancelRidDelete() {
    $("#modalRidDelete").find(".modal-body").html('');
    $("#modalRidDelete").find(".btn-danger").prop('onclick', null).off('click');
}

/**
 * Delete the specified RID from the table
 * @param {int} delRid RID to delete
 */
function deleteRid(delRid) {
    $.post("php/ridDel.php",
    {
        rid: parseInt(delRid)
    },
    function (data, status) {
        if (data.status == 200) {
            console.log(`Successfully deleted RID ${delRid}`);
            $("#modalRidDelete").modal('hide');
            updateRidTable();
        } else {
            console.error("Failed to delete RID: " + data);
            alert("Failed to delete RID");
        }
    });
}

/*******************************************************
 * Window Onload
 *******************************************************/

window.onload = () => {
    // Init Tooltips
    enableTooltips();
    // Load config
    loadConfig();
    // Load initial data
    updateRidTable();
}