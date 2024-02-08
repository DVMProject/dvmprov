<?php

include_once("rest.php");
include_once("config.php");

header('Content-type: application/json');

// Get params
$delTgid = $_POST['tgid'];
$delSlot = $_PORT['slot'];

// Convert RID to int
$tgid = intval($delTgid);
$slot = intval($delSlot);

// Init REST API
$fneRest = new RestApi();

if (!$fneRest->Init($confRestAddress, $confRestPort, $confRestPassword))
{
    print(json_encode(array('status' => 400, 'message' => "Failed to init REST API")));
}
else
{
    $result = json_decode($fneRest->Put($fneRest->FNE_PUT_TGID_DELETE, array('tgid' => $tgid, 'slot' => $slot)));

    if ($result->status == 200)
    {
        $result = $fneRest->Get($fneRest->FNE_GET_TGID_COMMIT);
    }
    print($result);
}

?>