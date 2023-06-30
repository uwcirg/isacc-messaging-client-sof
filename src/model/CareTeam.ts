import {
  ICareTeam,
  ICareTeam_Participant,
  IReference,
} from "@ahryman40k/ts-fhir-types/lib/R4";

export default class CareTeam implements ICareTeam {
  resourceType: "CareTeam";
  participant: ICareTeam_Participant[];
  subject: IReference;

  static from(raw: any): CareTeam {
    if (!raw) return null;
    return Object.assign(new CareTeam(), raw);
  }

  static toParticipants(
    resourceType: string,
    ids: string[]
  ): ICareTeam_Participant[] {
    if (!ids) return [];
    return ids.map(
      (id) =>
        ({
          member: {
            reference: `${resourceType}/${id}`,
          },
        } as ICareTeam_Participant)
    );
  }

  static create(
    participants: ICareTeam_Participant[],
    patientId: string = null
  ): CareTeam {
    let ct = new CareTeam();
    ct.resourceType = "CareTeam";
    if (patientId) {
      ct.subject = {
        reference: `Patient/${patientId}`,
        type: "Patient"
      };
    }
    ct.participant = participants;
    return ct;
  }
}
