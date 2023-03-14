import {CommunicationRequest} from "../model/CommunicationRequest";
import Patient from "../model/Patient";
import CarePlan from "../model/CarePlan";

describe('CommunicationRequest tests', () => {
    test('Generate scheduled message from PlanDefinition', () => {
        let p = new Patient();
        p.resourceType = "Patient";
        p.id = "patientID";

        let c: CommunicationRequest = CommunicationRequest.createNewScheduledMessage("hi", p, null, new Date("2023-03-09T20:58:14.219Z"));

        expect(JSON.stringify(c)).toBe(JSON.stringify({
            "resourceType": "CommunicationRequest",
            "occurrenceDateTime": "2023-03-09T20:58:14.219Z",
            "payload": [{"contentString": "hi"}],
            "recipient": [{"reference": "Patient/patientID"}],
            "status": "active",
            "medium": [{"code": "SMSWRIT", "system": "http://terminology.hl7.org/ValueSet/v3-ParticipationMode"}],
            "category": [{
                "coding": [{
                    "code": "isacc-scheduled-message",
                    "system": "https://isacc.app/CodeSystem/communication-request-type"
                }]
            }]
        }));
    });

    test('Add a new scheduled message (enrollment view)', () => {
        let d = new Date();

        let p = new Patient();
        p.resourceType = "Patient";
        p.id = "patientID";

        let cp = new CarePlan();
        cp.resourceType = 'CarePlan';
        cp.id = "careplanID";

        let c = CommunicationRequest.createNewScheduledMessage("hi", p, cp, d);

        expect(JSON.stringify(c)).toBe(JSON.stringify({
            "resourceType": "CommunicationRequest",
            "occurrenceDateTime": d.toISOString(),
            "payload": [{"contentString": "hi"}],
            "recipient": [{"reference": "Patient/patientID"}],
            "status": "active",
            "medium": [{"code": "SMSWRIT", "system": "http://terminology.hl7.org/ValueSet/v3-ParticipationMode"}],
            "category": [{
                "coding": [{
                    "code": "isacc-scheduled-message",
                    "system": "https://isacc.app/CodeSystem/communication-request-type"
                }]
            }],
            "basedOn": [{"reference": "CarePlan/careplanID"}]
        }));
    });
    test('Create a new outgoing manual message (message view)', () => {

        let p = new Patient();
        p.resourceType = "Patient";
        p.id = "patientID";

        let cp = new CarePlan();
        cp.resourceType = 'CarePlan';
        cp.id = "careplanID";

        let d = new Date();
        let c = CommunicationRequest.createNewManualOutgoingMessage("hi", p, cp);

        expect(JSON.stringify(c)).toBe(JSON.stringify({
            "resourceType": "CommunicationRequest",
            "occurrenceDateTime": d.toISOString(),
            "payload": [{"contentString": "hi"}],
            "recipient": [{"reference": "Patient/patientID"}],
            "status": "active",
            "medium": [{"code": "SMSWRIT", "system": "http://terminology.hl7.org/ValueSet/v3-ParticipationMode"}],
            "category": [{
                "coding": [{
                    "code": "isacc-manually-sent-message",
                    "system": "https://isacc.app/CodeSystem/communication-type"
                }]
            }],
            "basedOn": [{"reference": "CarePlan/careplanID"}]
        }));
    });
});