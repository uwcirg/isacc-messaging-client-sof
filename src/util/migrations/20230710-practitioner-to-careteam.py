import json
import requests
import sys

script_name = sys.argv.pop()

default_fhir_server = "https://fhir.isacc.dev.cirg.uw.edu/fhir"
# use first argument as FHIR server base URL, if passed
fhir_server = next(iter(sys.argv), default_fhir_server)

# Get all Patient resources
patients_response = requests.get(f"{fhir_server}/Patient?_count=50")
if patients_response.status_code != 200:
    print(f"GET Patient request failed with status {patients_response.status_code}")
else:
    print(f"GET Patient request for all success with status {patients_response.status_code}")

patients = patients_response.json()["entry"]

for patient_entry in patients:
    patient = patient_entry["resource"]
    patient_id = patient["id"]
    # Justin
    # mcjustin tested this with https://fhir.isacc.dev.cirg.uw.edu/fhir/Patient/1
    #if patient_id != '1':
    #    print(f"Iterating patients, skipping {patient_id}")
    #    continue

    # If the patient does not have a generalPractitioner, skip to the next patient
    if "generalPractitioner" not in patient:
        print(f"Iterating patients, skipping {patient_id} since it doesn't have a generalPractitioner")
        continue

    # Create a new CareTeam resource
    careteam = {
        "resourceType": "CareTeam",
        "subject": {
            "reference": f"Patient/{patient_id}",
            "type": "Patient"
        },
        "participant": [
            {"member": gp} for gp in patient["generalPractitioner"]
        ]
    }
    careteam_response = requests.post(f"{fhir_server}/CareTeam", json=careteam)
    if not(200 <= careteam_response.status_code < 300):
        print(f"POST CarePlan request for Patient {patient_id} failed with status {careteam_response.status_code}")
        continue
    else:
        print(f"POST CarePlan request for Patient {patient_id} success with status {careteam_response.status_code}")

    careteam_id = careteam_response.json()["id"]

    # Update the Patient resource
    del patient["generalPractitioner"]
    patient_response = requests.put(f"{fhir_server}/Patient/{patient_id}", json=patient)
    if not(200 <= patient_response.status_code < 300):
        print(f"PUT Patient request for Patient {patient_id} failed with status {patient_response.status_code}")
        continue
    else:
        print(f"PUT Patient request for Patient {patient_id} success with status {patient_response.status_code}")

    # Find the active CarePlan for the Patient
    careplan_response = requests.get(f"{fhir_server}/CarePlan?subject=Patient/{patient_id}&status=active")
    if not(200 <= careplan_response.status_code < 300):
        print(f"GET CarePlan request for Patient {patient_id} failed with status {careplan_response.status_code}")
        continue
    else:
        print(f"GET CarePlan request for Patient {patient_id} success with status {careplan_response.status_code}")
    careplan = careplan_response.json()["entry"][0]["resource"]

    # Update the CarePlan to reference the new CareTeam
    careplan["careTeam"] = [{"reference": f"CareTeam/{careteam_id}"}]
    careplan_response = requests.put(f"{fhir_server}/CarePlan/{careplan['id']}", json=careplan)
    if not(200 <= careplan_response.status_code < 300):
        print(f"PUT CarePlan request for Patient {patient_id} failed with status {careplan_response.status_code}")
        continue
    else:
        print(f"PUT CarePlan request for Patient {patient_id} success with status {careplan_response.status_code}")
