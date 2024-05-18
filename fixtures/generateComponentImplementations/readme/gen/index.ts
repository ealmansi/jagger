import { AppComponent } from "../index.js";
import { AppModule } from "../index.js";
export class AppComponentImpl extends AppComponent {
    provideApp() {
        return this._AppModule_provideApp();
    }
    private _AppModule;
    constructor() {
        super();
        this._AppModule = new AppModule();
    }
    private _AppModule_provideApp() {
        return this._AppModule.provideApp(this._AppModule_provideLogger());
    }
    private _AppModule_provideLogger() {
        return this._AppModule.provideLogger();
    }
}
