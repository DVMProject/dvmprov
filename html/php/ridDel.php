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
    print("ERROR:1 Failed to init REST api auth");
}
else
{
    $result = $fneRest->Put($fneRest->FNE_PUT_RID_DELETE, array('rid' => $rid));

    if (!$result)
    {
        print("ERROR:2 Failed to PUT RID delete");
    }
    else
    {
        $result = $fneRest->Get($fneRest->FNE_GET_RID_COMMIT);
        if (!$result)
        {
            print("ERROR:3 Failed to commit RID changes");
        }
        else
        {
            print($result);
        }
    }
}

?>