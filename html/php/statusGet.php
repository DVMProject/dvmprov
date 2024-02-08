<?php

include_once("rest.php");
include_once("config.php");

header('Content-type: application/json');

// Init REST API
$fneRest = new RestApi();

if (!$fneRest->Init($confRestAddress, $confRestPort, $confRestPassword))
{
    print(json_encode(array('status' => 400, 'message' => "Failed to init REST API")));
}
else
{
    $result = json_decode($fneRest->Get($fneRest->FNE_GET_STATUS));
    $version = json_decode($fneRest->Get($fneRest->FNE_GET_VERSION));
    $result->version = $version->version;
    $result->url = $confRestAddress;
    $result->port = $confRestPort;
    print(json_encode($result));
}

?>