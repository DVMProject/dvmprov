# DVM Provisioning Manager

Webapp for managing DVM CFNE (Converged FNE) via REST api.

## Installation
Clone the repository, set up a python virtual environment, and install required pip dependecies:
```console
git clone https://github.com/DVMProject/dvmprov
cd dvmprov
python3 -m venv .
source bin/activate
pip install -r requirements.txt
```

## Configuration
Copy the rest.example.py file to rest.py, and update the credentials and address to reflect your CFNE instance:
```py
rest_api_address = "127.0.0.1"
rest_api_port = 9990
rest_api_password = "PASSWORD"
```
The server running `dvmprov` must be able to talk directly to the CFNE. 

**NOTE: It's highly encouraged to keep both the FNE REST API and `dvmprov` behind a reverse proxy, such as NGINX or Apache, and restricted with authentication. `dvmprov` can directly modify FNE configuration and does not provide authentication by itself.**

## Running
Simply run the python script from within the virtual environment. You should see a successful authentication if your REST credentials are configured properly.
```console
(dvmprov)$ python dvmprov.py
INFO:root:Succesfully authenticated with FNE REST API
INFO:waitress:Serving on http://127.0.0.1:8180
```
