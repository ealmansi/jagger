import { Component } from "../index.js";
import { Module1 } from "../index.js";
import { Module2 } from "../index.js";
import { Module3 } from "../index.js";
export class ComponentImpl extends Component {
    t1() {
        return this._Module1_p1();
    }
    t2() {
        return this._Module2_p2();
    }
    t3() {
        return this._Module3_p3();
    }
    private _Module1;
    private _Module2;
    private _Module3;
    constructor() {
        super();
        this._Module1 = new Module1();
        this._Module2 = new Module2();
        this._Module3 = new Module3();
    }
    private _Module1_p1() {
        return this._Module1.p1();
    }
    private _Module2_p2() {
        return this._Module2.p2();
    }
    private _Module3_p3() {
        return this._Module3.p3(this._Module1_p1());
    }
}
