from fhirclient import client
from fhirclient.models.patient import Patient
from fhirclient.models.communication import Communication
from fhirclient.models.communicationrequest import CommunicationRequest
import argparse
from datetime import datetime

def createCommunicationFromRequest(cr):
    return {
        "resourceType": "Communication",
        "basedOn": [{"reference": f"CommunicationRequest/{cr.id}"}],
        "partOf": [{"reference": f"{cr.basedOn[0].reference}"}],
        "category": [{
            "coding": [{
                "system": "https://isacc.app/CodeSystem/communication-type",
                "code": "isacc-sent-message"
            }]
        }],

        "payload": [p.as_json() for p in cr.payload],
        "sent": datetime.now().isoformat(),
        "recipient": [r.as_json() for r in cr.recipient],
        "medium": [{
            "coding": [{
                "system": "http://terminology.hl7.org/ValueSet/v3-ParticipationMode",
                "code": "SMSWRIT"
            }]
        }],
        "status": "completed"
    }


def convert(cr_id):
    settings = {
        'app_id': 'my_web_app',
        'api_base': 'https://r4.smarthealthit.org'
    }
    db = client.FHIRClient(settings=settings)

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


def main(args=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('--cr_id', '-c')
    args = parser.parse_args(args)
    convert(args.cr_id)


if __name__ == '__main__':
    main()