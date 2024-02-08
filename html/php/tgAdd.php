<?php

include_once("rest.php");
include_once("config.php");

header('Content-type: application/json');

// Get JSON
$data = json_decode($_POST['data'], true);

// Get Parameters
$tgid = $data['tgid'];
$name = $data['name'];
$slot = $data['slot'];
$active = $data['active'];
$affiliated = $data['affiliated'];
$parrot = $data['parrot'];
$excludes = $data['exclusion'];
$includes = $data['inclusion'];
$rewrites = $data['rewrite'];

// Create object
$tgObj = array(
    'name' => $name,
    'config' => array(
        'active' => $active,
        'affiliated' => $affiliated,
        'parrot' => $parrot,
        'exclusion' => $excludes,
        'inclusion' => $includes,
        'rewrite' => $rewrites
    ),
    'source' => array(
        'tgid' => $tgid,
        'slot' => $slot
    )
);

//print_r(json_encode($tgObj, JSON_PRETTY_PRINT));

// Init REST API
$fneRest = new RestApi();

if (!$fneRest->Init($confRestAddress, $confRestPort, $confRestPassword))
{
    print(json_encode(array('status' => 400, 'message' => "Failed to init REST API")));
}
else
{
    $result = json_decode($fneRest->Put($fneRest->FNE_PUT_TGID_ADD, $tgObj));

    if ($result->status != 200)
    {
        // Add the decoded TG Obj to the return
        $result->tgObj = $tgObj;
        print(json_encode($result));
        return;
    }
    else
    {
        $result = $fneRest->Get($fneRest->FNE_GET_TGID_COMMIT);
        print($result);
        return;
    }
}

?>