from fhirclient import client
from fhirclient.models.patient import Patient
from fhirclient.models.communication import Communication
from fhirclient.models.communicationrequest import CommunicationRequest

from fhirclient.models.careplan import CarePlan

import argparse
from datetime import datetime
import dateutil

def createCommunicationFromRequest(cr):
    return {
        "resourceType": "Communication",
        "basedOn": [{"reference": f"CommunicationRequest/{cr.id}"}],
        "partOf": [{"reference": f"{cr.basedOn[0].reference}"}],
        "category": [{
            "coding": [{
                "system": "https://isacc.app/CodeSystem/communication-type",
                "code": "isacc-auto-sent-message"
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


def convertCommunicationToRequest(cr_id):
    db = getDB()
    cr = CommunicationRequest.read(cr_id, db.server)
    c = createCommunicationFromRequest(cr)
    c = Communication(c)

    print("Creating resource: ")
    print(c.as_json())
    result = c.create(db.server)
    print("Created resource: ")
    print(result)

    cr.status = "completed"
    print("Marking request object as complete")
    print(cr.update(db.server))



def getCareplan(db, patientId):
    result = CarePlan.where(struct={"subject": f"Patient/{patientId}",
            "category": "isacc-message-plan",
            "_sort":"-_lastUpdated"}).perform_resources(db.server)
    if (result is not None and len(result) > 0):
        return result[0]
    else:
        print("no careplans found")
        return None


def generateIncomingMessage(message, time: datetime = None, patientId=None, priority=None):
    if priority is not None and priority != "routine" and priority!= "urgent" and priority!= "stat":
         print(f"Invalid priority given: {priority}. Only routine, urgent, and stat are allowed.")
         return

    if priority is None:
        priority = "routine"

    if patientId is None:
        patientId = "2cda5aad-e409-4070-9a15-e1c35c46ed5a" # Geoffrey Abbott

    db = getDB()
    carePlan = getCareplan(db, patientId)

    if time is None:
        time = datetime.now()

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
        'priority': priority

    }
    c = Communication(m)
    result = c.create(db.server)
    print(result)

def generateManualOutgoingMessage(message, time: datetime = None, patientId=None):
    if patientId is None:
        patientId = "2cda5aad-e409-4070-9a15-e1c35c46ed5a" # Geoffrey Abbott

    db = getDB()
    carePlan = getCareplan(db, patientId)

    if time is None:
        time = datetime.now()

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
        'priority': priority

    }
    c = Communication(m)
    result = c.create(db.server)
    print(result)


def generateScript(patientId=None):
    if patientId is None:
        patientId = "2cda5aad-e409-4070-9a15-e1c35c46ed5a" # Geoffrey Abbott

    db = getDB()
    carePlan = getCareplan(db, patientId)
    convertCommunicationToRequest(carePlan.activity[0].reference.reference.replace('CommunicationRequest/',''))
    generateIncomingMessage("Thank you! :)", patientId=patientId)
    convertCommunicationToRequest(carePlan.activity[1].reference.reference.replace('CommunicationRequest/',''))
    generateIncomingMessage("I'm okay. How are you?", patientId=patientId)



def getDB():
    settings = {
        'app_id': 'my_web_app',
        'api_base': 'https://r4.smarthealthit.org'
    }
    db = client.FHIRClient(settings=settings)
    return db


def main(args=None):
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    subcommand1_parser = subparsers.add_parser("convertCRtoC", help="Convert CommunicationRequest to Communication")
    subcommand1_parser.add_argument('--cr_id', '-c', help="CommunicationRequest ID")

    subcommand2_parser = subparsers.add_parser("generateMsg", help="Generate incoming message")
    subcommand2_parser.add_argument('--patient', '-p', help="Patient ID", default="2cda5aad-e409-4070-9a15-e1c35c46ed5a")
    subcommand2_parser.add_argument('--message', '-m', help="Message content")
    subcommand2_parser.add_argument('--time', '-t', help="Time sent. ISO format", default=datetime.now().isoformat())
    subcommand2_parser.add_argument('--priority', '-u', help="Priority/urgency of message. routine, urgent, or stat")

    subcommand3_parser = subparsers.add_parser("generateScript", help="Generate messages from CarePlan")
    subcommand3_parser.add_argument('--patient', '-p', help="Patient ID", default="2cda5aad-e409-4070-9a15-e1c35c46ed5a")

    args = parser.parse_args(args)


    if args.command == "convertCRtoC":
        convertCommunicationToRequest(cr_id=args.cr_id)
    elif args.command == "generateMsg":
        time = dateutil.parser(args.time)
        generateIncomingMessage(patientId=args.patient, message=args.message, time=time, priority=args.priority)
    elif args.command == "generateScript":
        time = dateutil.parser(args.time)
        generateScript(patientId=args.patient, message=args.message, time=time, priority=args.priority)
    else:
        print("Command not found")


if __name__ == '__main__':
    main()