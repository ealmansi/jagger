import { Component } from "../SomeComponent.js";
import { Module } from "../SomeComponent.js";
export class ComponentImpl extends Component {
    getApp() {
        return this._Module_provideApp();
    }
    private _Module;
    constructor() {
        super();
        this._Module = new Module();
    }
    private _Module_provideApp() {
        return this._Module.provideApp();
    }
}
