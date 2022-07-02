import {IResource} from "@ahryman40k/ts-fhir-types/lib/R4";

export interface Resource extends IResource {
  resourceType:string;
}