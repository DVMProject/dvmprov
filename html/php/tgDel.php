<?php

include_once("rest.php");
include_once("config.php");

header('Content-type: application/json');

// Get params
$delRid = $_POST['tgid'];

// Convert RID to int
$tgid = intval($delTgid);

// Init REST API
$fneRest = new RestApi();

if (!$fneRest->Init($confRestAddress, $confRestPort, $confRestPassword))
{
    print("ERROR:1 Failed to init REST api auth");
}
else
{
    $result = $fneRest->Put($fneRest->FNE_PUT_TGID_DELETE, array('tgid' => $tgid));

    if (!$result)
    {
        print("ERROR:2 Failed to PUT TGID delete");
    }
    else
    {
        $result = $fneRest->Get($fneRest->FNE_GET_TGID_COMMIT);
        if (!$result)
        {
            print("ERROR:3 Failed to commit TGID changes");
        }
        else
        {
            print($result);
        }
    }
}

?>