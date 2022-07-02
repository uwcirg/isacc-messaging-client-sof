import config from "./cfg/app_settings.json"

class AppConfig {
    appRootUrl: string;
    careplanTemplateId: string;
    clientId: string;
    clientSecret: string;
    commitSha?: string;
    deploymentType: string;
    fhirBaseUrl: string;
    issuerUrl: string;
    newUserWelcomeMessageTemplateId: string;
    supportedLocales: Array<string>;
    version: string;

    static from(raw: any) : AppConfig {
        if (!raw) return null;
        let c = Object.assign(new AppConfig(), raw);
        c.commitSha = raw.COMMIT_SHA;
        return c;
    }

    get isProd(): boolean {
        return this.deploymentType && this.deploymentType === "prod";
    };

    get versionString() :string {
        let commitSha = this.commitSha;
        if (commitSha != null && commitSha.length > 8) {
            commitSha = commitSha.substring(0, 8);
        }
        let versionString = this.version;
        if (commitSha != null && !this.isProd) versionString += ` / ${commitSha}`;

        return versionString;
    }
}

const a: AppConfig = AppConfig.from(config);
export default a;