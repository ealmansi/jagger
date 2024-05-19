import { Component } from "../index.js";
import { Module } from "../index.js";
export class ComponentImpl extends Component {
    d5() {
        return this._Module_p5();
    }
    private _Module;
    constructor() {
        super();
        this._Module = new Module();
    }
    private _Module_p5() {
        return this._Module.p5(this._Module_p4());
    }
    private _Module_p4() {
        return this._Module.p4(this._Module__p1(), this._Module__p2(), this._Module__p3());
    }
    private _Module__p1() {
        return this._Module._p1();
    }
    private _Module__p2() {
        return this._Module._p2();
    }
    private _Module__p3() {
        return this._Module._p3();
    }
}
