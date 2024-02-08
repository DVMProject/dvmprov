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

$newObj = array('rid' => $rid, 'enabled' => $enabled, 'alias' => $newAlias);

if (!$fneRest->Init($confRestAddress, $confRestPort, $confRestPassword))
{
    print(json_encode(array('status' => 400, 'message' => "Failed to init REST API")));
}
else
{
    $result = json_decode($fneRest->Put($fneRest->FNE_PUT_RID_ADD, $newObj));

    if ($result->status != 200)
    {
        $result->obj = $newObj;
        print(json_encode($result));
    }
    else
    {
        $result = $fneRest->Get($fneRest->FNE_GET_RID_COMMIT);
        print($result);
    }
}

?>