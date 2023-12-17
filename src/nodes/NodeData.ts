import { INodeData } from "../types/NodeData";

export enum NodeType {
    Before = 1,
    After = 2,
}

class NodeData {
    value: INodeData;
    error: boolean = false;

    constructor(value: INodeData) {
        this.value = value;
    }
}

export default NodeData;
