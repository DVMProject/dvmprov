<?php

include_once("rest.php");
include_once("config.php");

header('Content-type: application/json');

// Get params
$delRid = $_POST['rid'];

// Convert RID to int
$rid = intval($delRid);

// Init REST API
$fneRest = new RestApi();

if (!$fneRest->Init($confRestAddress, $confRestPort, $confRestPassword))
{
    print(json_encode(array('status' => 400, 'message' => "Failed to init REST API")));
}
else
{
    $result = json_decode($fneRest->Put($fneRest->FNE_PUT_RID_DELETE, array('rid' => $rid)));

    if ($result->status != 200)
    {
        $result->rid = $rid;
        print(json_encode($result));
    }
    else
    {
        $result = $fneRest->Get($fneRest->FNE_GET_RID_COMMIT);
        print($result);
    }
}

?>