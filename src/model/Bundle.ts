import {BundleTypeKind, IBundle, IBundle_Entry, IBundle_Link} from "@ahryman40k/ts-fhir-types/lib/R4";

type Meta = {
    lastUpdated: string;
}
export class Bundle implements IBundle {
    link: IBundle_Link[];
    entry: IBundle_Entry[];
    resourceType: "Bundle";
    meta: Meta;
    type: BundleTypeKind;
    total: number;

}