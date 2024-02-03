<?php

/**
 * 
 * 
 * Functions and variables for the dvmfne REST API
 * 
 * (C) 2024 W3AXL, DVMProject
 * 
 */

class RestApi
{
    // REST endpoint variables

    public $FNE_GET_PEER_QUERY = "/peer/query";

    public $FNE_GET_RID_QUERY = "/rid/query";
    public $FNE_PUT_RID_ADD = "/rid/add";
    public $FNE_PUT_RID_DELETE = "/rid/delete";
    public $FNE_GET_RID_COMMIT = "/rid/commit";

    public $FNE_GET_TGID_QUERY = "/tg/query";
    public $FNE_PUT_TGID_ADD = "/tg/add";
    public $FNE_PUT_TGID_DELETE = "/tg/delete";
    public $FNE_GET_TGID_COMMIT = "/tg/commit";

    public $FNE_GET_FORCE_UPDATE = "/force-update";

    // CURL object
    private $curl;

    // REST API access info
    private $restUrl = "";

    // Auth token from the REST API
    private $restAuthToken = "";

    private $restErrorMessage = "No Error";

    /**
     * REST POST/PUT/GET function
     * from https://stackoverflow.com/a/9802854/1842613
     * 
     * Method: POST, PUT, GET
     * Data: array("param" => "value") ==> index.php?param=value
     */
    private function RestCall($method, $url, $data = false, $authToken = false)
    {
        // Init curl
        $this->curl = curl_init();

        // Convert data to JSON
        $data_json = json_encode($data);

        $http_headers = array();

        // Do different things based on method
        switch ($method) {
            case "POST":
                curl_setopt($this->curl, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
                curl_setopt($this->curl, CURLOPT_POST, true);
                curl_setopt($this->curl, CURLOPT_POSTFIELDS, $data_json);
                curl_setopt($this->curl, CURLOPT_RETURNTRANSFER, true);
                break;

            case "PUT":
                curl_setopt($this->curl, CURLOPT_CUSTOMREQUEST, "PUT");
                curl_setopt($this->curl, CURLOPT_POSTFIELDS, $data_json);
                curl_setopt($this->curl, CURLOPT_RETURNTRANSFER, true);
                array_push($http_headers, 'Content-Type: application/json','Content-Length: ' . strlen($data_json));
                break;

            case "GET":
                curl_setopt($this->curl, CURLOPT_HEADER, 0);
                curl_setopt($this->curl, CURLOPT_RETURNTRANSFER, true);
                break;
        }

        if ($authToken)
        {
            array_push($http_headers, 'X-DVM-Auth-Token: ' . $authToken);
        }

        curl_setopt($this->curl, CURLOPT_HTTPHEADER, $http_headers);
        curl_setopt($this->curl, CURLINFO_HEADER_OUT, true);
        curl_setopt($this->curl, CURLOPT_URL, $url);
        

        $result = curl_exec($this->curl);

        //print(json_encode(curl_getinfo($this->curl), JSON_PRETTY_PRINT));

        return $result;
    }

    /**
     * Init the REST API and authenticate
     */
    public function Init($address, $port, $password)
    {
        // Save connection information
        $this->restUrl = $address . ":" . strval($port);

        // Authenticate
        return $this->Auth($password);
    }

    /**
     * Authenticate to the FNE REST API and get a token
     */
    public function Auth($password)
    {
        // Generate a SHA-256 hash of the auth password
        $passwordHash = hash('sha256', $password);

        // Send the hash to the API and get the auth token back
        $result = $this->RestCall("PUT", $this->restUrl . "/auth", array("auth" => $passwordHash));

        if ($result)
        {
            // Store our auth token
            $json = json_decode($result, true);
            $this->restAuthToken = $json["token"];
            return true;
        }
        else
        {
            $this->restErrorMessage = "Failed to authenticate with REST api: " . json_encode(curl_error($this->curl));
            return false;
        }
    }

    public function Get($endpoint)
    {
        return $this->RestCall("GET", $this->restUrl . $endpoint, false, $this->restAuthToken);
    }

    public function Put($endpoint, $data)
    {
        return $this->RestCall("PUT", $this->restUrl . $endpoint, $data, $this->restAuthToken);
    }
    
}



?>