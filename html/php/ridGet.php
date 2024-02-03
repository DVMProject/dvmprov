<?php

include_once("rest.php");
include_once("config.php");

header('Content-type: application/json');

// Init REST API
$fneRest = new RestApi();

if (!$fneRest->Init($confRestAddress, $confRestPort, $confRestPassword))
{
    print("ERROR:1 Failed to init REST api auth");
}
else
{
    $result = $fneRest->Get($fneRest->FNE_GET_RID_QUERY);

    if (!$result)
    {
        print("ERROR:2 Failed to GET");
    }
    else
    {
        print($result);
    }
}

?>