import { InferenceNodeData } from "./InferenceData";
import { OptionNodeData } from "./OptionNodeData";

export enum NodeType {
    Inference,
    Option,
};

export class NodeData {
    readonly id: string;
    readonly type: NodeType;
    readonly InferenceData: InferenceNodeData | undefined = undefined;
    readonly OptionData: OptionNodeData | undefined = undefined;

    constructor(id: string, type: NodeType, InferenceData?: InferenceNodeData, OptionData?: OptionNodeData) {
        this.id = id;
        this.type = type;
        if (type == NodeType.Inference) {
            this.InferenceData = InferenceData;
        } else {
            this.OptionData = OptionData;
        }
    }
}