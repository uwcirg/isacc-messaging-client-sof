import {IElement, IExtension} from "@ahryman40k/ts-fhir-types/lib/R4";

export default class FhirTranslations {
  static languageCode: string;

  static extractTranslation(baseString: string, extension: IElement) {
    if (FhirTranslations.languageCode == null || FhirTranslations.languageCode.length === 0) {
      throw new Error("FhirTranslations error: Language code has not been set.");
    }
    let translationExt: IExtension = extension?.extension?.find(
        (translationExt: IExtension) =>
            translationExt.url === "http://hl7.org/fhir/StructureDefinition/translation" &&
            (translationExt.extension?.find((langExtension: IExtension) =>
                langExtension.url === "lang" && langExtension.valueCode === FhirTranslations.languageCode) ??
                false));

    let contentExt: IExtension = translationExt?.extension
        ?.find((e: IExtension) => e.url === "content");

    if (!contentExt) return baseString;
    return contentExt.valueString;
  }
  static extractTranslation2(baseString: string, extension: IElement) {
    if (FhirTranslations.languageCode == null || FhirTranslations.languageCode.length === 0) {
      throw new Error("FhirTranslations error: Language code has not been set.");
    }
    let translationExt: IExtension = extension?.extension?.find(
        (translationExt: IExtension) =>
            translationExt.url === "http://hl7.org/fhir/StructureDefinition/translation" &&
            (translationExt.extension?.find((langExtension: IExtension) =>
                langExtension.url === "lang" && langExtension.valueCode === FhirTranslations.languageCode) ??
                false));

    let contentExt: IExtension = translationExt?.extension
        ?.find((e: IExtension) => e.url === "content");

    if (!contentExt) return baseString;
    return contentExt.valueString;
  }
}