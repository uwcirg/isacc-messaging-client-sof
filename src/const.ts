import AppConfig from "./AppConfig";

export class QuestionnaireConstants {
    static minF = 90;
    static maxF = 115;
    static minC = 32;
    static maxC = 46;
}

export class WhatInfo {

    static get link(): string {
        return "https://uwcirg.github.io/stayhomelanding/"
    }

    static get changelogLink(): string {
        return "https://uwcirg.github.io/stayhomelanding/?return_uri=" +
            encodeURI(AppConfig.appRootUrl) + "#change-log"
    }

    static get cirgLink(): string {
        return "https://www.cirg.washington.edu/"
    }

    static get resourceLink(): string {
        return "https://uwcirg.github.io/stayhomeresources"
    }

    static get _resourceLinkZipPrefix(): string {
        return "https://uwcirg.github.io/stayhomeresources?zip="
    }

    static get contactLink(): string {
        return "mailto:help@stayhome-app.on.spiceworks.com"
    }

    static get cdcSymptomSelfCheckerLink(): string {
        return "https://uwcirg.github.io/stayhomelanding/gotoCDCbot.html"
    }

    static resourceLinkWithZip(zip: string): string {
        if (this._resourceLinkZipPrefix == null || zip == null) return this.resourceLink;
        return this._resourceLinkZipPrefix + zip;
    }
}