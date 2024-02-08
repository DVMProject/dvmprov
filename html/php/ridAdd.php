<?php

include_once("rest.php");
include_once("config.php");

header('Content-type: application/json');

// Get params
$newRid = $_POST['rid'];
$newAlias = $_POST['alias'];

$enabled = filter_var($_POST['enabled'], FILTER_VALIDATE_BOOLEAN);

// Convert RID to int
$rid = intval($newRid);

// Init REST API
$fneRest = new RestApi();

if (!$fneRest->Init($confRestAddress, $confRestPort, $confRestPassword))
{
    print(json_encode(array('status' => 400, 'message' => "Failed to init REST API")));
}
else
{
    $result = $fneRest->Put($fneRest->FNE_PUT_RID_ADD, array('rid' => $rid, 'enabled' => $enabled, 'alias' => $newAlias));

    if ($result['staus'] == 200)
    {
        $result = $fneRest->Get($fneRest->FNE_GET_RID_COMMIT);
    }

    print($result);
}

?>