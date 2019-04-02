import { PubnubKeys } from "./preview-app-constants";

export class PreviewSchemaService implements IPreviewSchemaService {
	private previewSchemas: IDictionary<IPreviewSchemaData> = {
		"nsplay": {
			name: "nsplay",
			scannerAppId: "org.nativescript.play",
			scannerAppStoreId: "1263543946",
			previewAppId: "org.nativescript.preview",
			previewAppStoreId: "1264484702",
			msvKey: "cli",
			publishKey: PubnubKeys.PUBLISH_KEY,
			subscribeKey: PubnubKeys.SUBSCRIBE_KEY,
			default: true
		},
		"ksplay": {
			name: "ksplay",
			scannerAppId: "com.kinvey.scanner",
			scannerAppStoreId: "1263543946",
			previewAppId: "com.kinvey.preview",
			previewAppStoreId: "1264484702",
			msvKey: "kinveyStudio",
			publishKey: PubnubKeys.PUBLISH_KEY,
			subscribeKey: PubnubKeys.SUBSCRIBE_KEY
		}
	};

	constructor(private $errors: IErrors,
		private $projectDataService: IProjectDataService) { }

	public getSchemaData(projectDir: string): IPreviewSchemaData {
		let schemaName = this.getSchemaNameFromProject(projectDir);
		if (!schemaName) {
			schemaName = _.findKey(this.previewSchemas, previewSchema => previewSchema.default);
		}

		const result = this.previewSchemas[schemaName];
		if (!result) {
			this.$errors.failWithoutHelp(`Invalid schema. The valid schemas are ${_.keys(this.previewSchemas)}.`);
		}

		return result;
	}

	private getSchemaNameFromProject(projectDir: string): string {
		try {
			const projectData = this.$projectDataService.getProjectData(projectDir);
			return projectData.previewAppSchema;
		} catch (err) { /* ignore the error */ }

		return null;
	}
}
$injector.register("previewSchemaService", PreviewSchemaService);