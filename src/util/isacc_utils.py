from fhirclient import client
from fhirclient.models.patient import Patient
from fhirclient.models.communication import Communication
from fhirclient.models.communicationrequest import CommunicationRequest
from fhirclient.models.observation import Observation

from fhirclient.models.careplan import CarePlan

import argparse
from datetime import datetime
import dateutil.parser

import requests


class IsaccRecordCreator:
    def __init__(self, api_base):
        if api_base == None:
            api_base = 'https://r4.smarthealthit.org'
        self.db = client.FHIRClient(settings={
            'app_id': 'my_web_app',
            'api_base': api_base
        })

    def createCommunicationFromRequest(self, cr):
        if cr.category[0].coding[0].code == 'isacc-manually-sent-message':
            code = 'isacc-manually-sent-message'
        else:
            code = "isacc-auto-sent-message"
        return {
            "resourceType": "Communication",
            "basedOn": [{"reference": f"CommunicationRequest/{cr.id}"}],
            "partOf": [{"reference": f"{cr.basedOn[0].reference}"}],
            "category": [{
                "coding": [{
                    "system": "https://isacc.app/CodeSystem/communication-type",
                    "code": code
                }]
            }],

            "payload": [p.as_json() for p in cr.payload],
            "sent": datetime.now().astimezone().isoformat(),
            "recipient": [r.as_json() for r in cr.recipient],
            "medium": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/ValueSet/v3-ParticipationMode",
                    "code": "SMSWRIT"
                }]
            }],
            "status": "completed"
        }


    def convertCommunicationToRequest(self, cr_id):
        cr = CommunicationRequest.read(cr_id, self.db.server)
        c = self.createCommunicationFromRequest(cr)
        c = Communication(c)

        print("Creating resource: ")
        print(c.as_json())
        result = c.create(self.db.server)
        print("Created resource: ")
        print(result)

        cr.status = "completed"
        print("Marking request object as complete")
        print(cr.update(self.db.server))



    def getCareplan(self, patientId):
        result = CarePlan.where(struct={"subject": f"Patient/{patientId}",
                "category": "isacc-message-plan",
                "_sort":"-_lastUpdated"}).perform_resources(self.db.server)
        if (result is not None and len(result) > 0):
            return result[0]
        else:
            print("no careplans found")
            return None


    def generateIncomingMessage(self, message, time: datetime = None, patientId=None, priority=None, themes=None):
        if priority is not None and priority != "routine" and priority!= "urgent" and priority!= "stat":
             print(f"Invalid priority given: {priority}. Only routine, urgent, and stat are allowed.")
             return

        if priority is None:
            priority = "routine"

        if patientId is None:
            patientId = "2cda5aad-e409-4070-9a15-e1c35c46ed5a" # Geoffrey Abbott

        carePlan = self.getCareplan(patientId)

        if time is None:
            time = datetime.now()

        if themes is None:
            themes = []

        m = {
            'resourceType': 'Communication',
            'partOf': [{'reference': f'CarePlan/{carePlan.id}'}],
            'status': 'completed',
            'category': [{'coding': [{'system': 'https://isacc.app/CodeSystem/communication-type',
                                      'code': 'isacc-received-message'}]}],
            'medium': [{'coding': [{'system': 'http://terminology.hl7.org/ValueSet/v3-ParticipationMode',
                                    'code': 'SMSWRIT'}]}],
            'sent': time.astimezone().isoformat(),
            'sender': {'reference': f'Patient/{patientId}'},
            'payload': [{'contentString': message}],
            'priority': priority,
            'extension': [
                {"url": "isacc.app/message-theme",'valueString': t} for t in themes
            ]
        }
        c = Communication(m)
        result = c.create(self.db.server)
        print(result)

    def generateManualOutgoingMessage(self, message, time: datetime = None, patientId=None):
        if patientId is None:
            patientId = "2cda5aad-e409-4070-9a15-e1c35c46ed5a" # Geoffrey Abbott

        carePlan = self.getCareplan(patientId)

        if time is None:
            time = datetime.now()

        m = {
            'resourceType': 'Communication',
            'partOf': [{'reference': f'CarePlan/{carePlan.id}'}],
            'status': 'completed',
            'category': [{'coding': [{'system': 'https://isacc.app/CodeSystem/communication-type',
                                      'code': 'isacc-manually-sent-message'}]}],
            'medium': [{'coding': [{'system': 'http://terminology.hl7.org/ValueSet/v3-ParticipationMode',
                                    'code': 'SMSWRIT'}]}],
            'sent': time.astimezone().isoformat(),
            'recipient': [{'reference': f'Patient/{patientId}'}],
            'payload': [{'contentString': message}]

        }
        c = Communication(m)
        result = c.create(self.db.server)
        print(result)


    def generateScript(self, patientId=None):
        if patientId is None:
            patientId = "2cda5aad-e409-4070-9a15-e1c35c46ed5a" # Geoffrey Abbott

        carePlan = self.getCareplan(patientId)
        self.convertCommunicationToRequest(carePlan.activity[0].reference.reference.replace('CommunicationRequest/',''))
        self.generateIncomingMessage("Thank you! :)", patientId=patientId)
        self.convertCommunicationToRequest(carePlan.activity[1].reference.reference.replace('CommunicationRequest/',''))
        self.generateIncomingMessage("I'm okay. How are you?", patientId=patientId)
        self.generateManualOutgoingMessage("I'm doing well, thanks for asking.", patientId=patientId)
        self.generateIncomingMessage("I feel trapped and there's nothing I can do to help myself",themes=['entrapment', 'hopelessness'], priority='stat', patientId=patientId)
        self.createPHQ(4, patientId=patientId)

    def createPHQ(self, score, patientId=None):
        if patientId is None:
            patientId = "2cda5aad-e409-4070-9a15-e1c35c46ed5a" # Geoffrey Abbott

        o = Observation({
              "resourceType": "Observation",
              "text": {
                "status": "generated",
                "div": "<div xmlns=\"http://www.w3.org/1999/xhtml\">Patient Health Questionnaire 9 item (PHQ-9) total score [Reported]</div>"
              },
              "status": "final",
              "category": [
                {
                  "coding": [
                    {
                      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                      "code": "survey"
                    }
                  ],
                  "text": "Survey"
                }
              ],
              "code": {
                "coding": [
                  {
                    "system": "http://loinc.org",
                    "code": "44261-6",
                    "display": "Patient Health Questionnaire 9 item (PHQ-9) total score [Reported]"
                  }
                ],
                "text": "Patient Health Questionnaire 9 item (PHQ-9) total score [Reported]"
              },
              "subject": {
                "reference": f'Patient/{patientId}'
              },
              "effectiveDateTime": time.astimezone().isoformat(),
              "valueQuantity": {
                "value": score
              }
            })
        result = o.create(self.db.server)
        print(result)

    def delete_entire_careplans(self, cps_to_delete):
        cp_ids_to_delete = [cp.id for cp in cps_to_delete]
        cs_to_delete = list(set([
            c.id
            for cp_id in cp_ids_to_delete
            for c in Communication.where(struct={'part-of': f"CarePlan/{cp_id}"}).perform_resources(self.db.server)
        ]))
        crs_to_delete = [a.reference.reference.split(
            '/')[1] for r in cps_to_delete for a in r.activity]
        deletion_bundle = {
            "resourceType": "Bundle",
            "type": "transaction",
            "entry": [
                {
                    "request": {
                        "method": "DELETE",
                        "url": f"CarePlan/{cp_id}"
                    }
                } for cp_id in cp_ids_to_delete]+[
                {
                    "request": {
                        "method": "DELETE",
                        "url": f"CommunicationRequest/{cr_id}"
                    }
                } for cr_id in crs_to_delete]+[
                {
                    "request": {
                        "method": "DELETE",
                        "url": f"Communication/{c_id}"
                    }
                } for c_id in cs_to_delete]

        }
        result=requests.post(self.db.server.base_uri, json=deletion_bundle)
        for i in result.iter_lines():
            print(i)
        return result


    def delete_entire_patient(self, patientId):
        cps=CarePlan.where(struct={"subject": f"Patient/{patientId}",
                "category": "isacc-message-plan"}).perform_resources(self.db.server)
        print(self.delete_entire_careplans(cps))
        print(Patient.read(patientId, self.db.server).delete(self.db.server))


def main(args=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('--api_base', '-a', help="URL of the API base, e.g. https://r4.smarthealthit.org", default='https://r4.smarthealthit.org')

    subparsers = parser.add_subparsers(dest="command", required=True)

    subcommand1_parser = subparsers.add_parser("convertCRtoC", help="Convert CommunicationRequest to Communication")
    subcommand1_parser.add_argument('--cr_id', '-c', help="CommunicationRequest ID")

    subcommand2_parser = subparsers.add_parser("generateMsg", help="Generate incoming message")
    subcommand2_parser.add_argument('--patient', '-p', help="Patient ID", default="2cda5aad-e409-4070-9a15-e1c35c46ed5a")
    subcommand2_parser.add_argument('--message', '-m', help="Message content")
    subcommand2_parser.add_argument('--time', '-t', help="Time sent. ISO format", default=datetime.now().isoformat())
    subcommand2_parser.add_argument('--priority', '-u', help="Priority/urgency of message. routine, urgent, or stat")
    subcommand2_parser.add_argument('--themes', help="Priority/urgency of message. routine, urgent, or stat", nargs="+")

    subcommand3_parser = subparsers.add_parser("generateScript", help="Generate messages from CarePlan")
    subcommand3_parser.add_argument('--patient', '-p', help="Patient ID", default="2cda5aad-e409-4070-9a15-e1c35c46ed5a")

    subcommand4_parser = subparsers.add_parser("deletePatient", help="Delete entire patient")
    subcommand4_parser.add_argument('--patient', '-p', help="Patient ID", default="2cda5aad-e409-4070-9a15-e1c35c46ed5a")

    args = parser.parse_args(args)

    recordCreator = IsaccRecordCreator(api_base=args.api_base)

    if args.command == "convertCRtoC":
        recordCreator.convertCommunicationToRequest(cr_id=args.cr_id)
    elif args.command == "generateMsg":
        time = dateutil.parser.parse(args.time)
        recordCreator.generateIncomingMessage(patientId=args.patient, message=args.message, time=time, priority=args.priority, themes=args.themes)
    elif args.command == "generateScript":
        recordCreator.generateScript(patientId=args.patient)
    elif args.command == "deletePatient":
        recordCreator.delete_entire_patient(patientId=args.patient)
    else:
        print("Command not found")


if __name__ == '__main__':
    main()