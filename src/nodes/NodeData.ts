import { AfterBeforeData } from "./AfterBeforeData";

export enum NodeType {
    Before = 1,
    After = 2,
}

class NodeData {
    value: AfterBeforeData;
    error: boolean = false;

    constructor(value: AfterBeforeData) {
        this.value = value;
    }
}

export default NodeData;
