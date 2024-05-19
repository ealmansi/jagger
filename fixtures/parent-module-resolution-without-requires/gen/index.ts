import { Component } from "../index.js";
import { Module2 } from "../index.js";
export class ComponentImpl extends Component {
    t2() {
        return this._Module2_p2();
    }
    private _Module2;
    constructor() {
        super();
        this._Module2 = new Module2();
    }
    private _Module2_p2() {
        return this._Module2.p2(this._Module2_synthetic_0());
    }
    private _Module2_synthetic_0() {
        return new Set([this._Module2_p1()]);
    }
    private _Module2_p1() {
        return this._Module2.p1();
    }
}
